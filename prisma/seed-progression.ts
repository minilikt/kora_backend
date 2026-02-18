import { PrismaClient, ProgressionType } from "@prisma/client";
import progressionModels from "../public/progression.json";

const prisma = new PrismaClient();

async function main() {
  for (const pm of progressionModels) {
    await prisma.progressionModel.upsert({
      where: { id: pm.id },
      update: {},
      create: {
        id: pm.id,
        name: pm.name,
        type: pm.type as ProgressionType,
        durationWeeks: pm.durationWeeks,
        weeks: pm.weeks,
      },
    });
  }
  console.log("✅ ProgressionModels seeded");
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
