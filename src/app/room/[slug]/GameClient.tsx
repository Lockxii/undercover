'use client';

import { GameProvider } from '@/context/GameContext';
import GameManager from '@/components/game/GameManager';

export default function GameClient({ slug, create }: { slug: string; create: boolean }) {
  return (
    <GameProvider>
      <GameManager slug={slug} create={create} />
    </GameProvider>
  );
}
