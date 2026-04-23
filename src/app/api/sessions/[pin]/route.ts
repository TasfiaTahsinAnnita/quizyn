import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { pin: string } }
) {
  try {
    const { pin } = params;

    const session = await prisma.gameSession.findUnique({
      where: { pin },
      include: {
        players: true,
        quiz: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
