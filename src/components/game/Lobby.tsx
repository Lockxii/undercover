'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { parseAvatar } from '@/lib/utils';
import { Check, Crown, Copy, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Lobby() {
  const { state, playerId, isHost, toggleReady, startGame } = useGame();
  const [copied, setCopied] = useState(false);
  
  const players = state.players;
  const canStart = isHost && players.filter(p => p.isReady).length >= 4;

  const myPlayer = players.find(p => p.id === playerId);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4 pb-[env(safe-area-inset-bottom)]">
      <header className="py-4 text-center">
        <button 
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-gray-600 font-bold mb-4 text-sm uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <LinkIcon size={16} />}
          Room: {state.roomSlug}
          {copied ? <span className="text-green-500">Copié !</span> : <Copy size={14} className="opacity-50" />}
        </button>
        <h2 className="text-2xl font-black text-gray-800">
          En attente des joueurs
        </h2>
        <p className="text-gray-400 font-bold">
          {players.filter(p => p.isReady).length} / {players.length} prêts
        </p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 py-4">
        {players.map((p) => {
          const { emoji, color } = parseAvatar(p.avatar);
          return (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className={`flex items-center gap-4 p-3 ${p.isReady ? 'border-green-400 bg-green-50' : ''}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${color}`}>
                  {emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-lg">{p.name}</span>
                    {p.isHost && <Crown size={16} className="text-yellow-500 fill-yellow-500" />}
                  </div>
                  <div className="text-xs font-bold text-gray-400 uppercase">
                    {p.isReady ? 'Prêt à enquêter' : 'En attente...'}
                  </div>
                </div>
                {p.isReady && (
                   <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                     <Check size={18} strokeWidth={4} />
                   </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="py-4 space-y-3 bg-brand-background">
        <div className="bg-white p-4 rounded-2xl text-sm text-gray-500 border-l-4 border-blue-400">
          <strong>Règle :</strong> Tous les joueurs auront le même mot sauf un. L'imposteur doit bluffer pour ne pas être découvert.
        </div>

        {myPlayer && (
          <Button 
            fullWidth 
            size="lg" 
            variant={myPlayer.isReady ? "primary" : "outline"}
            onClick={toggleReady}
            className={myPlayer.isReady ? "bg-green-500 border-green-600 hover:bg-green-600" : ""}
          >
            {myPlayer.isReady ? "Je suis prêt !" : "Je suis prêt"}
          </Button>
        )}

        {isHost && (
          <Button 
            fullWidth 
            size="xl" 
            variant="secondary"
            onClick={startGame}
            disabled={!canStart}
            className="mt-2"
          >
            Lancer la partie
          </Button>
        )}
      </div>
    </div>
  );
}
