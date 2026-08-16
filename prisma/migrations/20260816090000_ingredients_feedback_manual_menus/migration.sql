-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('SEED', 'MANUAL');

-- CreateEnum
CREATE TYPE "Vote" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable: Category gains a provenance marker so the seed only prunes its own rows.
ALTER TABLE "Category" ADD COLUMN "source" "ContentSource" NOT NULL DEFAULT 'SEED';

-- AlterTable: MenuItem gains per-portion ingredients, serving size, provenance and an active flag.
ALTER TABLE "MenuItem" ADD COLUMN "ingredients" TEXT[];
ALTER TABLE "MenuItem" ADD COLUMN "servingSize" TEXT NOT NULL DEFAULT '1 ที่';
ALTER TABLE "MenuItem" ADD COLUMN "source" "ContentSource" NOT NULL DEFAULT 'SEED';
ALTER TABLE "MenuItem" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "vote" "Vote" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItem_isActive_idx" ON "MenuItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_userId_menuItemId_key" ON "Feedback"("userId", "menuItemId");

-- CreateIndex
CREATE INDEX "Feedback_vote_idx" ON "Feedback"("vote");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
