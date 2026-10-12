import type { GameState, Player } from '../types/game.ts';
import { getRandomWordPair } from './words.ts';

export type GameAction =
  | { type: 'JOIN_ROOM'; player: Player }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'TOGGLE_READY' | 'REVEAL_CONFIRM' | 'FINISH_SPEAKING'; playerId: string }
  | { type: 'VOTE'; playerId: string; targetId: string }
  | { type: 'START_GAME' | 'START_TIE_VOTE' | 'NEXT_ROUND' | 'RESET_GAME'; playerId: string };

export const initialState: GameState = {
  roomId: '', roomSlug: '', players: [], phase: 'LOBBY', currentWordPair: null,
  settings: { impostorCount: 1, difficulty: 'moyen' }, createdAt: 0, lastActiveAt: 0,
  votes: {}, tieBreakerIds: null, impostorFound: null,
};

export function makePlayer(id: string, name: string, avatar: string, isHost = false): Player {
  return { id, name, avatar, isHost, role: null, word: null, isReady: false,
    isAlive: true, hasSeenWord: false, hasFinishedSpeaking: false, votedForId: null };
}

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function validSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,63}$/.test(value);
}

function winner(players: Player[]): boolean | null {
  const alive = players.filter(p => p.isAlive);
  const impostors = alive.filter(p => p.role === 'IMPOSTER').length;
  if (impostors === 0) return true;
  if (impostors >= alive.length - impostors) return false;
  return null;
}

