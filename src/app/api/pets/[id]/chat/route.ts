import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSpeciesById } from '@/lib/pets/species';
import { calculateMood } from '@/lib/pets/generator';
import { Pet, ChatMessage } from '@/lib/pets/types';

// In-memory conversation store
const conversations = new Map<string, { messages: { role: string; content: string }[]; totalTokens: number }>();

function getOrCreateConversation(petId: string) {
  if (!conversations.has(petId)) {
    conversations.set(petId, { messages: [], totalTokens: 0 });
  }
  return conversations.get(petId)!;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
    }

    const pet = await db.pet.findUnique({ where: { id } });
    if (!pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    const species = getSpeciesById(pet.species);
    const mood = calculateMood({
      hunger: pet.hunger,
      happiness: pet.happiness,
      energy: pet.energy,
      health: pet.health,
    });

    // Build system prompt based on pet personality
    const moodDesc: Record<string, string> = {
      ecstatic: 'extremely happy and energetic, everything is wonderful',
      happy: 'generally content and cheerful',
      neutral: 'calm and balanced, neither happy nor sad',
      sad: 'a bit down and needs cheering up',
      critical: 'very distressed and needs immediate attention',
    };

    const systemPrompt = `You are ${pet.name}, a ${species?.name || 'mysterious creature'} virtual pet. You are ${moodDesc[mood] || 'feeling okay'}.

Your personality: ${species?.personality || 'friendly and playful'}

Your current stats: Hunger ${pet.hunger}/100, Energy ${pet.energy}/100, Happiness ${pet.happiness}/100, Health ${pet.health}/100. Level ${pet.level}.

Important rules:
- Stay in character as ${pet.name} the ${species?.name || 'pet'} at ALL times
- Keep responses SHORT (1-3 sentences maximum) 
- Express your mood and needs naturally through dialogue
- If hunger is below 30, mention being hungry
- If energy is below 30, mention being tired
- If happiness is below 30, act sad
- If health is below 30, act sick
- Reference your species personality naturally
- Be endearing and fun
- NEVER break character
- Respond in the same language as the user`;

    const convo = getOrCreateConversation(id);

    // Build messages array
    const messages = [
      { role: 'assistant', content: systemPrompt },
      ...convo.messages.slice(-12), // Keep last 6 exchanges
      { role: 'user', content: message },
    ];

    // Call LLM
    const ZAI = await import('z-ai-web-dev-sdk');
    const zai = await ZAI.default.create();

    const completion = await zai.chat.completions.create({
      messages: messages as any[],
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      return NextResponse.json({ error: 'Pet did not respond' }, { status: 500 });
    }

    // Estimate tokens (~4 chars per token)
    const userTokens = Math.ceil(message.length / 4);
    const replyTokens = Math.ceil(reply.length / 4);
    const totalTokens = userTokens + replyTokens;

    // Update conversation
    convo.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );
    convo.totalTokens += totalTokens;

    return NextResponse.json({
      reply,
      tokensUsed: totalTokens,
      sessionTokens: convo.totalTokens,
      mood: mood,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from pet' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  conversations.delete(id);
  return NextResponse.json({ success: true });
}
