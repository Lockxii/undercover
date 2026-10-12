'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { useGame } from '@/context/GameContext';
import PseudoScreen from './PseudoScreen';
import Lobby from './Lobby';
import RevealWord from './RevealWord';
import Discussion from './Discussion';
import VotePhase from './VotePhase';
import Result from './Result';

export default function GameManager({ slug, create }: { slug: string; create: boolean }) {
  const { state, playerId, connectionStatus, connectionError, leaveRoom } = useGame();

  if (playerId && connectionStatus !== 'connected') {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h2 className="text-2xl font-black">Connexion interrompue</h2>
      <p role="alert">{connectionError}</p>
      <Button onClick={leaveRoom}>Revenir à la salle</Button>
      <Link href="/" className="font-bold text-brand-blue underline">Créer une nouvelle partie</Link>
    </div>;
  }

  // If no player ID, we show the Entry Screen
  if (!playerId) {
    return <PseudoScreen slug={slug} create={create} />;
  }

  // Router for Game Phases
  switch (state.phase) {
    case 'LOBBY':
      return <Lobby />;
    case 'REVEAL_WORD':
      return <RevealWord />;
    case 'DISCUSSION':
    case 'VOTE_WAITING':
    case 'TIE_BREAKER_ARGUMENT':
      return <Discussion />;
    case 'VOTE_IN_PROGRESS':
    case 'TIE_BREAKER_VOTE':
      return <VotePhase />;
    case 'REVEAL_RESULT':
    case 'GAME_OVER':
      return <Result />;
    default:
      return <Lobby />;
  }
}
