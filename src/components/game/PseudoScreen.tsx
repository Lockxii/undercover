'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

export default function PseudoScreen({ slug }: { slug: string }) {
  const { createRoom, joinRoom } = useGame();
  const [pseudo, setPseudo] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleEnter = async () => {
    if (pseudo.length < 3) return;
    setIsChecking(true);

    // Discovery Logic
    const channelName = `undercover-game-${slug}`;
    const bc = new BroadcastChannel(channelName);
    
    let hostFound = false;

    const listener = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_STATE' || event.data.type === 'PONG') {
        hostFound = true;
      }
    };

    bc.addEventListener('message', listener);
    
    // Send PING
    bc.postMessage({ type: 'PING' });
    
    // Wait 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    bc.removeEventListener('message', listener);
    bc.close();

    if (hostFound) {
      joinRoom(slug, pseudo);
    } else {
      createRoom(pseudo, slug);
    }
    
    setIsChecking(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-background">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-sm border-2 border-gray-100 text-center"
      >
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-blue">
          <User size={40} />
        </div>
        
        <h2 className="text-2xl font-black text-gray-700 mb-2">Qui es-tu ?</h2>
        <p className="text-gray-400 font-bold mb-6 text-sm uppercase tracking-wide">
          Choisis ton nom de code
        </p>

        <div className="space-y-4">
          <Input 
            placeholder="Ton pseudo" 
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="text-center"
            maxLength={12}
            onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
          />
          
          <Button 
            fullWidth 
            size="lg" 
            onClick={handleEnter}
            disabled={pseudo.length < 3 || isChecking}
          >
            {isChecking ? 'Connexion...' : 'Valider'}
          </Button>
        </div>
      </motion.div>
      
      <p className="mt-8 text-gray-400 text-sm font-bold">
        Room: {slug}
      </p>
    </div>
  );
}
