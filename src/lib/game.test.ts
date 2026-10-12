import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientAction, gameReducer, initialState, makePlayer, normalizeSlug, playerView, validSlug } from './game.ts';
import type { GameState, Role } from '../types/game.ts';

function room(count = 3): GameState {
  return { ...initialState, roomSlug: 'test-room', roomId: 'room', players: Array.from({ length: count }, (_, i) =>
    ({ ...makePlayer(String(i), `Joueur${i}`, '🐱|bg-blue-200', i === 0), isReady: true })) };
}

function voting(roles: readonly Role[] = ['CIVIL', 'CIVIL', 'IMPOSTER']): GameState {
  return { ...room(roles.length), phase: 'VOTE_IN_PROGRESS', players: room(roles.length).players.map((p, i) =>
    ({ ...p, role: roles[i], word: roles[i] === 'CIVIL' ? 'Chat' : 'Tigre' })) };
}

function eliminate(state: GameState, targetId: string): GameState {
  for (const p of state.players.filter(p => p.isAlive)) {
    state = gameReducer(state, { type: 'VOTE', playerId: p.id, targetId: p.id === targetId ? state.players.find(t => t.isAlive && t.id !== p.id)!.id : targetId });
  }
  return state;
}

test('three ready players complete reveal, discussion, vote, victory and replay', () => {
  let state = gameReducer(room(), { type: 'START_GAME', playerId: '0' });
  assert.equal(state.phase, 'REVEAL_WORD');
  assert.equal(state.players.filter(p => p.role === 'IMPOSTER').length, 1);
  assert.ok(state.players.every(p => p.word));
  for (const p of state.players) state = gameReducer(state, { type: 'REVEAL_CONFIRM', playerId: p.id });
  assert.equal(state.phase, 'DISCUSSION');
  for (const p of state.players) state = gameReducer(state, { type: 'FINISH_SPEAKING', playerId: p.id });
  assert.equal(state.phase, 'VOTE_IN_PROGRESS');
  state = eliminate(state, state.players.find(p => p.role === 'IMPOSTER')!.id);
  assert.equal(state.phase, 'REVEAL_RESULT');
  assert.equal(state.impostorFound, true);
  state = gameReducer(state, { type: 'RESET_GAME', playerId: '0' });
  assert.equal(state.phase, 'LOBBY');
  assert.ok(state.players.every(p => !p.isReady && !p.word && p.isAlive));
});

test('only the host starts with at least three players and everyone ready', () => {
  const state = room();
  assert.equal(gameReducer(state, { type: 'START_GAME', playerId: '1' }), state);
  const unready = { ...state, players: state.players.map(p => p.id === '2' ? { ...p, isReady: false } : p) };
  assert.equal(gameReducer(unready, { type: 'START_GAME', playerId: '0' }), unready);
  const small = room(2);
  assert.equal(gameReducer(small, { type: 'START_GAME', playerId: '0' }), small);
});

test('phase, voter identity, duplicate votes and candidate eligibility are enforced', () => {
  let state = voting();
  for (const targetId of ['0', 'missing']) assert.equal(gameReducer(state, { type: 'VOTE', playerId: '0', targetId }), state);
  state = gameReducer(state, { type: 'VOTE', playerId: '0', targetId: '2' });
  assert.equal(gameReducer(state, { type: 'VOTE', playerId: '0', targetId: '1' }), state);
  const lobby = room();
  assert.equal(gameReducer(lobby, { type: 'VOTE', playerId: '0', targetId: '1' }), lobby);
  assert.deepEqual(clientAction({ type: 'VOTE', playerId: 'host', targetId: '2' }, '1'), { type: 'VOTE', playerId: '1', targetId: '2' });
  for (const data of [null, 'VOTE', {}, { type: 'RESET_GAME' }, { type: 'SYNC_STATE' }, { type: 'JOIN_ROOM' }, { type: 'REMOVE_PLAYER' }, { type: 'VOTE', targetId: 42 }]) assert.equal(clientAction(data, '1'), null);
});

test('ties lead to a host-controlled restricted vote; a second tie eliminates nobody', () => {
  let state = voting();
  for (const [playerId, targetId] of [['0', '1'], ['1', '2'], ['2', '0']]) state = gameReducer(state, { type: 'VOTE', playerId, targetId });
  assert.equal(state.phase, 'TIE_BREAKER_ARGUMENT');
  assert.equal(gameReducer(state, { type: 'START_TIE_VOTE', playerId: '1' }), state);
  state = gameReducer(state, { type: 'START_TIE_VOTE', playerId: '0' });
  for (const [playerId, targetId] of [['0', '1'], ['1', '2'], ['2', '0']]) state = gameReducer(state, { type: 'VOTE', playerId, targetId });
  assert.equal(state.phase, 'REVEAL_RESULT');
  assert.equal(state.impostorFound, null);
  assert.ok(state.players.every(p => p.isAlive));
  state = gameReducer(state, { type: 'NEXT_ROUND', playerId: '0' });
  assert.equal(state.phase, 'DISCUSSION');
  const restricted = { ...voting(), phase: 'TIE_BREAKER_VOTE' as const, tieBreakerIds: ['0', '1'] };
  assert.equal(gameReducer(restricted, { type: 'VOTE', playerId: '0', targetId: '2' }), restricted);
});