function resolveVotes(state: GameState): GameState {
  const alive = state.players.filter(p => p.isAlive);
  if (!alive.length || !alive.every(p => p.votedForId !== null)) return state;
  const counts = new Map<string, number>();
  Object.values(state.votes).forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1));
  const max = Math.max(...counts.values());
  const tied = [...counts.keys()].filter(id => counts.get(id) === max);
  if (tied.length > 1 && state.phase !== 'TIE_BREAKER_VOTE') {
    return { ...state, phase: 'TIE_BREAKER_ARGUMENT', tieBreakerIds: tied, votes: {},
      players: state.players.map(p => ({ ...p, votedForId: null, hasFinishedSpeaking: false })) };
  }
  const players = state.players.map(p => tied.length === 1 && p.id === tied[0] ? { ...p, isAlive: false } : p);
  return { ...state, players, phase: 'REVEAL_RESULT', impostorFound: winner(players) };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'JOIN_ROOM') {
    if (state.players.some(p => p.id === action.player.id || p.name.toLocaleLowerCase() === action.player.name.toLocaleLowerCase())) return state;
    const late = state.phase !== 'LOBBY';
    return { ...state, players: [...state.players, { ...action.player, isAlive: !late, hasSeenWord: late, hasFinishedSpeaking: late }] };
  }
  const actor = state.players.find(p => p.id === action.playerId);
  if (!actor) return state;
  switch (action.type) {
    case 'REMOVE_PLAYER': {
      if (actor.isHost) return state;
      if (state.phase === 'LOBBY') return { ...state, players: state.players.filter(p => p.id !== actor.id) };
      // Keep departed players for results; they never block the surviving players.
      let next = { ...state, players: state.players.map(p => p.id === actor.id ? { ...p, isAlive: false, isConnected: false } : p) };
      if (!actor.isAlive) return next;
      if (state.impostorFound !== null) return next;
      const result = winner(next.players);
      if (result !== null) return { ...next, phase: 'REVEAL_RESULT', impostorFound: result, votes: {} };
      const alive = next.players.filter(p => p.isAlive);
      if (state.phase === 'REVEAL_WORD' && alive.every(p => p.hasSeenWord)) next = { ...next, phase: 'DISCUSSION' };
      if (['DISCUSSION', 'VOTE_WAITING'].includes(state.phase) && alive.every(p => p.hasFinishedSpeaking)) next = { ...next, phase: 'VOTE_IN_PROGRESS' };
      if (['VOTE_IN_PROGRESS', 'TIE_BREAKER_VOTE', 'TIE_BREAKER_ARGUMENT'].includes(state.phase)) {
        // A departed candidate invalidates votes for that candidate, so restart the vote.
        const candidates = next.tieBreakerIds?.filter(id => next.players.some(p => p.id === id && p.isAlive)) ?? null;
        next = { ...next, phase: 'VOTE_IN_PROGRESS', tieBreakerIds: null, votes: {},
          players: next.players.map(p => ({ ...p, votedForId: null })) };
        if (state.phase !== 'VOTE_IN_PROGRESS' && candidates && candidates.length > 1) next = { ...next, phase: 'TIE_BREAKER_VOTE', tieBreakerIds: candidates };
      }
      return next;
    }
    case 'TOGGLE_READY':
      if (state.phase !== 'LOBBY') return state;
      return { ...state, players: state.players.map(p => p.id === actor.id ? { ...p, isReady: !p.isReady } : p) };
    case 'START_GAME': {
      const connected = state.players.filter(p => p.isConnected !== false);
      if (!actor.isHost || state.phase !== 'LOBBY' || connected.length < 3 || !connected.every(p => p.isReady)) return state;
      const pair = getRandomWordPair();
      const ids = connected.map(p => p.id);
      // Fisher–Yates avoids the biased random-sort comparator.
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const impostorIds = new Set(ids.slice(0, connected.length >= 8 ? 2 : 1));
      return { ...state, phase: 'REVEAL_WORD', currentWordPair: pair, votes: {}, tieBreakerIds: null, impostorFound: null,
        settings: { ...state.settings, impostorCount: impostorIds.size },
        players: connected.map(p => ({ ...p, role: impostorIds.has(p.id) ? 'IMPOSTER' : 'CIVIL',
          word: impostorIds.has(p.id) ? pair.imposter : pair.civil, isAlive: true,
          hasSeenWord: false, hasFinishedSpeaking: false, votedForId: null })) };
    }
    case 'REVEAL_CONFIRM': {
      if (state.phase !== 'REVEAL_WORD' || !actor.isAlive || actor.hasSeenWord) return state;
      const players = state.players.map(p => p.id === actor.id ? { ...p, hasSeenWord: true } : p);
      return { ...state, players, phase: players.filter(p => p.isAlive).every(p => p.hasSeenWord) ? 'DISCUSSION' : state.phase };
    }
    case 'FINISH_SPEAKING': {
      if (!['DISCUSSION', 'VOTE_WAITING'].includes(state.phase) || !actor.isAlive || actor.hasFinishedSpeaking) return state;
      const players = state.players.map(p => p.id === actor.id ? { ...p, hasFinishedSpeaking: true } : p);
      return { ...state, players, phase: players.filter(p => p.isAlive).every(p => p.hasFinishedSpeaking) ? 'VOTE_IN_PROGRESS' : 'VOTE_WAITING' };
    }
    case 'START_TIE_VOTE':
      if (!actor.isHost || state.phase !== 'TIE_BREAKER_ARGUMENT') return state;
      return { ...state, phase: 'TIE_BREAKER_VOTE', votes: {}, players: state.players.map(p => ({ ...p, votedForId: null })) };
    case 'VOTE': {
      if (!['VOTE_IN_PROGRESS', 'TIE_BREAKER_VOTE'].includes(state.phase) || !actor.isAlive || actor.votedForId !== null) return state;
      const target = state.players.find(p => p.id === action.targetId && p.isAlive);
      if (!target || target.id === actor.id) return state;
      if (state.phase === 'TIE_BREAKER_VOTE' && !state.tieBreakerIds?.includes(target.id)) return state;
      return resolveVotes({ ...state, votes: { ...state.votes, [actor.id]: target.id },
        players: state.players.map(p => p.id === actor.id ? { ...p, votedForId: target.id } : p) });
    }
    case 'NEXT_ROUND':
      if (!actor.isHost || state.phase !== 'REVEAL_RESULT' || state.impostorFound !== null) return state;
      return { ...state, phase: 'DISCUSSION', votes: {}, tieBreakerIds: null,
        players: state.players.map(p => ({ ...p, hasFinishedSpeaking: false, votedForId: null })) };
    case 'RESET_GAME':
      if (!actor.isHost || state.phase !== 'REVEAL_RESULT') return state;
      return { ...state, phase: 'LOBBY', currentWordPair: null, votes: {}, tieBreakerIds: null, impostorFound: null,
        players: state.players.filter(p => p.isConnected !== false).map(p => ({ ...p, role: null, word: null,
          isAlive: true, isReady: false, hasSeenWord: false, hasFinishedSpeaking: false, votedForId: null })) };
  }
}

// The host holds the full state. Guests receive only their own secret until game over.
export function playerView(state: GameState, playerId: string): GameState {
  const over = state.impostorFound !== null;
  const results = state.phase === 'REVEAL_RESULT';
  return { ...state, currentWordPair: over ? state.currentWordPair : null,
    votes: results ? state.votes : {},
    players: state.players.map(p => ({ ...p,
      role: over || p.id === playerId || (!p.isAlive && p.role !== null) ? p.role : null,
      word: over || p.id === playerId ? p.word : null,
      votedForId: results || p.id === playerId ? p.votedForId : null })) };
}

// Bind actions to the connection identity, never to a client-supplied player ID.
export function clientAction(data: unknown, playerId: string): GameAction | null {
  if (!data || typeof data !== 'object' || !('type' in data)) return null;
  switch (data.type) {
    case 'TOGGLE_READY': case 'REVEAL_CONFIRM': case 'FINISH_SPEAKING':
      return { type: data.type, playerId };
    case 'VOTE':
      return 'targetId' in data && typeof data.targetId === 'string' ? { type: 'VOTE', playerId, targetId: data.targetId } : null;
    default: return null;
  }
}
