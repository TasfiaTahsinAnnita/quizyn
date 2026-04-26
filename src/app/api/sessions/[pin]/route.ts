import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  try {
    const { pin } = await params;

    const session = await prisma.gameSession.findUnique({
      where: { pin },
      include: {
        players: true,
        responses: true,
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
    console.error('SESSION_FETCH_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch session', details: error.message }, { status: 500 });
  }
}
