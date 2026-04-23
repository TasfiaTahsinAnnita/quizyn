import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { pin, nickname } = await req.json();

    const session = await prisma.gameSession.findUnique({
      where: { pin }
    });

    if (session) {
      await prisma.player.deleteMany({
        where: {
          sessionId: session.id,
          nickname: nickname
        }
      });

      // Notify host via Pusher
      try {
        if (process.env.PUSHER_APP_ID !== 'your-app-id') {
          await pusherServer.trigger(`session-${pin}`, 'player-left', { nickname });
        }
      } catch (err) {}
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to leave' }, { status: 500 });
  }
}
