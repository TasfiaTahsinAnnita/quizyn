import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { pin, nickname } = await req.json();

    if (!pin || !nickname) {
      return NextResponse.json({ error: 'PIN and Nickname are required' }, { status: 400 });
    }

    // Find the session
    const session = await prisma.gameSession.findUnique({
      where: { pin },
      include: { players: true }
    });

    if (!session || session.status !== 'LOBBY') {
      return NextResponse.json({ error: 'Session not found or already started' }, { status: 404 });
    }

    // Check if the player already exists in this session
    let player = await prisma.player.findFirst({
      where: {
        sessionId: session.id,
        nickname: nickname
      }
    });

    if (!player) {
      // Create the player only if they don't exist
      player = await prisma.player.create({
        data: {
          nickname,
          sessionId: session.id,
        }
      });
    }

    // Broadcast join event via Pusher
    try {
      if (process.env.PUSHER_APP_ID !== 'your-app-id') {
        await pusherServer.trigger(`session-${pin}`, 'player-joined', {
          id: player.id,
          nickname: player.nickname
        });
      } else {
        console.warn('Real-time disabled: Please add real Pusher keys to your .env file.');
      }
    } catch (pusherError) {
      console.error('Pusher notification failed:', pusherError);
      // We don't return an error here so the player still joins the DB
    }

    return NextResponse.json({ player, session }, { status: 201 });
  } catch (error: any) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }
}
