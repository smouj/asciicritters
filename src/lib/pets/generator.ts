import { stringToSeed, seededRandomInt, mulberry32 } from "./rng";
import { SPECIES } from "./species";
import { PetStats, ActionType } from "./types";

const PET_NAMES = [
  "Zephyr", "Luna", "Ember", "Storm", "Pixel",
  "Nyx", "Orion", "Willow", "Blaze", "Crystal",
  "Shadow", "Frost", "Spark", "Misty", "Rex",
  "Astra", "Jolt", "Nimbus", "Echo", "Flux",
  "Nova", "Drift", "Glitch", "Neon", "Volt",
];

const ACTION_EFFECTS: Record<ActionType, Partial<PetStats> & { energyDelta?: number; xpGain: number }> = {
  feed: { hunger: 15, xpGain: 5 },
  play: { happiness: 12, energy: -8, xpGain: 8 },
  train: { health: 8, energy: -15, happiness: 5, xpGain: 15 },
  heal: { health: 20, xpGain: 5 },
  rest: { energy: 25, xpGain: 3 },
  pet: { happiness: 10, xpGain: 2 },
};

const ACTION_MESSAGES: Record<ActionType, string[]> = {
  feed: [
    "enjoyed a delicious meal!",
    "ate happily and licked its lips!",
    "munched on some tasty treats!",
    "gobbled up the food with delight!",
  ],
  play: [
    "played with a bouncy ball!",
    "chased its tail in circles!",
    "had a wonderful playtime!",
    "frolicked around joyfully!",
  ],
  train: [
    "trained hard and grew stronger!",
    "practiced new skills diligently!",
    "pushed through a tough workout!",
    "leveled up its training regimen!",
  ],
  heal: [
    "received a healing potion!",
    "was cured with magical herbs!",
    "feels much better now!",
    "recovered its vitality!",
  ],
  rest: [
    "took a peaceful nap!",
    "snoozed in a cozy corner!",
    "recharged its batteries!",
    "drifted into sweet dreams!",
  ],
  pet: [
    "purred with contentment!",
    "nuzzled against your hand!",
    "wagged happily at your touch!",
    "loved being petted!",
  ],
};

export function generatePet(userId: string, speciesId?: string): {
  name: string;
  speciesId: string;
  asciiArt: string;
  rarity: number;
  stats: PetStats;
} {
  const seed = stringToSeed(userId + (speciesId || ""));
  const rng = mulberry32(seed);

  // Determine species
  let selectedSpeciesId: string;
  if (speciesId && SPECIES.find((s) => s.id === speciesId)) {
    selectedSpeciesId = speciesId;
  } else {
    // Weighted random selection based on rarity
    const weighted: { id: string; weight: number }[] = SPECIES.map((s) => ({
      id: s.id,
      weight: 6 - s.rarity, // Common = 5 weight, Legendary = 1
    }));
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = rng() * totalWeight;
    selectedSpeciesId = weighted[0].id;
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) {
        selectedSpeciesId = w.id;
        break;
      }
    }
  }

  const species = SPECIES.find((s) => s.id === selectedSpeciesId)!;

  return {
    name: PET_NAMES[Math.floor(rng() * PET_NAMES.length)],
    speciesId: species.id,
    asciiArt: species.asciiArt,
    rarity: species.rarity,
    stats: {
      hunger: seededRandomInt(rng, 40, 80),
      happiness: seededRandomInt(rng, 40, 80),
      energy: seededRandomInt(rng, 40, 80),
      health: seededRandomInt(rng, 40, 80),
    },
  };
}

export function performAction(
  currentStats: PetStats,
  action: ActionType
): { newStats: PetStats; message: string; xpGain: number; levelUp: boolean; newLevel: number } {
  const effects = ACTION_EFFECTS[action];
  const messages = ACTION_MESSAGES[action];
  const message = messages[Math.floor(Math.random() * messages.length)];

  const newStats: PetStats = {
    hunger: Math.max(0, Math.min(100, currentStats.hunger + (effects.hunger || 0))),
    happiness: Math.max(0, Math.min(100, currentStats.happiness + (effects.happiness || 0))),
    energy: Math.max(0, Math.min(100, currentStats.energy + (effects.energyDelta || 0))),
    health: Math.max(0, Math.min(100, currentStats.health + (effects.health || 0))),
  };

  const xpGain = effects.xpGain;
  const currentXp = 0; // Will be calculated from pet data
  const newTotalXp = currentXp + xpGain;
  const newLevel = Math.floor(newTotalXp / 50) + 1;

  return {
    newStats,
    message,
    xpGain,
    levelUp: false,
    newLevel,
  };
}

export function calculateMood(stats: PetStats): string {
  const avg = (stats.hunger + stats.happiness + stats.energy + stats.health) / 4;
  if (avg >= 80) return "ecstatic";
  if (avg >= 60) return "happy";
  if (avg >= 40) return "neutral";
  if (avg >= 20) return "sad";
  return "critical";
}

export function getMoodEmoji(mood: string): string {
  switch (mood) {
    case "ecstatic": return "✨";
    case "happy": return "😊";
    case "neutral": return "😐";
    case "sad": return "😢";
    case "critical": return "💀";
    default: return "😐";
  }
}
