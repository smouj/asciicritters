export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
}

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: string;
  asciiArt: string;
  rarity: number;
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
  level: number;
  xp: number;
  mood: string;
  createdAt: string;
  updatedAt: string;
  actions?: PetAction[];
}

export interface PetAction {
  id: string;
  petId: string;
  action: string;
  message: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'pet';
  content: string;
  timestamp: number;
}

export interface Species {
  id: string;
  name: string;
  description: string;
  personality: string;
  asciiArt: string;
  color: string;
  glowColor: string;
  rarity: number;
}

export const RARITY_LABELS: Record<number, string> = {
  1: 'Common',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
};

export const RARITY_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#34d399',
  3: '#60a5fa',
  4: '#c084fc',
  5: '#fbbf24',
};

export const RARITY_BG: Record<number, string> = {
  1: 'rgba(156,163,175,0.1)',
  2: 'rgba(52,211,153,0.1)',
  3: 'rgba(96,165,250,0.1)',
  4: 'rgba(192,132,252,0.1)',
  5: 'rgba(251,191,36,0.15)',
};

export type ActionType = 'feed' | 'play' | 'train' | 'heal' | 'rest' | 'pet';

export const ACTION_CONFIG: Record<ActionType, { icon: string; label: string; color: string; cost: number; desc: string }> = {
  feed: { icon: '🍖', label: 'Feed', color: '#f97316', cost: 5, desc: 'Restore hunger' },
  play: { icon: '🎮', label: 'Play', color: '#22c55e', cost: 8, desc: 'Boost happiness' },
  train: { icon: '💪', label: 'Train', color: '#a855f7', cost: 12, desc: 'Gain XP & health' },
  heal: { icon: '💊', label: 'Heal', color: '#ef4444', cost: 6, desc: 'Restore health' },
  rest: { icon: '😴', label: 'Rest', color: '#6366f1', cost: 4, desc: 'Recharge energy' },
  pet: { icon: '🤗', label: 'Pet', color: '#ec4899', cost: 3, desc: 'Show affection' },
};

export const STAT_CONFIG = {
  hunger: { label: 'Hunger', icon: '🍖', color: '#f97316', lowLabel: 'Starving', highLabel: 'Full' },
  energy: { label: 'Energy', icon: '⚡', color: '#eab308', lowLabel: 'Exhausted', highLabel: 'Energetic' },
  happiness: { label: 'Happiness', icon: '😊', color: '#22c55e', lowLabel: 'Depressed', highLabel: 'Ecstatic' },
  health: { label: 'Health', icon: '❤️', color: '#ef4444', lowLabel: 'Critical', highLabel: 'Healthy' },
};

export const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
  ecstatic: { emoji: '✨', label: 'Ecstatic', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.1)' },
  happy: { emoji: '😊', label: 'Happy', color: '#34d399', bgColor: 'rgba(52,211,153,0.1)' },
  neutral: { emoji: '😐', label: 'Neutral', color: '#9ca3af', bgColor: 'rgba(156,163,175,0.1)' },
  sad: { emoji: '😢', label: 'Sad', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.1)' },
  critical: { emoji: '💀', label: 'Critical', color: '#f87171', bgColor: 'rgba(248,113,113,0.1)' },
};
