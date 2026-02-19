"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🧪 Testing database write...");
    const cat = await prisma.category.upsert({
        where: { name: "TEST_CATEGORY_" + Date.now() },
        update: {},
        create: { name: "TEST_CATEGORY_" + Date.now() },
    });
    console.log("✅ Created test category:", cat.id);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=test-write.js.map