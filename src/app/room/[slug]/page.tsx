import GameClient from './GameClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { slug } = await params;
  return <GameClient slug={slug} />;
}
