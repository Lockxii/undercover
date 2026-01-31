export type Role = 'CIVIL' | 'IMPOSTER';

export type GamePhase = 
  | 'LOBBY' 
  | 'REVEAL_WORD' 
  | 'DISCUSSION' 
  | 'VOTE_WAITING' // Waiting for everyone to say "I'm done speaking"
  | 'VOTE_IN_PROGRESS' // Actual voting phase
  | 'REVEAL_RESULT' 
  | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatar: string; // Emoji + Color
  role: Role | null; // Null in lobby
  word: string | null;
  isHost: boolean;
  isReady: boolean;
  isAlive: boolean; // New field for elimination
  
  // Game State Flags
  hasSeenWord: boolean;
  hasFinishedSpeaking: boolean;
  votedForId: string | null;
}

export interface RoomSettings {
  impostorCount: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
}

export interface GameState {
  roomId: string;
  roomSlug: string;
  players: Player[];
  phase: GamePhase;
  currentWordPair: { civil: string; imposter: string; category: string } | null;
  settings: RoomSettings;
  createdAt: number;
  lastActiveAt: number;
  
  // For voting results
  votes: Record<string, string>; // voterId -> targetId
  impostorFound: boolean | null;
}
