'use client';

import React, { createContext, useContext, useEffect, useReducer, useState, useRef } from 'react';
import { GameState, Player, Role } from '@/types/game';
import { generateRoomSlug, generateAvatar } from '@/lib/utils';
import { getRandomWordPair } from '@/lib/words';
import Peer, { DataConnection } from 'peerjs';

// --- Actions ---
type Action =
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'CREATE_ROOM'; payload: { hostName: string; slug?: string } }
  | { type: 'JOIN_ROOM'; payload: { slug: string; playerName: string } }
  | { type: 'TOGGLE_READY'; payload: { playerId: string } }
  | { type: 'START_GAME' }
  | { type: 'REVEAL_CONFIRM'; payload: { playerId: string } }
  | { type: 'FINISH_SPEAKING'; payload: { playerId: string } }
  | { type: 'VOTE'; payload: { voterId: string; targetId: string } }
  | { type: 'START_TIE_VOTE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }; 

// --- Initial State ---
const initialState: GameState = {
  roomId: '',
  roomSlug: '',
  players: [],
  phase: 'LOBBY',
  currentWordPair: null,
  settings: { impostorCount: 1, difficulty: 'moyen' },
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
  votes: {},
  tieBreakerIds: null,
  impostorFound: null,
};

// --- Context ---
interface GameContextType {
  state: GameState;
  playerId: string;
  isHost: boolean;
  createRoom: (name: string, slug?: string) => Promise<boolean>;
  joinRoom: (slug: string, name: string) => void;
  toggleReady: () => void;
  startGame: () => void;
  confirmWordSeen: () => void;
  finishSpeaking: () => void;
  vote: (targetId: string) => void;
  startTieVote: () => void;
  nextRound: () => void;
  resetGame: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const GameContext = createContext<GameContextType | null>(null);

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SYNC_STATE':
      return action.payload;

    case 'CREATE_ROOM':
      const newSlug = action.payload.slug || generateRoomSlug();
      return {
        ...initialState,
        roomId: crypto.randomUUID(),
        roomSlug: newSlug,
        players: [{
          id: crypto.randomUUID(),
          name: action.payload.hostName,
          avatar: generateAvatar(),
          role: null,
          word: null,
          isHost: true,
          isReady: false,
          isAlive: true,
          hasSeenWord: false,
          hasFinishedSpeaking: false,
          votedForId: null,
        }],
      };

    case 'JOIN_ROOM':
      if (state.players.some(p => p.name === action.payload.playerName)) return state;
      
      const isLateJoiner = state.phase !== 'LOBBY';
      
      return {
        ...state,
        players: [
          ...state.players,
          {
            id: crypto.randomUUID(),
            name: action.payload.playerName,
            avatar: generateAvatar(),
            role: null,
            word: null,
            isHost: false,
            isReady: false,
            isAlive: !isLateJoiner,
            hasSeenWord: isLateJoiner,
            hasFinishedSpeaking: isLateJoiner,
            votedForId: null,
          }
        ]
      };

    case 'TOGGLE_READY':
      return {
        ...state,
        players: state.players.map(p => 
          p.id === action.payload.playerId ? { ...p, isReady: !p.isReady } : p
        )
      };

    case 'START_GAME': {
      const pair = getRandomWordPair();
      const playerCount = state.players.length;
      const impostorCount = playerCount >= 8 ? 2 : 1;
      
      const shuffledIndices = [...Array(playerCount).keys()].sort(() => Math.random() - 0.5);
      const impostorIndices = shuffledIndices.slice(0, impostorCount);

      const newPlayers = state.players.map((p, idx) => {
        const isImpostor = impostorIndices.includes(idx);
        return {
          ...p,
          role: (isImpostor ? 'IMPOSTER' : 'CIVIL') as Role,
          word: isImpostor ? pair.imposter : pair.civil,
          hasSeenWord: false,
          hasFinishedSpeaking: false,
          isAlive: true,
          votedForId: null,
        };
      });

      return {
        ...state,
        phase: 'REVEAL_WORD',
        currentWordPair: pair,
        players: newPlayers,
        votes: {},
        tieBreakerIds: null,
        impostorFound: null,
      };
    }

    case 'REVEAL_CONFIRM':
      const playersAfterReveal = state.players.map(p => 
        p.id === action.payload.playerId ? { ...p, hasSeenWord: true } : p
      );
      const allSeen = playersAfterReveal.filter(p => p.isAlive).every(p => p.hasSeenWord);
      return {
        ...state,
        players: playersAfterReveal,
        phase: allSeen ? 'DISCUSSION' : 'REVEAL_WORD',
      };

    case 'FINISH_SPEAKING':
      const playersAfterSpeak = state.players.map(p => 
        p.id === action.payload.playerId ? { ...p, hasFinishedSpeaking: true } : p
      );
      const alivePlayers = playersAfterSpeak.filter(p => p.isAlive);
      const allFinished = alivePlayers.every(p => p.hasFinishedSpeaking);
      // If we are in Argument phase, we don't auto-transition usually, but let's keep it simple.
      // If all speakers (tied players?) are done. 
      // Actually, standard game: "Finished Speaking" is for MAIN discussion.
      // For Tie-Breaker Argument, maybe just use Timer/Host button?
      // Let's rely on Host action 'START_TIE_VOTE'.
      
      return {
        ...state,
        players: playersAfterSpeak,
        phase: (state.phase === 'TIE_BREAKER_ARGUMENT') 
             ? 'TIE_BREAKER_ARGUMENT' // Stay until host clicks
             : (allFinished ? 'VOTE_IN_PROGRESS' : (state.phase === 'DISCUSSION' ? 'VOTE_WAITING' : state.phase)),
      };
      
    case 'START_TIE_VOTE':
        return {
            ...state,
            phase: 'TIE_BREAKER_VOTE',
            votes: {}, // Clear previous votes
            players: state.players.map(p => ({
                ...p,
                votedForId: null // Reset votes
            }))
        };

    case 'VOTE': {
       const newVotes = { ...state.votes, [action.payload.voterId]: action.payload.targetId };
       const playersVoted = state.players.map(p => 
         p.id === action.payload.voterId ? { ...p, votedForId: action.payload.targetId } : p
       );
       
       // Who can vote?
       // Tie Breaker Vote: Only players NOT in the tie? Or everyone?
       // Usually EVERYONE votes to break the tie.
       // The prompt says "on fait directe un deuxième vote, avec que les joueurs ciblés par l'égalité".
       // Interpretation A: Only tied players ARE CANDIDATES. Everyone votes.
       // Interpretation B: Only tied players VOTE. (Unlikely).
       // I will assume A: Candidates are restricted to tied players. Voters are everyone alive.
       
       const alivePlayersList = playersVoted.filter(p => p.isAlive);
       const allVoted = alivePlayersList.every(p => p.votedForId !== null);
       
       let nextState = {
         ...state,
         votes: newVotes,
         players: playersVoted,
       };

       if (allVoted) {
         // Calculate Results
         const voteCounts: Record<string, number> = {};
         Object.values(newVotes).forEach(target => {
           voteCounts[target] = (voteCounts[target] || 0) + 1;
         });
         
         let maxVotes = 0;
         let tiedCandidates: string[] = [];
         
         for (const [pid, count] of Object.entries(voteCounts)) {
           if (count > maxVotes) {
             maxVotes = count;
             tiedCandidates = [pid];
           } else if (count === maxVotes) {
             tiedCandidates.push(pid);
           }
         }
         
         // Logic for Tie Handling
         if (tiedCandidates.length > 1) {
             // TIE DETECTED
             if (state.phase === 'TIE_BREAKER_VOTE') {
                 // Double Tie -> No one dies -> Next Round (Revealed Result = Tie)
                 nextState.phase = 'REVEAL_RESULT';
                 nextState.impostorFound = null; // Continue game
                 // TieBreakerIds remains set so we can show them? Or clear?
                 // Let's keep them to show "Tie between X and Y".
             } else {
                 // First Tie -> Argument Phase
                 nextState.phase = 'TIE_BREAKER_ARGUMENT';
                 nextState.tieBreakerIds = tiedCandidates;
                 nextState.votes = {}; // Clear for UI clarity
                 // Reset speaking ?
                 nextState.players = nextState.players.map(p => ({
                     ...p,
                     hasFinishedSpeaking: false,
                     votedForId: null
                 }));
             }
         } else {
             // NO TIE -> Elimination
             const eliminatedId = tiedCandidates[0];
             nextState.phase = 'REVEAL_RESULT';
             
             nextState.players = nextState.players.map(p => 
                 p.id === eliminatedId ? { ...p, isAlive: false } : p
             );

             const impostor = nextState.players.find(p => p.role === 'IMPOSTER');
             const eliminatedIsImpostor = impostor && eliminatedId === impostor.id;
             
             if (eliminatedIsImpostor) {
                 nextState.impostorFound = true; 
             } else {
                 const remainingAlive = nextState.players.filter(p => p.isAlive).length;
                 if (remainingAlive <= 2) {
                     nextState.impostorFound = false;
                 } else {
                     nextState.impostorFound = null;
                 }
             }
         }
       }
       
       return nextState;
    }

    case 'NEXT_ROUND':
        return {
            ...state,
            phase: 'DISCUSSION',
            votes: {},
            tieBreakerIds: null,
            players: state.players.map(p => ({
                ...p,
                hasFinishedSpeaking: false,
                votedForId: null
            }))
        };

    case 'RESET_GAME':
      return {
        ...state,
        phase: 'LOBBY',
        currentWordPair: null,
        votes: {},
        impostorFound: null,
        tieBreakerIds: null,
        players: state.players.map(p => ({
          ...p,
          role: null,
          word: null,
          hasSeenWord: false,
          hasFinishedSpeaking: false,
          isReady: false,
          isAlive: true,
          votedForId: null,
        })),
      };

    default:
      return state;
  }
}

