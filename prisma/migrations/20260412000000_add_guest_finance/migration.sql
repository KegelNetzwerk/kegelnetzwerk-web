-- Add GUEST_FEE to FinanceTxType enum
ALTER TYPE "FinanceTxType" ADD VALUE 'GUEST_FEE';

-- Add guestId to FinanceTransaction
ALTER TABLE "FinanceTransaction" ADD COLUMN "guestId" INTEGER;
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add guestFeeAmount to ClubFinanceSettings
ALTER TABLE "ClubFinanceSettings" ADD COLUMN "guestFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
