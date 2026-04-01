import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateMood } from '@/lib/pets/generator';
import { getSpeciesById } from '@/lib/pets/species';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pet = await db.pet.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const mood = calculateMood({
      hunger: pet.hunger,
      happiness: pet.happiness,
      energy: pet.energy,
      health: pet.health,
    });

    const species = getSpeciesById(pet.species);

    return NextResponse.json({
      pet: { ...pet, mood },
      speciesInfo: species ? {
        name: species.name,
        description: species.description,
        color: species.color,
        glowColor: species.glowColor,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching pet:', error);
    return NextResponse.json({ error: 'Failed to fetch pet' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.petAction.deleteMany({ where: { petId: id } });
    await db.pet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pet:', error);
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}
