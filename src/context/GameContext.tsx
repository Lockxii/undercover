'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import type { GameState } from '@/types/game';
import { generateAvatar } from '@/lib/utils';
import { clientAction, gameReducer, initialState, makePlayer, normalizeSlug, playerView, validSlug, type GameAction } from '@/lib/game';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
interface GameContextType {
  state: GameState;
  playerId: string;
  isHost: boolean;
  enterRoom: (slug: string, name: string, create: boolean) => Promise<void>;
  leaveRoom: () => void;
  toggleReady: () => void;
  startGame: () => void;
  confirmWordSeen: () => void;
  finishSpeaking: () => void;
  vote: (targetId: string) => void;
  startTieVote: () => void;
  nextRound: () => void;
  resetGame: () => void;
  connectionStatus: ConnectionStatus;
  connectionError: string;
}

const GameContext = createContext<GameContextType | null>(null);
const PEER_PREFIX = 'undercover-pro-v2-';
const TIMEOUT = 15000;

function peerError(type: string): string {
  switch (type) {
    case 'unavailable-id': return 'Ce code est déjà utilisé. Crée une autre salle ou rejoins celle-ci.';
    case 'peer-unavailable': return "Salle introuvable. Vérifie le code et demande à l’hôte de garder sa page ouverte.";
    case 'browser-incompatible': return 'Ce navigateur ne permet pas le jeu en ligne. Essaie un navigateur récent.';
    default: return 'Connexion impossible. Vérifie Internet et réessaie. Certains réseaux bloquent les connexions entre joueurs.';
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const [playerId, setPlayerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState('');
  const stateRef = useRef(initialState);
  const playerIdRef = useRef('');
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef(new Map<DataConnection, string>());
  const hostConnectionRef = useRef<DataConnection | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const cleanup = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    const peer = peerRef.current;
    peerRef.current = null;
    hostConnectionRef.current = null;
    connectionsRef.current.clear();
    peer?.destroy();
  };

  useEffect(() => {
    const disconnect = () => {
      cancelRef.current?.();
      const peer = peerRef.current;
      peerRef.current = null;
      peer?.destroy();
    };
    window.addEventListener('pagehide', disconnect);
    const resume = (event: PageTransitionEvent) => {
      if (event.persisted && playerIdRef.current && !peerRef.current) {
        setConnectionStatus('error');
        setConnectionError('Cette page a été suspendue. Rejoins la salle pour réessayer.');
      }
    };
    window.addEventListener('pageshow', resume);
    return () => {
      window.removeEventListener('pagehide', disconnect);
      window.removeEventListener('pageshow', resume);
      disconnect();
    };
  }, []);

  const publish = (next: GameState) => {
    stateRef.current = next;
    setState(next);
    connectionsRef.current.forEach((id, conn) => {
      if (conn.open && id) conn.send({ type: 'SYNC_STATE', playerId: id, payload: playerView(next, id) });
    });
  };

  const apply = (action: GameAction) => {
    const next = gameReducer(stateRef.current, action);
    if (next !== stateRef.current) publish(next);
  };

  const leaveRoom = () => {
    cleanup();
    playerIdRef.current = '';
    setPlayerId('');
    stateRef.current = initialState;
    setState(initialState);
    setConnectionStatus('disconnected');
    setConnectionError('');
  };

  const enterRoom = async (rawSlug: string, rawName: string, create: boolean) => {
    if (connectionStatus === 'connecting') return;
    const slug = normalizeSlug(rawSlug);
    const name = rawName.trim();
    if (!validSlug(slug) || name.length < 3 || name.length > 12) {
      setConnectionError('Utilise un code de salle valide et un pseudo de 3 à 12 caractères.');
      setConnectionStatus('error');
      return;
    }
    cleanup();
    setConnectionError('');
    setConnectionStatus('connecting');
    playerIdRef.current = '';
    setPlayerId('');
    stateRef.current = initialState;
    setState(initialState);

    await new Promise<void>((resolve) => {
      const peer = create ? new Peer(`${PEER_PREFIX}${slug}`, { debug: 1 }) : new Peer({ debug: 1 });
      peerRef.current = peer;
      let settled = false;
      let lastHostMessage = Date.now();
      let lastTick = Date.now();
      const lastSeen = new Map<DataConnection, number>();
      const current = () => peerRef.current === peer;
      const finish = () => {
        settled = true;
        clearTimeout(timer);
        cancelRef.current = null;
        resolve();
      };
      const fail = (message: string) => {
        if (!current()) return;
        finish();
        clearInterval(heartbeat);
        peerRef.current = null;
        peer.destroy();
        hostConnectionRef.current = null;
        setConnectionError(message);
        setConnectionStatus('error');
      };
      const timer = setTimeout(() => fail('La connexion a expiré. Vérifie le code, Internet et que l’hôte est toujours présent.'), TIMEOUT);
      const heartbeat = setInterval(() => {
        if (!current()) { clearInterval(heartbeat); return; }
        const now = Date.now();
        // Background tabs can suspend timers: don't blame peers for our own suspension.
        const suspended = now - lastTick > 15000;
        lastTick = now;
        if (create) {
          connectionsRef.current.forEach((id, conn) => {
            if (!id || !conn.open) return;
            if (suspended) lastSeen.set(conn, now);
            if (now - (lastSeen.get(conn) ?? now) > 45000) {
              connectionsRef.current.delete(conn);
              lastSeen.delete(conn);
              apply({ type: 'REMOVE_PLAYER', playerId: id });
              conn.close();
            } else conn.send({ type: 'PING' });
          });
        } else if (settled) {
          if (suspended) lastHostMessage = now;
          if (now - lastHostMessage > 45000) fail('L’hôte ne répond plus. Reviens à l’accueil pour créer une nouvelle partie.');
        }
      }, 5000);
      cancelRef.current = finish;
      peer.on('error', err => fail(peerError(err.type)));
      peer.on('disconnected', () => {
        if (current() && !peer.destroyed) peer.reconnect();
      });
      peer.on('close', () => {
        if (current()) fail('Connexion fermée. Rejoins la salle pour réessayer.');
      });

      if (create) {
        peer.on('connection', conn => {
          if (!current()) return conn.close();
          connectionsRef.current.set(conn, '');
          lastSeen.set(conn, Date.now());
          const joinTimer = setTimeout(() => conn.close(), TIMEOUT);
          conn.on('data', (data: unknown) => {
            if (!current() || !data || typeof data !== 'object' || !('type' in data)) return;
            const id = connectionsRef.current.get(conn);
            lastSeen.set(conn, Date.now());
            if (data.type === 'PONG') return;
            if (data.type === 'JOIN_ROOM' && id === '') {
              if (!('name' in data) || typeof data.name !== 'string') return;
              const guestName = data.name.trim();
              if (guestName.length < 3 || guestName.length > 12) return;
              if (stateRef.current.players.some(p => p.name.toLocaleLowerCase() === guestName.toLocaleLowerCase())) {
                conn.send({ type: 'ERROR', message: 'Ce pseudo est déjà pris. Choisis-en un autre.' });
                return;
              }
              const guestId = crypto.randomUUID();
              connectionsRef.current.set(conn, guestId);
              clearTimeout(joinTimer);
              apply({ type: 'JOIN_ROOM', player: makePlayer(guestId, guestName, generateAvatar()) });
            } else if (data.type === 'CLIENT_ACTION' && id && 'action' in data) {
              const action = clientAction(data.action, id);
              if (action) apply(action);
            }
          });
          const remove = () => {
            clearTimeout(joinTimer);
            const id = connectionsRef.current.get(conn);
            connectionsRef.current.delete(conn);
            lastSeen.delete(conn);
            if (current() && id) apply({ type: 'REMOVE_PLAYER', playerId: id });
          };
          conn.on('close', remove);
          conn.on('error', () => { remove(); conn.close(); });
        });
      }

      peer.on('open', () => {
        if (!current() || settled) return;
        if (create) {
          const id = crypto.randomUUID();
          playerIdRef.current = id;
          setPlayerId(id);
          publish({ ...initialState, roomId: crypto.randomUUID(), roomSlug: slug, createdAt: Date.now(), lastActiveAt: Date.now(),
            players: [makePlayer(id, name, generateAvatar(), true)] });
          setConnectionStatus('connected');
          // Invitation links always join; only the creator's initial URL uses ?create=1.
          window.history.replaceState(null, '', `/room/${slug}`);
          finish();
          return;
        }
        const conn = peer.connect(`${PEER_PREFIX}${slug}`, { reliable: true });
        hostConnectionRef.current = conn;
        conn.on('open', () => conn.send({ type: 'JOIN_ROOM', name }));
        conn.on('data', (data: unknown) => {
          if (!current() || !data || typeof data !== 'object' || !('type' in data)) return;
          lastHostMessage = Date.now();
          if (data.type === 'PING') { conn.send({ type: 'PONG' }); return; }
          if (data.type === 'ERROR' && 'message' in data && typeof data.message === 'string') return fail(data.message);
          if (data.type !== 'SYNC_STATE' || !('payload' in data) || !('playerId' in data) || typeof data.playerId !== 'string') return;
          const next = data.payload as GameState;
          if (!next || next.roomSlug !== slug || !Array.isArray(next.players) || !next.players.some(p => p.id === data.playerId)) return;
          stateRef.current = next;
          setState(next);
          playerIdRef.current = data.playerId;
          setPlayerId(data.playerId);
          setConnectionStatus('connected');
          finish();
        });
        conn.on('close', () => fail("L’hôte a quitté la salle. Une nouvelle partie doit être créée."));
        conn.on('error', () => fail('La connexion avec l’hôte a échoué. Réessaie.'));
      });
    });
  };

  const sendAction = (action: GameAction) => {
    if (connectionStatus !== 'connected') return;
    const me = stateRef.current.players.find(p => p.id === playerIdRef.current);
    if (me?.isHost) apply(action);
    else if (hostConnectionRef.current?.open) hostConnectionRef.current.send({ type: 'CLIENT_ACTION', action });
  };

  return <GameContext.Provider value={{ state, playerId, connectionStatus, connectionError, enterRoom, leaveRoom,
    isHost: state.players.some(p => p.id === playerId && p.isHost),
    toggleReady: () => sendAction({ type: 'TOGGLE_READY', playerId }),
    startGame: () => sendAction({ type: 'START_GAME', playerId }),
    confirmWordSeen: () => sendAction({ type: 'REVEAL_CONFIRM', playerId }),
    finishSpeaking: () => sendAction({ type: 'FINISH_SPEAKING', playerId }),
    vote: targetId => sendAction({ type: 'VOTE', playerId, targetId }),
    startTieVote: () => sendAction({ type: 'START_TIE_VOTE', playerId }),
    nextRound: () => sendAction({ type: 'NEXT_ROUND', playerId }),
    resetGame: () => sendAction({ type: 'RESET_GAME', playerId }),
  }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}
