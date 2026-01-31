'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { parseAvatar } from '@/lib/utils';
import { motion } from 'framer-motion';
import WordPeek from './WordPeek';

export default function VotePhase() {
  const { state, playerId, vote } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const myPlayer = state.players.find(p => p.id === playerId);
  
  if (!myPlayer) return null;

  const isTieBreaker = state.phase === 'TIE_BREAKER_VOTE';

  // Spectator View (Dead)
  if (!myPlayer.isAlive) {
      return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 grayscale">
            <span className="text-4xl">👻</span>
            </div>
            <h2 className="text-2xl font-black text-gray-700">Vous êtes éliminé</h2>
            <p className="text-gray-400 mt-4 text-sm uppercase tracking-widest animate-pulse">
            Les survivants votent...
            </p>
        </div>
      );
  }

  // Already Voted View
  if (myPlayer.votedForId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
           <span className="text-4xl">🗳️</span>
         </div>
         <h2 className="text-2xl font-black text-gray-700">Vote enregistré</h2>
         <p className="text-gray-400 mt-4 text-sm uppercase tracking-widest animate-pulse">
           En attente des autres votes...
         </p>
      </div>
    );
  }

  const handleVote = () => {
    if (selectedId) {
      vote(selectedId);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4">
      <header className="py-4 text-center">
        <h2 className="text-2xl font-black text-red-500">
          {isTieBreaker ? "Vote Décisif" : "Qui est l'imposteur ?"}
        </h2>
        <p className="text-gray-400 font-bold text-sm">
          {isTieBreaker ? "Tranchez entre les suspects" : "Sélectionne un joueur"}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="grid grid-cols-2 gap-4">
          {state.players.map((p) => {
            if (p.id === playerId) return null;
            if (!p.isAlive) return null; 
            
            // TIE BREAKER FILTER
            if (isTieBreaker && state.tieBreakerIds && !state.tieBreakerIds.includes(p.id)) {
                return null;
            }
            
            const { emoji, color } = parseAvatar(p.avatar);
            const isSelected = selectedId === p.id;

            return (
              <motion.div 
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedId(p.id)}
              >
                <Card className={`flex flex-col items-center p-4 gap-2 cursor-pointer transition-all ${isSelected ? 'border-brand-orange bg-orange-50 ring-2 ring-brand-orange ring-offset-2' : 'hover:bg-gray-50'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl ${color}`}>
                    {emoji}
                  </div>
                  <span className="font-bold text-gray-800 text-center truncate w-full">
                    {p.name}
                  </span>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="py-4 bg-brand-background">
        <Button 
          fullWidth 
          size="xl" 
          variant="danger"
          onClick={handleVote}
          disabled={!selectedId}
        >
          Confirmer le vote
        </Button>
      </div>
      
      <WordPeek />
    </div>
  );
}
