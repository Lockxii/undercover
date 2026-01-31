export type Role = 'CIVIL' | 'IMPOSTER';

export type GamePhase = 
  | 'LOBBY' 
  | 'REVEAL_WORD' 
  | 'DISCUSSION' 
  | 'VOTE_WAITING' 
  | 'VOTE_IN_PROGRESS' 
  | 'TIE_BREAKER_ARGUMENT' // New
  | 'TIE_BREAKER_VOTE' // New
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
  tieBreakerIds: string[] | null; // IDs of players in tie
  impostorFound: boolean | null;
}
