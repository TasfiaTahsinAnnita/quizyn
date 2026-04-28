import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, nickname, optionIndex, timeLeft, totalTime, questionId } = body;

    // 1. Get the current session and player
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

    const player = session.players[0];
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    // Identify which question we are on
    let currentQuestion;
    if (questionId) {
      currentQuestion = session.quiz.questions.find(q => q.id === questionId);
    } else {
      // Use the host's current active question index
      currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    }

    if (!currentQuestion) {
      return NextResponse.json({ error: 'Question not found or already answered' }, { status: 400 });
    }

    // 2. Check correctness and calculate score
    const selectedOption = currentQuestion.options[optionIndex];
    const isCorrect = selectedOption?.isCorrect || false;
    
    let pointsEarned = 0;
    if (isCorrect) {
      // Basic Kahoot-like scoring: points * (time_left / total_time)
      const timeBonus = timeLeft / (totalTime || 20);
      pointsEarned = Math.round(currentQuestion.points * (0.5 + 0.5 * timeBonus));
    }

    // 3. Save the response
    await prisma.response.upsert({
      where: {
        playerId_questionId: {
          playerId: player.id,
          questionId: currentQuestion.id
        }
      },
      update: {
        optionIdx: optionIndex,
        isCorrect: isCorrect
      },
      create: {
        playerId: player.id,
        questionId: currentQuestion.id,
        sessionId: session.id,
        optionIdx: optionIndex,
        isCorrect: isCorrect
      }
    });

    // 4. Update player score
    if (pointsEarned > 0) {
      await prisma.player.update({
        where: { id: player.id },
        data: { score: { increment: pointsEarned } }
      });
    }

    // 5. Broadcast the selection to the Host
    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_APP_ID !== 'your-app-id') {
        await pusherServer.trigger(`session-${pin}`, 'player-answer', {
          optionIndex,
          nickname,
          isCorrect,
          pointsEarned,
          questionId: currentQuestion.id
        });
      }
    } catch (err) {
      console.warn('Pusher trigger failed:', err);
    }

    return NextResponse.json({ 
      success: true, 
      isCorrect, 
      pointsEarned,
      correctOptionIdx: currentQuestion.options.findIndex(o => o.isCorrect)
    });
  } catch (error) {
    console.error('Answer Error:', error);
    return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 });
  }
}
