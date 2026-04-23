const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const pin = '877263'; // From user log
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
    console.log('Session:', JSON.stringify(session, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
