"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeEngine = void 0;
const client_1 = require("@prisma/client");
const validation_1 = require("./validation");
const prisma = new client_1.PrismaClient();
class VolumeEngine {
    static async getProfile(goal, level) {
        const profile = await prisma.volumeProfile.findFirst({
            where: { goal, experienceLevel: level },
        });
        if (!profile) {
            throw new Error(`No volume profile found for goal: ${goal} and level: ${level}.`);
        }
        const weeklySets = validation_1.VolumeProfileSchema.parse(profile.weeklySets);
        return {
            ...profile,
            weeklySets,
        };
    }
}
exports.VolumeEngine = VolumeEngine;
//# sourceMappingURL=VolumeEngine.js.map