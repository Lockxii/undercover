'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { User, Loader2 } from 'lucide-react';

export default function PseudoScreen({ slug, create }: { slug: string; create: boolean }) {
  const { enterRoom, connectionStatus, connectionError } = useGame();
  const [pseudo, setPseudo] = useState('');
  const connecting = connectionStatus === 'connecting';

  return <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-background">
    <form className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-sm border-2 border-gray-100 text-center"
      onSubmit={e => { e.preventDefault(); if (!connecting) void enterRoom(slug, pseudo, create); }}>
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-blue">
        {connecting ? <Loader2 size={40} className="animate-spin" /> : <User size={40} />}
      </div>
      <h2 className="text-2xl font-black text-gray-700 mb-2">Qui es-tu ?</h2>
      <p className="text-gray-400 font-bold mb-6 text-sm">{create ? 'Crée ta salle et invite tes amis.' : 'Rejoins tes amis avec ton nom de code.'}</p>
      <div className="space-y-4">
        <Input aria-label="Ton pseudo" placeholder="Ton pseudo" value={pseudo} onChange={e => setPseudo(e.target.value)}
          className="text-center" minLength={3} maxLength={12} required autoComplete="nickname" disabled={connecting} />
        <Button type="submit" fullWidth size="lg" disabled={pseudo.trim().length < 3 || connecting}>
          {connecting ? 'Connexion...' : connectionError ? 'Réessayer' : 'Valider'}
        </Button>
      </div>
      {connecting && <p role="status" className="mt-4 text-sm text-gray-500">{create ? 'Création de la salle...' : 'Connexion à l’hôte...'}</p>}
      {connectionError && <p role="alert" className="mt-4 text-sm font-bold text-red-600">{connectionError}</p>}
    </form>
    <p className="mt-6 text-gray-500 text-sm font-bold">Salle : {slug}</p>
    <Link href="/" className="mt-4 font-bold text-brand-blue underline">Retour à l’accueil</Link>
  </div>;
}
