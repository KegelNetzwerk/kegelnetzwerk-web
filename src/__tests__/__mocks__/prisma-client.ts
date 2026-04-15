// Manual mock for @prisma/client — provides enum values used by route handlers.
// CI does not run `prisma generate`, so the real client is unavailable.

export const Role = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const;

export const Unit = {
  POINTS: 'POINTS',
  EURO: 'EURO',
} as const;

export const FinanceFrequency = {
  NONE: 'NONE',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  PER_SESSION: 'PER_SESSION',
} as const;

export const FinanceTxType = {
  PENALTY: 'PENALTY',
  CLUB_FEE: 'CLUB_FEE',
  PAYMENT_IN: 'PAYMENT_IN',
  PAYMENT_OUT: 'PAYMENT_OUT',
  CLUB_PURCHASE: 'CLUB_PURCHASE',
  COLLECTIVE: 'COLLECTIVE',
  REGULAR_INCOME: 'REGULAR_INCOME',
  RESET: 'RESET',
  MANUAL: 'MANUAL',
  GUEST_FEE: 'GUEST_FEE',
  SESSION_PAYMENT: 'SESSION_PAYMENT',
} as const;

export const CommentType = {
  NEWS: 'NEWS',
  VOTE: 'VOTE',
  EVENT: 'EVENT',
} as const;
