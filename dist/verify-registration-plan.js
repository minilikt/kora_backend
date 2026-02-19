"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const UserService_1 = require("./services/UserService");
const fs = __importStar(require("fs"));
const prisma = new client_1.PrismaClient();
const logFile = "verification_output.log";
function log(message) {
    console.log(message);
    fs.appendFileSync(logFile, message + "\n");
}
async function main() {
    if (fs.existsSync(logFile))
        fs.unlinkSync(logFile);
    log("🚀 Starting Registration & Plan Verification...");
    const timestamp = Date.now();
    const testData = {
        email: `testuser_${timestamp}@example.com`,
        password: "password123",
        name: "Verification User",
        trainingLevel: "INTERMEDIATE",
        trainingDaysPerWeek: 4,
        trainingEnvironment: "GYM",
        goal: "HYPERTROPHY",
    };
    log(`📝 Registering user: ${testData.email}`);
    try {
        // 1. Simluate registration which should trigger plan generation
        const result = await UserService_1.UserService.registerAndGeneratePlan(testData);
        const userId = result.user.id;
        log(`✅ User registered with ID: ${userId}`);
        // 2. Verify Plan Creation
        log("🔍 Checking for generated plan...");
        const plan = await prisma.userPlan.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        if (!plan) {
            log("❌ FAILED: No plan was generated for the user.");
            process.exit(1);
        }
        log(`✅ Plan found! ID: ${plan.id}`);
        log(`📅 Plan Period: ${plan.startDate.toISOString()} to ${plan.endDate?.toISOString()}`);
        // 3. Verify Session Creation
        const sessions = await prisma.userSession.findMany({
            where: { planId: plan.id },
        });
        log(`✅ ${sessions.length} sessions were pre-populated.`);
        // 4. Output JSON Structure Preview
        log("\n--- Plan JSON Structure Preview ---");
        const planJson = plan.planJson;
        log(`Version: ${planJson.version}`);
        log("Keys in Plan JSON: " + Object.keys(planJson).join(", "));
        if (planJson.weeks && planJson.weeks.length > 0) {
            log(`\nSample Week 1 (Day 1) Exercises:`);
            const week1 = planJson.weeks[0];
            const session1 = week1.sessions.find((s) => !s.rest);
            if (session1) {
                log(JSON.stringify(session1.exercises.slice(0, 2), null, 2));
            }
        }
        log("\n--- API Info ---");
        log("Endpoint: GET /api/plans/active");
        log("Authentication: Required (Bearer Token)");
    }
    catch (error) {
        log(`❌ Verification failed with error: ${error.message}`);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=verify-registration-plan.js.map