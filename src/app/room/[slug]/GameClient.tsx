'use client';

import { GameProvider } from '@/context/GameContext';
import GameManager from '@/components/game/GameManager';

export default function GameClient({ slug }: { slug: string }) {
  return (
    <GameProvider>
      <GameManager slug={slug} />
    </GameProvider>
  );
}
