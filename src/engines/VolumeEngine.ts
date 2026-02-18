import { PrismaClient } from "@prisma/client";
import { VolumeProfileSchema } from "./validation";

const prisma = new PrismaClient() as any;

export class VolumeEngine {
  static async getProfile(goal: string, level: string) {
    const profile = await prisma.volumeProfile.findFirst({
      where: { goal, experienceLevel: level },
    });

    if (!profile) {
      throw new Error(
        `No volume profile found for goal: ${goal} and level: ${level}.`,
      );
    }

    const weeklySets = VolumeProfileSchema.parse(profile.weeklySets);

    return {
      ...profile,
      weeklySets,
    };
  }
}
