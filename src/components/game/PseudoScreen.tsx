'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { motion } from 'framer-motion';
import { User, Loader2 } from 'lucide-react';

export default function PseudoScreen({ slug }: { slug: string }) {
  const { createRoom, joinRoom, connectionStatus } = useGame();
  const [pseudo, setPseudo] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleEnter = async () => {
    if (pseudo.length < 3) return;
    setIsChecking(true);
    setStatusMessage('Vérification de la room...');

    // Strategy: Try to CREATE the room first.
    // If it fails (ID taken), it means the room exists -> JOIN.
    // If it succeeds, we are the HOST.
    
    const success = await createRoom(pseudo, slug);
    
    if (success) {
        // We are Host
        console.log("Room created, I am host.");
    } else {
        // Room exists, Join it
        console.log("Room exists, joining...");
        setStatusMessage('Connexion à l\'hôte...');
        joinRoom(slug, pseudo);
        
        // Give it a moment to connect
        setTimeout(() => {
            // If still not connected after 5s, maybe error?
            // The GameManager will switch view once we have state.
        }, 5000);
    }
    
    // We don't turn off checking immediately if joining, as we wait for state sync
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-background">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-sm border-2 border-gray-100 text-center"
      >
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-blue">
          {isChecking ? <Loader2 size={40} className="animate-spin" /> : <User size={40} />}
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
            disabled={isChecking}
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

        {statusMessage && (
            <p className="mt-4 text-sm text-gray-400 animate-pulse font-bold">
                {statusMessage}
            </p>
        )}
      </motion.div>
      
      <p className="mt-8 text-gray-400 text-sm font-bold">
        Room: {slug}
      </p>
    </div>
  );
}