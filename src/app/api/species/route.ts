import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SPECIES } from '@/lib/pets/species';
import { generatePet, calculateMood } from '@/lib/pets/generator';

export async function GET() {
  try {
    const species = SPECIES.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      asciiArt: s.asciiArt,
      color: s.color,
      glowColor: s.glowColor,
      rarity: s.rarity,
    }));
    return NextResponse.json({ species });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 });
  }
}
