import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generatePet, calculateMood } from '@/lib/pets/generator';
import { SPECIES, getSpeciesById } from '@/lib/pets/species';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';

    const pets = await db.pet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Recalculate mood for each pet
    const petsWithMood = pets.map(pet => ({
      ...pet,
      mood: calculateMood({
        hunger: pet.hunger,
        happiness: pet.happiness,
        energy: pet.energy,
        health: pet.health,
      }),
    }));

    return NextResponse.json({ pets: petsWithMood });
  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'default-user', name, speciesId } = body;

    // Check pet limit
    const existingCount = await db.pet.count({ where: { userId } });
    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 pets allowed per user' },
        { status: 400 }
      );
    }

    // Generate pet
    const generated = generatePet(userId, speciesId);
    const species = getSpeciesById(generated.speciesId)!;
    const mood = calculateMood(generated.stats);

    const pet = await db.pet.create({
      data: {
        userId,
        name: name || generated.name,
        species: generated.speciesId,
        asciiArt: species.asciiArt,
        rarity: species.rarity,
        hunger: generated.stats.hunger,
        happiness: generated.stats.happiness,
        energy: generated.stats.energy,
        health: generated.stats.health,
        mood,
        level: 1,
        xp: 0,
      },
    });

    return NextResponse.json({
      pet: { ...pet, mood },
      speciesInfo: {
        name: species.name,
        description: species.description,
        color: species.color,
        glowColor: species.glowColor,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating pet:', error);
    return NextResponse.json({ error: 'Failed to create pet' }, { status: 500 });
  }
}
