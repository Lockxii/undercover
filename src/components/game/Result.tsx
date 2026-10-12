'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { parseAvatar } from '@/lib/utils';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Share2, Check as CheckIcon } from 'lucide-react';

export default function Result() {
  const { state, playerId, isHost, resetGame, nextRound } = useGame();
  const [revealed, setRevealed] = useState(false);
  const [shared, setShared] = useState(false);
  
  
  const shareResult = async () => {
      const gameResult = state.impostorFound;
      const text = gameResult === true 
        ? "🕵️ J'ai démasqué l'imposteur sur Undercover Pro ! Les civils gagnent ! ✌️"
        : "🤫 J'ai survécu en tant qu'imposteur sur Undercover Pro ! Victoire totale ! 😈";
      
      try {
          await navigator.clipboard.writeText(text + "\nJoue avec nous : " + window.location.origin);
          setShared(true);
          setTimeout(() => setShared(false), 2000);
      } catch (err) {
          console.error(err);
      }
  };
  
  // Find who was eliminated this round based on votes
  // Logic mirrors Reducer: find max votes
  const voteCounts: Record<string, number> = {};
  Object.values(state.votes).forEach(target => {
    voteCounts[target] = (voteCounts[target] || 0) + 1;
  });
  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const leaders = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
  const eliminatedId = leaders.length === 1 ? leaders[0] : null;
  const eliminatedPlayer = state.players.find(p => p.id === eliminatedId);

  // Game Status
  // true = Civilians Win, false = Impostor Wins, null = Continue
  const gameResult = state.impostorFound; 
  const isGameOver = gameResult !== null;

  // Confetti on win
  useEffect(() => {
    if (revealed && isGameOver) {
      const myRole = state.players.find(p => p.id === playerId)?.role;
      const iWon = (myRole === 'CIVIL' && gameResult === true) || (myRole === 'IMPOSTER' && gameResult === false);
      
      if (iWon) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#58CC02', '#FF9600', '#1CB0F6']
        });
      }
    }
  }, [revealed, playerId, gameResult, isGameOver, state.players]);

  // Reveal delay
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 2000);
    return () => clearTimeout(timer);
  }, []);


  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto p-4 bg-brand-background">
      <header className="py-8 text-center">
        {!revealed ? (
           <h2 className="text-3xl font-black text-gray-800 animate-pulse">
             Le verdict tombe...
           </h2>
        ) : (
           <motion.div
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
           >
             {isGameOver ? (
                 <>
                    <h2 className={`text-4xl font-black mb-2 ${gameResult ? 'text-brand-green' : 'text-brand-red'}`}>
                        {gameResult ? 'Les Civils gagnent !' : 'Les Imposteurs gagnent !'}
                    </h2>
                    <p className="text-gray-500 font-bold">
                        {gameResult ? "L'imposteur a été démasqué." : "Il s'est bien caché..."}
                    </p>
                 </>
             ) : (
                 <>
                    <h2 className="text-3xl font-black mb-2 text-gray-700">
                        L&apos;enquête continue...
                    </h2>
                    <p className="text-gray-500 font-bold">
                        {eliminatedPlayer ? (eliminatedPlayer.role === 'IMPOSTER' ? 'Un imposteur est éliminé. Il en reste !' : 'Un civil a été éliminé.') : 'Personne n’est éliminé ce tour-ci.'}
                    </p>
                 </>
             )}
           </motion.div>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center">
        {revealed && eliminatedPlayer && (
            <div className="w-full max-w-xs mb-8">
               <p className="text-center text-gray-400 font-bold mb-4 uppercase text-sm tracking-widest">
                 {isGameOver && gameResult ? "L'imposteur était" : "Joueur éliminé"}
               </p>
               
               <motion.div
                 className="relative w-full"
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
               >
                   <Card className={`flex flex-col items-center justify-center p-6 border-b-8 ${isGameOver && gameResult ? 'border-brand-red' : 'border-gray-300'}`}>
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-6xl mb-4 ${parseAvatar(eliminatedPlayer.avatar).color} ${!eliminatedPlayer.isAlive ? 'grayscale opacity-50' : ''}`}>
                        {parseAvatar(eliminatedPlayer.avatar).emoji}
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 mb-1">{eliminatedPlayer.name}</h3>
                      
                      {eliminatedPlayer.role === 'IMPOSTER' ? (
                          <div className="text-center mt-2">
                             <span className="bg-red-100 text-red-500 px-3 py-1 rounded-full text-xs font-black uppercase mb-2 inline-block">
                                Imposteur
                             </span>
                             {isGameOver && <p className="text-2xl font-black text-gray-800 mt-2">{eliminatedPlayer.word}</p>}
                          </div>
                      ) : (
                          <div className="text-center mt-2">
                              <span className="bg-green-100 text-green-500 px-3 py-1 rounded-full text-xs font-black uppercase mb-2 inline-block">
                                Civil
                              </span>
                              <p className="text-gray-400 text-xs font-bold mt-2">Son mot reste secret</p>
                          </div>
                      )}
                   </Card>
               </motion.div>
            </div>
        )}
        
        {/* If no one eliminated (Tie) */}
        {revealed && !eliminatedPlayer && Object.keys(state.votes).length > 0 && (
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm border-2 border-gray-100">
                <span className="text-4xl">⚖️</span>
                <p className="font-bold text-gray-700 mt-2">Égalité parfaite</p>
                <p className="text-sm text-gray-500">Personne n&apos;est éliminé.</p>
            </div>
        )}

        {/* Voting History */}
        {revealed && (
          <div className="w-full space-y-2 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 mt-6">
            <h4 className="font-bold text-gray-700 px-2 text-sm uppercase">Votes du tour :</h4>
            {state.players.filter(p => p.isAlive || p.id === eliminatedId).map(p => { // Show votes from alive players + the one who just died
               if (!p.votedForId) return null;
               const target = state.players.find(t => t.id === p.votedForId);
               // Highlight correct/incorrect if game over, else neutral
               const isTargetImpostor = target?.role === 'IMPOSTER';
               const highlight = isGameOver ? (isTargetImpostor ? 'text-brand-green' : 'text-brand-red') : 'text-gray-800';
               
               return (
                 <div key={p.id} className="flex items-center gap-2 bg-white p-2 rounded-xl text-sm border border-gray-100 shadow-sm">
                   <span className="font-bold">{p.name}</span>
                   <span className="text-gray-400">a voté pour</span>
                   <span className={`font-bold ${highlight}`}>
                     {target?.name}
                   </span>
                 </div>
               );
            })}
          </div>
        )}
      </div>

      {revealed && isGameOver && (
        <div className="space-y-2 py-4">
          <h3 className="font-bold text-center">Les identités secrètes</h3>
          {state.players.filter(p => p.role !== null).map(p => <p key={p.id} className="text-center text-sm">
            <strong>{p.name}</strong> : {p.role === 'IMPOSTER' ? 'Imposteur' : 'Civil'} — {p.word}
          </p>)}
        </div>
      )}

      {revealed && isGameOver && (
        <div className="py-2">
            <Button 
                fullWidth 
                variant="outline" 
                onClick={shareResult}
                className="flex items-center justify-center gap-2 border-brand-blue text-brand-blue"
            >
                {shared ? <CheckIcon size={18} /> : <Share2 size={18} />}
                {shared ? "Copié !" : "Partager le résultat"}
            </Button>
        </div>
      )}

      {isHost && revealed && (
        <div className="py-2">
            {isGameOver ? (
                <Button fullWidth size="xl" onClick={resetGame}>
                    Rejouer
                </Button>
            ) : (
                <Button fullWidth size="xl" onClick={nextRound} variant="secondary">
                    Tour suivant
                </Button>
            )}
        </div>
      )}
      
      {!isHost && revealed && !isGameOver && (
          <div className="py-4 text-center text-gray-400 font-bold animate-pulse">
              En attente de l&apos;hôte pour le tour suivant...
          </div>
      )}
    </div>
  );
}
