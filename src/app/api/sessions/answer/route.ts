import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { pin, nickname, optionIndex, timeLeft, totalTime } = await req.json();

    // 1. Get the current session and question
    const session = await prisma.gameSession.findUnique({
      where: { pin },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        },
        players: {
          where: { nickname }
        }
      }
    });

    if (!session || !session.quiz.questions) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Note: We need to know which question we are on. 
    // For now, we'll assume the client sends the current question index or we can track it.
    // For this implementation, let's assume we're answering the "current active" question.
    // In a full production app, we'd store `currentQuestionIndex` in the GameSession table.

    const player = session.players[0];
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    // 2. Broadcast the selection to the Host for the Live Chart
    try {
      if (process.env.PUSHER_APP_ID !== 'your-app-id') {
        await pusherServer.trigger(`session-${pin}`, 'player-answer', {
          optionIndex,
          nickname
        });
      }
    } catch (err) {}

    // 3. Scoring Logic (Simplified for now - assumes correctness check happens later or we check it here)
    // In a real game, we'd check `session.quiz.questions[index].options[optionIndex].isCorrect`
    
    // Let's assume the client sends which question they are on
    // For now, we'll just record that an answer was received.
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 });
  }
}
