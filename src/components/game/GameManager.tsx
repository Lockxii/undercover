'use client';

import React, { useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import PseudoScreen from './PseudoScreen';
import Lobby from './Lobby';
import RevealWord from './RevealWord';
import Discussion from './Discussion';
import VotePhase from './VotePhase';
import Result from './Result';

export default function GameManager({ slug }: { slug: string }) {
  const { state, playerId } = useGame();

  // If no player ID, we show the Entry Screen
  if (!playerId) {
    return <PseudoScreen slug={slug} />;
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
