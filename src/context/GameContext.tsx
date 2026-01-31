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
  impostorFound: null,
};

// --- Context ---
interface GameContextType {
  state: GameState;
  playerId: string;
  isHost: boolean;
  createRoom: (name: string, slug?: string) => Promise<boolean>; // Return success/fail for host claim
  joinRoom: (slug: string, name: string) => void;
  toggleReady: () => void;
  startGame: () => void;
  confirmWordSeen: () => void;
  finishSpeaking: () => void;
  vote: (targetId: string) => void;
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
      // We don't add player here for Client, we wait for Host to Sync back
      // But for Host, we might process it if we dispatched it locally?
      // Actually, Host receives "CLIENT_ACTION" -> "JOIN_ROOM"
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
            role: null, // Spectators have no role or word
            word: null,
            isHost: false,
            isReady: false,
            isAlive: !isLateJoiner, // Late joiners are dead/spectators
            hasSeenWord: isLateJoiner, // Don't block reveal
            hasFinishedSpeaking: isLateJoiner, // Don't block discussion
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
        impostorFound: null,
      };
    }

    case 'REVEAL_CONFIRM':
      const playersAfterReveal = state.players.map(p => 
        p.id === action.payload.playerId ? { ...p, hasSeenWord: true } : p
      );
      // Check if all ALIVE players have seen
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
      return {
        ...state,
        players: playersAfterSpeak,
        phase: allFinished ? 'VOTE_IN_PROGRESS' : (state.phase === 'DISCUSSION' ? 'VOTE_WAITING' : state.phase),
      };

    case 'VOTE': {
       const newVotes = { ...state.votes, [action.payload.voterId]: action.payload.targetId };
       const playersVoted = state.players.map(p => 
         p.id === action.payload.voterId ? { ...p, votedForId: action.payload.targetId } : p
       );
       
       const alivePlayersList = playersVoted.filter(p => p.isAlive);
       const allVoted = alivePlayersList.every(p => p.votedForId !== null);
       
       let nextState = {
         ...state,
         votes: newVotes,
         players: playersVoted,
       };

       if (allVoted) {
         nextState.phase = 'REVEAL_RESULT';
         
         const voteCounts: Record<string, number> = {};
         Object.values(newVotes).forEach(target => {
           voteCounts[target] = (voteCounts[target] || 0) + 1;
         });
         
         let maxVotes = 0;
         let eliminatedId: string | null = null;
         for (const [pid, count] of Object.entries(voteCounts)) {
           if (count > maxVotes) {
             maxVotes = count;
             eliminatedId = pid;
           } else if (count === maxVotes) {
             eliminatedId = null; 
           }
         }
         
         if (eliminatedId) {
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
         } else {
             nextState.impostorFound = null;
         }
       }
       
       return nextState;
    }

    case 'NEXT_ROUND':
        return {
            ...state,
            phase: 'DISCUSSION',
            votes: {},
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
        // Attempt to create Peer with specific ID (Host)
        const peer = new Peer(peerId, { debug: 1 });
        
        peer.on('open', (id) => {
            console.log('Host created room:', id);
            peerRef.current = peer;
            setConnectionStatus('connected');
            
            // Initialize Game State
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

            // Listen for connections
            peer.on('connection', (conn) => {
                connectionsRef.current.push(conn);
                conn.on('data', (data: any) => {
                    // Host receives Actions from Clients
                    if (data.type === 'CLIENT_ACTION') {
                        // Special Case: JOIN_ROOM needs to be handled carefully to assign ID
                        if (data.action.type === 'JOIN_ROOM') {
                             // Check if already in
                             if (newState.players.some(p => p.name === data.action.payload.playerName)) return;
                             
                             // Dispatch Join locally
                             dispatch(data.action);
                        } else {
                            // Regular action
                            dispatch(data.action);
                        }
                    }
                });
                
                conn.on('open', () => {
                    // Send current state immediately
                    // We need the *latest* state. 
                    // Since state in closure might be stale, we use the reducer dispatch?
                    // Actually we rely on the useEffect hook to sync when state updates.
                    // But for initial connect, we might want to force sync?
                    // The useEffect [state] will trigger if we change something.
                    // If not, we might need a ref for current state?
                    // For MVP, usually the join triggers a state change (add player), so sync happens.
                });
            });

            resolve(true);
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            // If ID is taken, it means room exists
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
    
    // Client has random ID
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
        const conn = peer.connect(targetPeerId);
        hostConnectionRef.current = conn;

        conn.on('open', () => {
            setConnectionStatus('connected');
            // Send Join Request
            conn.send({ 
                type: 'CLIENT_ACTION', 
                action: { type: 'JOIN_ROOM', payload: { slug, playerName: name } } 
            });
        });

        conn.on('data', (data: any) => {
            if (data.type === 'SYNC_STATE') {
                dispatch({ type: 'SYNC_STATE', payload: data.payload });
                // Find my ID if not set
                if (!playerId) { // This closure might capture stale playerId, check in render?
                    // We can't easily check state here.
                    // But we can check the payload.
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
             console.error('Client peer error', err);
             setConnectionStatus('error');
        });
    });
  };

  // Helper to send action to Host (or dispatch if I am Host)
  const sendAction = (action: Action) => {
      const me = state.players.find(p => p.id === playerId);
      if (me?.isHost) {
          dispatch(action);
      } else {
          hostConnectionRef.current?.send({ type: 'CLIENT_ACTION', action });
      }
  };

  // --- Exposed Methods ---
  
  const toggleReady = () => sendAction({ type: 'TOGGLE_READY', payload: { playerId } });
  
  const startGame = () => sendAction({ type: 'START_GAME' });
  
  const confirmWordSeen = () => sendAction({ type: 'REVEAL_CONFIRM', payload: { playerId } });
  
  const finishSpeaking = () => sendAction({ type: 'FINISH_SPEAKING', payload: { playerId } });
  
  const vote = (targetId: string) => sendAction({ type: 'VOTE', payload: { voterId: playerId, targetId } });
  
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