test('both impostors must be eliminated, and impostors win at parity', () => {
  const roles = ['CIVIL', 'CIVIL', 'CIVIL', 'CIVIL', 'CIVIL', 'CIVIL', 'IMPOSTER', 'IMPOSTER'] as const;
  const started = gameReducer(room(8), { type: 'START_GAME', playerId: '0' });
  assert.equal(started.players.filter(p => p.role === 'IMPOSTER').length, 2);
  let state = eliminate(voting(roles), '6');
  assert.equal(state.impostorFound, null);
  state = gameReducer(state, { type: 'NEXT_ROUND', playerId: '0' });
  state = { ...state, phase: 'VOTE_IN_PROGRESS' };
  state = eliminate(state, '7');
  assert.equal(state.impostorFound, true);
  assert.equal(eliminate(voting(), '1').impostorFound, false);
});

test('late joiners spectate and departed players cannot block reveal or discussion', () => {
  let state = { ...voting(['CIVIL', 'CIVIL', 'CIVIL', 'IMPOSTER']), phase: 'REVEAL_WORD' as GameState['phase'] };
  state = gameReducer(state, { type: 'JOIN_ROOM', player: makePlayer('late', 'Spectateur', '🐱|bg-blue-200') });
  assert.equal(state.players.find(p => p.id === 'late')?.isAlive, false);
  for (const playerId of ['0', '1', '3']) state = gameReducer(state, { type: 'REVEAL_CONFIRM', playerId });
  state = gameReducer(state, { type: 'REMOVE_PLAYER', playerId: '2' });
  assert.equal(state.phase, 'DISCUSSION');
  assert.equal(state.players.find(p => p.id === '2')?.isConnected, false);
  for (const playerId of ['0', '1', '3']) state = gameReducer(state, { type: 'FINISH_SPEAKING', playerId });
  assert.equal(state.phase, 'VOTE_IN_PROGRESS');
  assert.equal(gameReducer(state, { type: 'VOTE', playerId: 'late', targetId: '0' }), state);
  assert.equal(gameReducer(state, { type: 'VOTE', playerId: '0', targetId: '2' }), state);
});

test('disconnection restarts an active vote and may end the game', () => {
  let state = voting(['CIVIL', 'CIVIL', 'CIVIL', 'CIVIL', 'IMPOSTER']);
  state = gameReducer(state, { type: 'VOTE', playerId: '0', targetId: '1' });
  state = gameReducer(state, { type: 'REMOVE_PLAYER', playerId: '1' });
  assert.equal(state.phase, 'VOTE_IN_PROGRESS');
  assert.deepEqual(state.votes, {});
  assert.ok(state.players.every(p => p.votedForId === null));
  state = gameReducer(state, { type: 'REMOVE_PLAYER', playerId: '4' });
  assert.equal(state.impostorFound, true);
  assert.equal(state.phase, 'REVEAL_RESULT');
  state = gameReducer(state, { type: 'RESET_GAME', playerId: '0' });
  assert.deepEqual(state.players.map(p => p.id), ['0', '2', '3']);
});

test('a departing spectator preserves the active vote', () => {
  let state = gameReducer(voting(), { type: 'JOIN_ROOM', player: makePlayer('late', 'Spectateur', '🐱|bg-blue-200') });
  state = gameReducer(state, { type: 'VOTE', playerId: '0', targetId: '2' });
  const next = gameReducer(state, { type: 'REMOVE_PLAYER', playerId: 'late' });
  assert.equal(next.phase, 'VOTE_IN_PROGRESS');
  assert.deepEqual(next.votes, { '0': '2' });
  assert.equal(next.players[0].votedForId, '2');
});

test('guests cannot inspect other secrets or votes before results', () => {
  let state = voting();
  state = { ...state, currentWordPair: { civil: 'Chat', imposter: 'Tigre', category: 'Animaux' }, votes: { '0': '2' },
    players: state.players.map(p => p.id === '0' ? { ...p, votedForId: '2' } : p) };
  const view = playerView(state, '1');
  assert.equal(view.currentWordPair, null);
  assert.equal(view.players[0].role, null);
  assert.equal(view.players[0].word, null);
  assert.equal(view.players[0].votedForId, null);
  assert.equal(view.players[1].word, 'Chat');
  assert.deepEqual(view.votes, {});
  const over = playerView({ ...state, phase: 'REVEAL_RESULT', impostorFound: true }, '1');
  assert.equal(over.players[2].word, 'Tigre');
  assert.deepEqual(over.votes, state.votes);
});

test('room codes normalize whitespace and case, reject path injection', () => {
  assert.equal(normalizeSlug('  Joli-Tigre-8  '), 'joli-tigre-8');
  assert.ok(validSlug(normalizeSlug('  Joli-Tigre-8  ')));
  for (const slug of ['', 'ab', '../room', 'room/name', 'a'.repeat(65), 'avec espace']) assert.equal(validSlug(slug), false);
});
