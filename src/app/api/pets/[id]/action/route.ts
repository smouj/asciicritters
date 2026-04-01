import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { performAction, calculateMood } from '@/lib/pets/generator';
import { ActionType } from '@/lib/pets/types';
import { getSpeciesById } from '@/lib/pets/species';

const VALID_ACTIONS: ActionType[] = ['feed', 'play', 'train', 'heal', 'rest', 'pet'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const pet = await db.pet.findUnique({ where: { id } });
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const actionType = action as ActionType;

    if (actionType === 'train' && pet.energy < 10) {
      return NextResponse.json({ error: 'Too tired to train! Rest first.' }, { status: 400 });
    }

    const result = performAction(
      { hunger: pet.hunger, happiness: pet.happiness, energy: pet.energy, health: pet.health },
      actionType
    );
    const newMood = calculateMood(result.newStats);
    const newXp = pet.xp + result.xpGain;
    const newLevel = Math.floor(newXp / 50) + 1;
    const leveledUp = newLevel > pet.level;

    const updatedPet = await db.pet.update({
      where: { id },
      data: {
        hunger: result.newStats.hunger,
        happiness: result.newStats.happiness,
        energy: result.newStats.energy,
        health: result.newStats.health,
        mood: newMood,
        xp: newXp,
        level: newLevel,
      },
    });

    await db.petAction.create({
      data: { petId: id, action: actionType, message: result.message },
    });

    const species = getSpeciesById(pet.species);

    return NextResponse.json({
      pet: { ...updatedPet, mood: newMood },
      action: { type: actionType, message: result.message, xpGain: result.xpGain },
      speciesInfo: species ? {
        name: species.name, description: species.description,
        color: species.color, glowColor: species.glowColor,
      } : null,
      leveledUp,
      newLevel,
      tokensUsed: 1,
    });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
