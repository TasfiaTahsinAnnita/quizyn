import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // For now, if no session, we'll use a placeholder or return 401
    // To make development easier, we'll allow it if we're in dev mode
    // but in production this MUST be secured.
    let hostId = session?.user?.id;
    
    if (!hostId) {
        // Find or create a default user for development purposes
        const defaultUser = await prisma.user.findFirst();
        if (defaultUser) {
            hostId = defaultUser.id;
        } else {
            // Create a dummy host if none exists
            const dummy = await prisma.user.create({
                data: {
                    email: 'dev@quizyn.com',
                    name: 'Dev Host',
                    password: 'password123' // Placeholder
                }
            });
            hostId = dummy.id;
        }
    }

    const { title, description, questions } = await req.json();

    if (!title || !questions) {
      return NextResponse.json({ error: 'Title and questions are required' }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        hostId,
        questions: {
          create: questions.map((q: any) => ({
            text: q.text,
            timer: q.timer,
            options: {
              create: q.options.map((o: any) => ({
                text: o.text,
                isCorrect: o.isCorrect
              }))
            }
          }))
        }
      },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Failed to create quiz', details: error.message }, { status: 500 });
  }
}

export async function GET() {
    try {
        const quizzes = await prisma.quiz.findMany({
            include: {
                _count: {
                    select: { questions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(quizzes);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}
