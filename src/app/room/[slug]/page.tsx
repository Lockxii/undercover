import GameClient from './GameClient';
import { notFound } from 'next/navigation';
import { normalizeSlug, validSlug } from '@/lib/game';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ create?: string }>;
}

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const normalized = normalizeSlug(slug);
  if (!validSlug(normalized)) notFound();
  return <GameClient key={normalized} slug={normalized} create={(await searchParams).create === '1'} />;
}
