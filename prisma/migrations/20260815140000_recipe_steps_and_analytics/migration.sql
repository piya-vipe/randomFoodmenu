-- CreateEnum
CREATE TYPE "PickMethod" AS ENUM ('CATEGORY', 'RANDOM');

-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "howTo",
ADD COLUMN     "steps" TEXT[];

-- AlterTable
ALTER TABLE "Pick" ADD COLUMN     "method" "PickMethod";

-- CreateTable
CREATE TABLE "ResetEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clearedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResetEvent_createdAt_idx" ON "ResetEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Pick_createdAt_idx" ON "Pick"("createdAt");

-- CreateIndex
CREATE INDEX "Pick_method_idx" ON "Pick"("method");

-- AddForeignKey
ALTER TABLE "ResetEvent" ADD CONSTRAINT "ResetEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
