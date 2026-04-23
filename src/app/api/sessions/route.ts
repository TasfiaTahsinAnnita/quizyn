import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { quizId } = await req.json();

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    // Ensure quiz exists
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Generate a unique PIN
    let pin = generatePin();
    let exists = await prisma.gameSession.findUnique({ where: { pin } });
    
    // Retry if PIN already exists (unlikely but possible)
    while (exists) {
      pin = generatePin();
      exists = await prisma.gameSession.findUnique({ where: { pin } });
    }

    const session = await prisma.gameSession.create({
      data: {
        pin,
        quizId,
        status: 'LOBBY'
      }
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
