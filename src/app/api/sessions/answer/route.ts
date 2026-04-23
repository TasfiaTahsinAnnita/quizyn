import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { pin, nickname, optionIndex, timeLeft, totalTime } = await req.json();

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

    // Identify which question we are on (based on session data or assume latest unanswered)
    // For now, we'll assume the client is answering the "current" question.
    // In a production app, the session would have a `currentQuestionIndex`.
    // Since we don't have that yet, let's look at the quiz questions.
    
    // We'll use a simplified approach: The client sends the optionIndex for the question they are seeing.
    // We need to know which questionId that is. 
    // Let's assume the client also sends `questionId`.
    const { questionId } = await req.json().catch(() => ({})); 
    // Wait, I should probably update the client to send questionId too.
    
    // For now, let's find the first question that this player hasn't answered yet in this session.
    const answeredQuestionIds = await prisma.response.findMany({
      where: { playerId: player.id, sessionId: session.id },
      select: { questionId: true }
    });
    
    const unansweredQuestions = session.quiz.questions.filter(
      q => !answeredQuestionIds.find(a => a.questionId === q.id)
    );
    
    const currentQuestion = unansweredQuestions[0];
    if (!currentQuestion) {
      return NextResponse.json({ error: 'No more questions or already answered' }, { status: 400 });
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
    await prisma.response.create({
      data: {
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

    // 5. Broadcast the selection to the Host for the Live Chart
    try {
      if (process.env.PUSHER_APP_ID !== 'your-app-id') {
        await pusherServer.trigger(`session-${pin}`, 'player-answer', {
          optionIndex,
          nickname,
          isCorrect,
          pointsEarned
        });
      }
    } catch (err) {}

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
