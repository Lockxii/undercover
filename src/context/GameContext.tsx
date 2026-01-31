'use client';

import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { GameState, Player, Role } from '@/types/game';
import { generateRoomSlug, generateAvatar } from '@/lib/utils';
import { getRandomWordPair } from '@/lib/words';

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
  createRoom: (name: string, slug?: string) => void;
  joinRoom: (slug: string, name: string) => void;
  toggleReady: () => void;
  startGame: () => void;
  confirmWordSeen: () => void;
  finishSpeaking: () => void;
  vote: (targetId: string) => void;
  nextRound: () => void;
  resetGame: () => void;
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
            isAlive: true,
            hasSeenWord: false,
            hasFinishedSpeaking: false,
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
      const allSeen = playersAfterReveal.every(p => p.hasSeenWord);
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
       
       const alivePlayers = playersVoted.filter(p => p.isAlive);
       const allVoted = alivePlayers.every(p => p.votedForId !== null);
       
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
             eliminatedId = null; // Tie
           }
         }
         
         if (eliminatedId) {
             // Eliminate player
             nextState.players = nextState.players.map(p => 
                 p.id === eliminatedId ? { ...p, isAlive: false } : p
             );

             const impostor = nextState.players.find(p => p.role === 'IMPOSTER');
             const eliminatedIsImpostor = impostor && eliminatedId === impostor.id;
             
             // Check Win Conditions
             if (eliminatedIsImpostor) {
                 nextState.impostorFound = true; // Civilians Win
             } else {
                 // Check if Impostor Parity (1 Impostor, 1 Civil left)
                 const remainingAlive = nextState.players.filter(p => p.isAlive).length;
                 // Assuming 1 impostor for now
                 if (remainingAlive <= 2) {
                     nextState.impostorFound = false; // Impostor Wins
                 } else {
                     nextState.impostorFound = null; // Game continues
                 }
             }
         } else {
             // TIE - No one eliminated usually, or random? 
             // For MVP, if tie, no one dies, next round? Or re-vote?
             // Prompt says "on fait mourrir le joueur", implying definitive vote.
             // Let's assume tie = no death = next round or re-vote.
             // Let's implement: Tie -> No elimination -> Next Round.
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

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [playerId, setPlayerId] = useState<string>('');
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    if (state.roomSlug) {
      const bc = new BroadcastChannel(`undercover-game-${state.roomSlug}`);
      bc.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'SYNC_STATE') {
           dispatch({ type: 'SYNC_STATE', payload: msg.payload });
        } else if (msg.type === 'CLIENT_ACTION') {
          if (state.players.find(p => p.id === playerId)?.isHost) {
            dispatch(msg.action);
          }
        } else if (msg.type === 'PING') {
           const me = state.players.find(p => p.id === playerId);
           if (me?.isHost) {
             bc.postMessage({ type: 'SYNC_STATE', payload: state });
           }
        }
      };
      setChannel(bc);
      return () => bc.close();
    }
  }, [state.roomSlug, playerId]);

  useEffect(() => {
    const me = state.players.find(p => p.id === playerId);
    if (me?.isHost && channel) {
      channel.postMessage({ type: 'SYNC_STATE', payload: state });
    }
  }, [state, playerId, channel]);

  const createRoomWithSlug = (name: string, slug?: string) => {
    const newSlug = slug || generateRoomSlug();
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
  };

  const joinRoom = (slug: string, name: string) => {
    const bc = new BroadcastChannel(`undercover-game-${slug}`);
    setChannel(bc);
    bc.postMessage({ 
       type: 'CLIENT_ACTION', 
       action: { type: 'JOIN_ROOM', payload: { slug, playerName: name } } 
    });
    bc.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'SYNC_STATE') {
         dispatch({ type: 'SYNC_STATE', payload: msg.payload });
         const myPlayer = msg.payload.players.find((p: Player) => p.name === name);
         if (myPlayer) setPlayerId(myPlayer.id);
      }
    };
  };

  const toggleReady = () => {
    if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'TOGGLE_READY', payload: { playerId } } });
    const me = state.players.find(p => p.id === playerId);
    if (me?.isHost) dispatch({ type: 'TOGGLE_READY', payload: { playerId } });
  };

  const startGame = () => {
     if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'START_GAME' } });
     const me = state.players.find(p => p.id === playerId);
     if (me?.isHost) dispatch({ type: 'START_GAME' });
  };

  const confirmWordSeen = () => {
    if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'REVEAL_CONFIRM', payload: { playerId } } });
    const me = state.players.find(p => p.id === playerId);
    if (me?.isHost) dispatch({ type: 'REVEAL_CONFIRM', payload: { playerId } });
  };

  const finishSpeaking = () => {
    if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'FINISH_SPEAKING', payload: { playerId } } });
    const me = state.players.find(p => p.id === playerId);
    if (me?.isHost) dispatch({ type: 'FINISH_SPEAKING', payload: { playerId } });
  };

  const vote = (targetId: string) => {
    if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'VOTE', payload: { voterId: playerId, targetId } } });
    const me = state.players.find(p => p.id === playerId);
    if (me?.isHost) dispatch({ type: 'VOTE', payload: { voterId: playerId, targetId } });
  };

  const nextRound = () => {
     if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'NEXT_ROUND' } });
     const me = state.players.find(p => p.id === playerId);
     if (me?.isHost) dispatch({ type: 'NEXT_ROUND' });
  };

  const resetGame = () => {
     if (channel) channel.postMessage({ type: 'CLIENT_ACTION', action: { type: 'RESET_GAME' } });
     const me = state.players.find(p => p.id === playerId);
     if (me?.isHost) dispatch({ type: 'RESET_GAME' });
  };

  return (
    <GameContext.Provider value={{
      state,
      playerId,
      isHost: state.players.find(p => p.id === playerId)?.isHost || false,
      createRoom: createRoomWithSlug,
      joinRoom,
      toggleReady,
      startGame,
      confirmWordSeen,
      finishSpeaking,
      vote,
      nextRound,
      resetGame
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
