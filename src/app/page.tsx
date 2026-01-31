'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { generateRoomSlug } from '@/lib/utils';
import { Search, Plus } from 'lucide-react'; // Need to check icons

export default function Home() {
  const router = useRouter();
  const [joinSlug, setJoinSlug] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleCreate = () => {
    const slug = generateRoomSlug();
    router.push(`/room/${slug}`);
  };

  const handleJoin = () => {
    if (!showJoinInput) {
      setShowJoinInput(true);
      return;
    }
    if (joinSlug.length < 3) return;
    router.push(`/room/${joinSlug.toLowerCase()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center max-w-md mx-auto pb-[env(safe-area-inset-bottom)]">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="mb-12"
      >
        <h1 className="text-5xl font-black text-[#58CC02] tracking-tight mb-2">
          UNDER
          <span className="text-[#2B70C9]">COVER</span>
        </h1>
        <p className="text-gray-500 font-bold text-lg">
          Démasquez l'imposteur en 3 min
        </p>
      </motion.div>

      <div className="w-full space-y-4">
        <Button 
          variant="primary" 
          size="xl" 
          fullWidth 
          onClick={handleCreate}
          className="flex items-center justify-center gap-3"
        >
          <Plus size={28} />
          Créer une partie
        </Button>

        <div className="relative">
          {showJoinInput ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Input
                placeholder="Code de la room (ex: joli-tigre-8)"
                value={joinSlug}
                onChange={(e) => setJoinSlug(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <Button 
                variant="secondary" 
                size="lg" 
                fullWidth 
                onClick={handleJoin}
                disabled={joinSlug.length < 3}
              >
                Rejoindre
              </Button>
            </motion.div>
          ) : (
            <Button 
              variant="outline" 
              size="xl" 
              fullWidth 
              onClick={() => setShowJoinInput(true)}
              className="flex items-center justify-center gap-3"
            >
              <Search size={28} />
              Rejoindre
            </Button>
          )}
        </div>
      </div>

      <motion.div 
        className="mt-16 bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-xl font-bold text-gray-700 mb-2">Comment jouer ?</h3>
        <ol className="text-left space-y-2 text-gray-500 font-medium">
          <li className="flex gap-2">
            <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
            Tout le monde a le même mot, sauf un.
          </li>
          <li className="flex gap-2">
            <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
            Décrivez votre mot tour à tour.
          </li>
          <li className="flex gap-2">
            <span className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
            Votez pour éliminer l'imposteur !
          </li>
        </ol>
      </motion.div>
    </main>
  );
}