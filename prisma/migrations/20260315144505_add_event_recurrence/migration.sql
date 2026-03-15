-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrenceRuleId" INTEGER;

-- CreateTable
CREATE TABLE "EventRecurrenceRule" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "intervalWeeks" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRecurrenceRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventRecurrenceRule" ADD CONSTRAINT "EventRecurrenceRule_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRecurrenceRule" ADD CONSTRAINT "EventRecurrenceRule_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "EventRecurrenceRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
