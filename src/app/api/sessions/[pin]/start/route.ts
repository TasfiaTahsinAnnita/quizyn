import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  try {
    const { pin } = await params;

    const session = await prisma.gameSession.update({
      where: { pin },
      data: { status: 'PLAYING' }
    });

    // Notify all players that the game has started
    try {
      if (process.env.PUSHER_APP_ID !== 'your-app-id') {
        await pusherServer.trigger(`session-${pin}`, 'game-started', {});
      }
    } catch (err) {
      console.error('Pusher notification failed:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
