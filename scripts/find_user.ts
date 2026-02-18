import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findUser() {
  const session = await prisma.userSession.findUnique({
    where: { id: "cmlp238fu000ivw30vhtuoz21" },
    select: { userId: true },
  });
  console.log("User ID:", session?.userId);

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { equipment: { include: { equipment: true } } },
    });
    console.log("User Profile:", {
      level: user?.trainingLevel,
      env: user?.trainingEnvironment,
      equipmentCount: user?.equipment.length,
      equipment: user?.equipment.map((e: any) => e.equipment.name),
    });
  }
}

findUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
