'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { parseAvatar } from '@/lib/utils';
import { Check, MessageCircle, Skull, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import WordPeek from './WordPeek';

export default function Discussion() {
  const { state, playerId, finishSpeaking, isHost, startTieVote } = useGame();
  
  const myPlayer = state.players.find(p => p.id === playerId);
  
  // Logic for Tie Breaker
  const isTieBreaker = state.phase === 'TIE_BREAKER_ARGUMENT';
  
  // Active players are either everyone alive OR just the tied players if in Tie Breaker
  const activePlayers = state.players.filter(p => {
      if (!p.isAlive) return false;
      if (isTieBreaker && state.tieBreakerIds) {
          return state.tieBreakerIds.includes(p.id);
      }
      return true;
  });

  const waitingFor = activePlayers.filter(p => !p.hasFinishedSpeaking);
  const countWaiting = waitingFor.length;

  if (!myPlayer) return null;

  const isSpectator = !myPlayer.isAlive;
  const isTiedPlayer = isTieBreaker && state.tieBreakerIds?.includes(myPlayer.id);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4">
      <header className="py-4 text-center">
        <h2 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-2">
          {isTieBreaker ? <Scale className="text-brand-orange" /> : <MessageCircle className="text-brand-orange" />}
          {isTieBreaker ? "Égalité !" : "Débattez !"}
        </h2>
        <p className="text-gray-400 font-bold text-sm">
          {isTieBreaker 
            ? "Les suspects ont 2 minutes pour se défendre." 
            : (isSpectator ? "Vous êtes éliminé (Spectateur)" : "Qui est l'imposteur ?")
          }
        </p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 py-4">
        {state.players.map((p) => {
          const { emoji, color } = parseAvatar(p.avatar);
          const isAlive = p.isAlive;
          const isInTie = isTieBreaker && state.tieBreakerIds?.includes(p.id);
          
          // Visual: 
          // If Tie Breaker: Highlight Tie players, dim others.
          // If Normal: Dim dead players.
          
          const isDimmed = isTieBreaker ? !isInTie : !isAlive;
          
          return (
            <motion.div 
              key={p.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: isDimmed ? 0.5 : 1 }}
            >
              <Card className={`flex items-center gap-4 p-3 ${
                  !isAlive ? 'bg-gray-200 border-gray-300' : 
                  (isTieBreaker && isInTie) ? 'border-brand-orange bg-orange-50 ring-2 ring-brand-orange' :
                  p.hasFinishedSpeaking ? 'opacity-70 bg-gray-50' : 'border-l-4 border-l-brand-orange'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${color} ${!isAlive ? 'grayscale' : ''}`}>
                  {isAlive ? emoji : <Skull size={20} className="text-gray-500" />}
                </div>
                <div className="flex-1">
                  <span className={`font-bold text-lg ${!isAlive ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{p.name}</span>
                  <div className="text-xs font-bold text-gray-400 uppercase">
                    {!isAlive ? 'Éliminé' : 
                      (isTieBreaker && isInTie ? 'En défense' : 
                      (p.hasFinishedSpeaking ? 'A voté (prêt)' : 'En discussion...'))
                    }
                  </div>
                </div>
                {isAlive && p.hasFinishedSpeaking && !isTieBreaker && (
                   <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                     <Check size={18} strokeWidth={4} />
                   </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="py-6 space-y-4 bg-brand-background text-center">
        {!isTieBreaker && (
            countWaiting > 0 ? (
            <p className="text-gray-400 font-bold animate-pulse">
                En attente de {countWaiting} joueur{countWaiting > 1 ? 's' : ''}...
            </p>
            ) : (
            <p className="text-green-500 font-bold">
                Tout le monde est prêt !
            </p>
            )
        )}

        {/* Normal Discussion Controls */}
        {!isTieBreaker && !isSpectator && (
            <Button 
            fullWidth 
            size="xl" 
            variant={myPlayer.hasFinishedSpeaking ? "outline" : "primary"}
            onClick={finishSpeaking}
            disabled={myPlayer.hasFinishedSpeaking}
            className={myPlayer.hasFinishedSpeaking ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-brand-orange border-orange-600 hover:bg-orange-500"}
            >
            {myPlayer.hasFinishedSpeaking ? "J'ai tout dit" : "J'ai fini de parler"}
            </Button>
        )}
        
        {/* Tie Breaker Controls */}
        {isTieBreaker && isHost && (
            <Button 
                fullWidth 
                size="xl" 
                variant="danger"
                onClick={startTieVote}
                className="animate-pulse"
            >
                Lancer le vote décisif
            </Button>
        )}
        
        {isTieBreaker && !isHost && (
             <p className="text-gray-400 font-bold">
                 L'hôte lancera le vote...
             </p>
        )}
        
        {isSpectator && !isTieBreaker && (
            <div className="p-4 bg-gray-100 rounded-xl text-gray-500 font-bold text-sm">
                Vous observez la partie.
            </div>
        )}
      </div>

      <WordPeek />
    </div>
  );
}
