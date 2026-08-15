-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "howTo" TEXT NOT NULL DEFAULT '';

-- Drop the default now that existing rows (if any) have been backfilled;
-- new rows must supply howTo explicitly going forward.
ALTER TABLE "MenuItem" ALTER COLUMN "howTo" DROP DEFAULT;
