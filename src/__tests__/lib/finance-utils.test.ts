jest.mock('@/lib/prisma', () => ({
  prisma: {
    result: { groupBy: jest.fn() },
  },
}));

import { enrichWithSessionDates, buildPayoffDateFilter } from '@/lib/finance-utils';
import { prisma } from '@/lib/prisma';

const mockGroupBy = prisma.result.groupBy as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('enrichWithSessionDates', () => {
  it('returns all transactions with sessionDate: null when none are SESSION_PAYMENT', async () => {
    const txs = [
      { type: 'PENALTY', sessionGroup: null },
      { type: 'PAYMENT_IN', sessionGroup: null },
    ];
    const result = await enrichWithSessionDates(txs, 1);
    expect(mockGroupBy).not.toHaveBeenCalled();
    expect(result[0].sessionDate).toBeNull();
    expect(result[1].sessionDate).toBeNull();
  });

  it('attaches session date for SESSION_PAYMENT transactions', async () => {
    const date = new Date('2026-04-01T10:00:00Z');
    mockGroupBy.mockResolvedValue([{ sessionGroup: 42, _min: { date } }]);
    const txs = [
      { type: 'SESSION_PAYMENT', sessionGroup: 42, amount: -5 },
      { type: 'PENALTY', sessionGroup: null, amount: -2 },
    ];
    const result = await enrichWithSessionDates(txs, 10);
    expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { clubId: 10, sessionGroup: { in: [42] } },
    }));
    expect(result[0].sessionDate).toBe(date.toISOString());
    expect(result[1].sessionDate).toBeNull();
  });

  it('returns null sessionDate when session group not found in Result table', async () => {
    mockGroupBy.mockResolvedValue([]);
    const txs = [{ type: 'SESSION_PAYMENT', sessionGroup: 99 }];
    const result = await enrichWithSessionDates(txs, 10);
    expect(result[0].sessionDate).toBeNull();
  });

  it('deduplicates session groups before querying', async () => {
    mockGroupBy.mockResolvedValue([{ sessionGroup: 5, _min: { date: new Date() } }]);
    const txs = [
      { type: 'SESSION_PAYMENT', sessionGroup: 5 },
      { type: 'SESSION_PAYMENT', sessionGroup: 5 },
    ];
    await enrichWithSessionDates(txs, 1);
    expect(mockGroupBy).toHaveBeenCalledTimes(1);
  });
});

describe('buildPayoffDateFilter', () => {
  it('returns gte+lt filter when fromDate is provided', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-04-01');
    expect(buildPayoffDateFilter(from, to)).toEqual({ date: { gte: from, lt: to } });
  });

  it('returns lt-only filter when fromDate is null', () => {
    const to = new Date('2026-04-01');
    expect(buildPayoffDateFilter(null, to)).toEqual({ date: { lt: to } });
  });
});
