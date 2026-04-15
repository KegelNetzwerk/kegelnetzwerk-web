-- Add sessionGroup to FinanceTransaction to track which game session a SESSION_PAYMENT belongs to
ALTER TABLE "FinanceTransaction" ADD COLUMN "sessionGroup" INTEGER;
