import {
  PrismaClient,
  TrainingGoal,
  TrainingPriority,
  ExperienceLevel,
} from "@prisma/client";
import volumeProfiles from "../public/volumes.json";
const prisma = new PrismaClient();

async function main() {
  for (const vp of volumeProfiles) {
    await prisma.volumeProfile.upsert({
      where: { id: vp.id },
      update: {},
      create: {
        id: vp.id,
        goal: vp.goal as TrainingGoal,
        priority: vp.priority as TrainingPriority,
        experienceLevel: vp.experienceLevel as ExperienceLevel,
        weeklySets: vp.weeklySets,
        repRange: vp.repRange,
        intensityRange: vp.intensityRange,
      },
    });
  }
  console.log("✅ VolumeProfiles seeded");
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
