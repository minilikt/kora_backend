"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const counts = {
        exercises: await prisma.exercise.count(),
        muscles: await prisma.muscle.count(),
        equipment: await prisma.equipment.count(),
        patterns: await prisma.movementPattern.count(),
        categories: await prisma.category.count(),
        splits: await prisma.split.count(),
        exerciseMuscles: await prisma.exerciseMuscle.count(),
        exerciseEquipment: await prisma.exerciseEquipment.count(),
        userPlans: await prisma.userPlan.count(),
        users: await prisma.user.count(),
    };
    console.log("Database Counts:", JSON.stringify(counts, null, 2));
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=check-counts.js.map