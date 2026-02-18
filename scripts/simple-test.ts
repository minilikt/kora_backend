import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Prisma...");
  await prisma.$connect();
  console.log("Connected successfully!");
  const userCount = await prisma.user.count();
  console.log(`User count: ${userCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
