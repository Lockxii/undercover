'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { motion } from 'framer-motion';

export default function RevealWord() {
  const { state, playerId, confirmWordSeen } = useGame();
  const [isFlipped, setIsFlipped] = useState(false);
  
  const myPlayer = state.players.find(p => p.id === playerId);
  
  if (!myPlayer) return null;

  if (myPlayer.hasSeenWord) {
     return (
       <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
         <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
           <span className="text-4xl">🤫</span>
         </div>
         <h2 className="text-2xl font-black text-gray-700">Chut !</h2>
         <p className="text-gray-500 font-bold mt-2">
           Garde ton mot secret.
         </p>
         <p className="text-gray-400 mt-8 text-sm uppercase tracking-widest">
           En attente des autres joueurs...
         </p>
       </div>
     );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-6 items-center justify-center bg-brand-background">
      <h2 className="text-xl font-black text-gray-700 mb-8 text-center">
        Découvre ton identité secrète
      </h2>

      <div className="relative w-full aspect-[3/4] max-h-[400px] perspective-1000" onClick={() => !isFlipped && setIsFlipped(true)}>
        <motion.div
          className="w-full h-full relative transform-style-3d transition-transform duration-700"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
        >
          {/* FRONT (Hidden) */}
          <div className="absolute w-full h-full backface-hidden bg-brand-blue rounded-3xl shadow-xl flex flex-col items-center justify-center border-b-8 border-blue-600 cursor-pointer hover:brightness-110 transition-all">
            <span className="text-6xl mb-4">🕵️</span>
            <p className="text-white font-black text-2xl uppercase tracking-widest">
              Toucher pour révéler
            </p>
          </div>

          {/* BACK (Revealed) */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center border-2 border-gray-100 rotate-y-180 p-6 text-center">
            {myPlayer.role === 'IMPOSTER' ? (
              <div className="mb-6">
                <span className="bg-red-100 text-red-500 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  Tu es l'imposteur
                </span>
              </div>
            ) : (
              <div className="mb-6">
                <span className="bg-green-100 text-green-500 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  Tu es Civil
                </span>
              </div>
            )}

            <p className="text-gray-400 text-sm font-bold uppercase mb-2">Ton mot secret</p>
            <h1 className="text-4xl font-black text-gray-800 break-words leading-tight mb-8">
              {myPlayer.word}
            </h1>

            <p className="text-gray-400 text-xs font-medium">
              {myPlayer.role === 'IMPOSTER' 
                ? "Bluffe et essaie de deviner le mot des autres." 
                : "Trouve l'intrus sans te faire piéger."}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 w-full">
        {isFlipped ? (
          <Button 
             fullWidth 
             size="lg" 
             onClick={confirmWordSeen}
             className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            Cacher mon identité
          </Button>
        ) : (
          <p className="text-center text-gray-400 text-sm font-bold animate-pulse">
            Assure-toi que personne ne regarde...
          </p>
        )}
      </div>
    </div>
  );
}
