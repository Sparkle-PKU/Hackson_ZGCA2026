import { PrismaClient } from "@prisma/client";
import { mkdir } from "node:fs/promises";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../data/dev.db";
}

const prisma = new PrismaClient();

async function main() {
  await mkdir(path.join(process.cwd(), "data", "uploads"), { recursive: true });

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Record" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "imagePath" TEXT NOT NULL,
      "originalName" TEXT,
      "userNote" TEXT,
      "capturedAt" DATETIME NOT NULL,
      "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "aiStatus" TEXT NOT NULL DEFAULT 'pending',
      "aiSummary" TEXT,
      "location" TEXT,
      "people" TEXT,
      "activities" TEXT,
      "food" TEXT,
      "objects" TEXT,
      "transport" TEXT,
      "emotion" TEXT,
      "tags" TEXT,
      "storyValue" TEXT,
      "imageDescription" TEXT,
      "rawAi" TEXT
    );
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Record" ADD COLUMN "imageDescription" TEXT;`).catch(() => undefined);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Record_capturedAt_idx" ON "Record"("capturedAt");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Report" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "periodType" TEXT NOT NULL,
      "periodStart" DATETIME NOT NULL,
      "periodEnd" DATETIME NOT NULL,
      "title" TEXT NOT NULL,
      "narrative" TEXT NOT NULL,
      "stats" TEXT NOT NULL,
      "highlights" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Report_periodType_periodStart_periodEnd_idx" ON "Report"("periodType", "periodStart", "periodEnd");`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
