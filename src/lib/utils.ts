import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ADJECTIVES = ['joli', 'grand', 'petit', 'rapide', 'rouge', 'bleu', 'joyeux', 'triste', 'foux', 'sage', 'brave', 'calme'];
const ANIMALS = ['tigre', 'lion', 'chat', 'chien', 'loup', 'ours', 'aigle', 'requin', 'panda', 'koala', 'renard', 'lapin'];
const FRUITS = ['mangue', 'pomme', 'poire', 'fraise', 'kiwi', 'banane', 'orange', 'citron', 'peche', 'prune', 'melon', 'raisin'];

export function generateRoomSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = Math.random() > 0.5 
    ? ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    : FRUITS[Math.floor(Math.random() * FRUITS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}-${noun}-${num}`;
}

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🐵', '🐔', '🐧', '🐦', '🐤', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷', '🐢', '🐍', '🦎', '🦖', '🦕'];
const COLORS = [
  'bg-red-200', 'bg-orange-200', 'bg-amber-200', 'bg-yellow-200', 'bg-lime-200', 'bg-green-200', 
  'bg-emerald-200', 'bg-teal-200', 'bg-cyan-200', 'bg-sky-200', 'bg-blue-200', 'bg-indigo-200', 
  'bg-violet-200', 'bg-purple-200', 'bg-fuchsia-200', 'bg-pink-200', 'bg-rose-200'
];

export function generateAvatar(): string {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  // Encoding as a string "emoji|color" to be parsed by component
  return `${emoji}|${color}`;
}

export function parseAvatar(avatarString: string) {
  const [emoji, color] = avatarString.split('|');
  return { emoji, color };
}
