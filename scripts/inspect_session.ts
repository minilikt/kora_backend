import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkSession() {
  const sessionId = "cmlp238fu000ivw30vhtuoz21";
  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    include: {
      plan: true,
    },
  });

  if (!session) {
    console.log("Session not found");
    return;
  }

  const planned = session.planned as any;
  console.log("Session metadata:", {
    week: session.week,
    dayNumber: session.dayNumber,
    exercisesLength: (planned.exercises || []).length,
    restDay: !!planned.rest,
  });

  if (planned.exercises && planned.exercises.length > 0) {
    console.log(
      "First Exercise:",
      JSON.stringify(planned.exercises[0], null, 2),
    );
  }
}

checkSession()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
