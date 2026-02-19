"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionEngine = void 0;
const client_1 = require("@prisma/client");
const validation_1 = require("./validation");
const prisma = new client_1.PrismaClient();
class ProgressionEngine {
    static async getModel(idOrName) {
        const model = await prisma.progressionModel.findFirst({
            where: {
                OR: [{ id: idOrName }, { name: idOrName }],
            },
        });
        if (!model) {
            throw new Error(`No progression model found for: ${idOrName}.`);
        }
        const weeks = validation_1.ProgressionModelSchema.parse(model.weeks);
        // Validate continuity
        const weekNumbers = weeks.map((w) => w.week).sort((a, b) => a - b);
        for (let i = 0; i < weekNumbers.length; i++) {
            if (weekNumbers[i] !== i + 1) {
                throw new Error(`Progression model weeks must be continuous and start from 1. Found gap at week ${i + 1}.`);
            }
        }
        return {
            ...model,
            weeks,
        };
    }
}
exports.ProgressionEngine = ProgressionEngine;
//# sourceMappingURL=ProgressionEngine.js.map