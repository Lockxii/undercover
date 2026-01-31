'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WordPeek() {
  const { state, playerId } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  
  const myPlayer = state.players.find(p => p.id === playerId);
  
  if (!myPlayer || !myPlayer.word || !myPlayer.isAlive) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-white border-2 border-gray-200 rounded-full p-3 shadow-lg hover:bg-gray-50 active:scale-95 transition-transform"
        title="Voir mon mot"
      >
        <Eye size={24} className="text-gray-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-center text-gray-400">
                <EyeOff size={40} />
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
                Ton mot secret
              </p>
              <h2 className="text-4xl font-black text-gray-800 mb-2">
                {myPlayer.word}
              </h2>
              {myPlayer.role === 'IMPOSTER' && (
                 <span className="inline-block bg-red-100 text-red-500 px-3 py-1 rounded-full text-xs font-black uppercase mt-2">
                    Tu es l'imposteur
                 </span>
              )}
              
              <div className="mt-8">
                <Button fullWidth onClick={() => setIsOpen(false)}>
                  Cacher
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
