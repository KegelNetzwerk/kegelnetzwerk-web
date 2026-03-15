-- AlterTable: Replace defaultGopId (Int?) with defaultScoringFilter (String)
ALTER TABLE "Club" DROP COLUMN IF EXISTS "defaultGopId";
ALTER TABLE "Club" ADD COLUMN "defaultScoringFilter" TEXT NOT NULL DEFAULT '';
