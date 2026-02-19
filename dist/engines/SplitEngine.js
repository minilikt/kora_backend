"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitEngine = void 0;
const client_1 = require("@prisma/client");
const validation_1 = require("./validation");
const prisma = new client_1.PrismaClient();
class SplitEngine {
    static async select(daysPerWeek, name) {
        const template = await prisma.splitTemplate.findFirst({
            where: {
                daysPerWeek,
                name: name,
            },
        });
        if (!template) {
            throw new Error(`No split template found for ${daysPerWeek} days per week.`);
        }
        // Validation
        const structure = validation_1.SplitTemplateSchema.parse(template.structure);
        if (structure.length !== 7 && structure.length !== daysPerWeek) {
            // Allowing for 7-day sequences or exact day matches
        }
        return {
            ...template,
            structure,
        };
    }
}
exports.SplitEngine = SplitEngine;
//# sourceMappingURL=SplitEngine.js.map