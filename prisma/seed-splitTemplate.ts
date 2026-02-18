import { PrismaClient, SplitType } from "@prisma/client";
import splits from "../public/split_type.json";

const prisma = new PrismaClient();

async function main() {
  for (const s of splits) {
    await prisma.splitTemplate.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.id, // Using ID as name since JSON doesn't have a name field
        type: s.type as SplitType,
        daysPerWeek: s.daysPerWeek,
        constraints: s.constraints as any,
        structure: s.structure as any,
      },
    });
  }
  console.log("✅ SplitTemplates seeded");
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