const PEER_PREFIX = 'undercover-pro-v1-';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [playerId, setPlayerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const hostConnectionRef = useRef<DataConnection | null>(null);

  // --- Host Logic: Broadcast State ---
  useEffect(() => {
    const me = state.players.find(p => p.id === playerId);
    if (me?.isHost && connectionsRef.current.length > 0) {
      connectionsRef.current.forEach(conn => {
        if (conn.open) {
          conn.send({ type: 'SYNC_STATE', payload: state });
        }
      });
    }
  }, [state, playerId]);

  // --- Actions ---
  
  const createRoom = async (name: string, slug?: string): Promise<boolean> => {
    setConnectionStatus('connecting');
    const newSlug = slug || generateRoomSlug();
    const peerId = `${PEER_PREFIX}${newSlug}`;

    return new Promise((resolve) => {
        const peer = new Peer(peerId, { debug: 1 });
        
        peer.on('open', (id) => {
            peerRef.current = peer;
            setConnectionStatus('connected');
            
            const hostId = crypto.randomUUID();
            const hostPlayer: Player = {
              id: hostId,
              name,
              avatar: generateAvatar(),
              role: null,
              word: null,
              isHost: true,
              isReady: false,
              isAlive: true,
              hasSeenWord: false,
              hasFinishedSpeaking: false,
              votedForId: null,
            };
            
            const newState: GameState = {
              ...initialState,
              roomId: crypto.randomUUID(),
              roomSlug: newSlug,
              players: [hostPlayer],
            };
            
            dispatch({ type: 'SYNC_STATE', payload: newState });
            setPlayerId(hostId);

            peer.on('connection', (conn) => {
                connectionsRef.current.push(conn);
                conn.on('data', (data: any) => {
                    if (data.type === 'CLIENT_ACTION') {
                        if (data.action.type === 'JOIN_ROOM') {
                             if (newState.players.some(p => p.name === data.action.payload.playerName)) return;
                             dispatch(data.action);
                        } else {
                            dispatch(data.action);
                        }
                    }
                });
            });

            resolve(true);
        });

        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                resolve(false);
            } else {
                setConnectionStatus('error');
                resolve(false);
            }
        });
    });
  };

  const joinRoom = (slug: string, name: string) => {
    setConnectionStatus('connecting');
    const targetPeerId = `${PEER_PREFIX}${slug}`;
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
        const conn = peer.connect(targetPeerId);
        hostConnectionRef.current = conn;

        conn.on('open', () => {
            setConnectionStatus('connected');
            conn.send({ 
                type: 'CLIENT_ACTION', 
                action: { type: 'JOIN_ROOM', payload: { slug, playerName: name } } 
            });
        });

        conn.on('data', (data: any) => {
            if (data.type === 'SYNC_STATE') {
                dispatch({ type: 'SYNC_STATE', payload: data.payload });
                if (!playerId) {
                    const me = data.payload.players.find((p: Player) => p.name === name);
                    if (me) setPlayerId(me.id);
                }
            }
        });

        conn.on('close', () => {
            setConnectionStatus('disconnected');
            alert("L'hôte s'est déconnecté.");
        });
        
        peer.on('error', (err) => {
             setConnectionStatus('error');
        });
    });
  };

  const sendAction = (action: Action) => {
      const me = state.players.find(p => p.id === playerId);
      if (me?.isHost) {
          dispatch(action);
      } else {
          hostConnectionRef.current?.send({ type: 'CLIENT_ACTION', action });
      }
  };

  const toggleReady = () => sendAction({ type: 'TOGGLE_READY', payload: { playerId } });
  const startGame = () => sendAction({ type: 'START_GAME' });
  const confirmWordSeen = () => sendAction({ type: 'REVEAL_CONFIRM', payload: { playerId } });
  const finishSpeaking = () => sendAction({ type: 'FINISH_SPEAKING', payload: { playerId } });
  const vote = (targetId: string) => sendAction({ type: 'VOTE', payload: { voterId: playerId, targetId } });
  const startTieVote = () => sendAction({ type: 'START_TIE_VOTE' });
  const nextRound = () => sendAction({ type: 'NEXT_ROUND' });
  const resetGame = () => sendAction({ type: 'RESET_GAME' });

  return (
    <GameContext.Provider value={{
      state,
      playerId,
      isHost: state.players.find(p => p.id === playerId)?.isHost || false,
      createRoom,
      joinRoom,
      toggleReady,
      startGame,
      confirmWordSeen,
      finishSpeaking,
      vote,
      startTieVote,
      nextRound,
      resetGame,
      connectionStatus
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
