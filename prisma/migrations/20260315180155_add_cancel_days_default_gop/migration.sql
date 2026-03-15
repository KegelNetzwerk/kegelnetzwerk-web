-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "cancelDaysBeforeEvent" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "defaultGopId" INTEGER;
