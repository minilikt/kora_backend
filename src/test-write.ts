import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as any;

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
