import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const equipment = await prisma.equipment.findMany();
  console.log("Equipment Names:", equipment.map((e) => e.name).sort());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
