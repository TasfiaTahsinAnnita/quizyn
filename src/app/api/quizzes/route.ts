import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    console.log('Quiz Save Request Received');
    const session = await getServerSession(authOptions);
    
    let hostId = session?.user?.id;
    
    if (!hostId) {
        console.log('No session found, using/creating dev host');
        try {
            const defaultUser = await prisma.user.findFirst();
            if (defaultUser) {
                hostId = defaultUser.id;
            } else {
                const dummy = await prisma.user.create({
                    data: {
                        email: 'dev@quizyn.com',
                        name: 'Dev Host',
                        password: 'password123'
                    }
                });
                hostId = dummy.id;
            }
        } catch (dbError: any) {
            console.error('DATABASE ERROR: Could not find/create host. Is your MySQL running and tables created?', dbError.message);
            return NextResponse.json({ 
                error: 'Database connection failed. Please check your .env file and run "npx prisma db push".',
                details: dbError.message 
            }, { status: 500 });
        }
    }

    const body = await req.json();
    console.log('Saving quiz:', body.title);

    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        description: body.description,
        hostId,
        questions: {
          create: body.questions.map((q: any) => ({
            text: q.text,
            timer: q.timer,
            points: q.points,
            options: {
              create: q.options.map((o: any) => ({
                text: o.text,
                isCorrect: o.isCorrect
              }))
            }
          }))
        }
      }
    });

    console.log('Quiz saved successfully:', quiz.id);
    return NextResponse.json(quiz, { status: 201 });
  } catch (error: any) {
    console.error('INTERNAL SERVER ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
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
