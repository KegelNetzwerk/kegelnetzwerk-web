-- CreateEnum
CREATE TYPE "FinanceFrequency" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "FinanceTxType" AS ENUM ('PENALTY', 'CLUB_FEE', 'PAYMENT_IN', 'PAYMENT_OUT', 'CLUB_PURCHASE', 'COLLECTIVE', 'REGULAR_INCOME', 'RESET', 'MANUAL');

-- CreateTable
CREATE TABLE "ClubFinanceSettings" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeFrequency" "FinanceFrequency" NOT NULL DEFAULT 'NONE',
    "autoPayoffEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoPayoffFrequency" "FinanceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "autoPayoffDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "lastPayoffAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubFinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoffEvent" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3) NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoffEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "memberId" INTEGER,
    "type" "FinanceTxType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "payoffEventId" INTEGER,
    "collectiveId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectiveCharge" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectiveCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectiveChargeAssignment" (
    "id" SERIAL NOT NULL,
    "collectiveId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectiveChargeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegularMemberPayment" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" "FinanceFrequency" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegularMemberPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubFinanceSettings_clubId_key" ON "ClubFinanceSettings"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectiveChargeAssignment_collectiveId_memberId_key" ON "CollectiveChargeAssignment"("collectiveId", "memberId");

-- AddForeignKey
ALTER TABLE "ClubFinanceSettings" ADD CONSTRAINT "ClubFinanceSettings_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoffEvent" ADD CONSTRAINT "PayoffEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_payoffEventId_fkey" FOREIGN KEY ("payoffEventId") REFERENCES "PayoffEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_collectiveId_fkey" FOREIGN KEY ("collectiveId") REFERENCES "CollectiveCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectiveCharge" ADD CONSTRAINT "CollectiveCharge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectiveChargeAssignment" ADD CONSTRAINT "CollectiveChargeAssignment_collectiveId_fkey" FOREIGN KEY ("collectiveId") REFERENCES "CollectiveCharge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectiveChargeAssignment" ADD CONSTRAINT "CollectiveChargeAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegularMemberPayment" ADD CONSTRAINT "RegularMemberPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
