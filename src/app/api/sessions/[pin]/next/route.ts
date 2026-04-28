import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  try {
    const { pin } = await params;
    const { questionIndex, status } = await req.json();

    // Update the session in the database
    await prisma.gameSession.update({
      where: { pin },
      data: { 
        ...(questionIndex !== undefined && { currentQuestionIndex: questionIndex }),
        ...(status && { status })
      }
    });

    // Notify all players that a new question has started
    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_APP_ID !== 'your-app-id') {
        await pusherServer.trigger(`session-${pin}`, 'new-question', {
          questionIndex
        });
      }
    } catch (err) {
      console.error('Pusher new-question trigger failed:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to trigger next question' }, { status: 500 });
  }
}
