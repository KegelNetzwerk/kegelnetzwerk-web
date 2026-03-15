import { prisma } from './prisma';

const HORIZON_MONTHS = 12;

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function nextOccurrence(date: Date, type: string, intervalWeeks: number | null): Date {
  const d = new Date(date);
  if (type === 'EVERY_N_WEEKS') {
    d.setDate(d.getDate() + (intervalWeeks ?? 1) * 7);
  } else if (type === 'MONTHLY') {
    d.setMonth(d.getMonth() + 1);
  } else if (type === 'YEARLY') {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

/** All occurrence dates from startDate up to 12 months from now. */
export function generateOccurrences(
  startDate: Date,
  type: string,
  intervalWeeks: number | null,
): Date[] {
  const horizon = addMonths(new Date(), HORIZON_MONTHS);
  const dates: Date[] = [];
  let current = new Date(startDate);
  while (current <= horizon) {
    dates.push(new Date(current));
    current = nextOccurrence(current, type, intervalWeeks);
  }
  return dates;
}

/**
 * For every recurrence rule in the club, ensure all occurrence dates
 * up to 12 months from now exist in the Event table. Call this on
 * each request to the events list so instances are always pre-populated.
 */
export async function ensureRecurringEvents(clubId: number): Promise<void> {
  const rules = await prisma.eventRecurrenceRule.findMany({
    where: { clubId },
    include: {
      events: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { date: true },
      },
    },
  });

  const horizon = addMonths(new Date(), HORIZON_MONTHS);

  for (const rule of rules) {
    const lastDate = rule.events[0]?.date;

    // Fast-forward from startDate to just after the last existing event
    let current = new Date(rule.startDate);
    if (lastDate) {
      while (current <= lastDate) {
        current = nextOccurrence(current, rule.type, rule.intervalWeeks);
      }
    }

    // Collect dates that still need to be created
    const toCreate: Date[] = [];
    while (current <= horizon) {
      toCreate.push(new Date(current));
      current = nextOccurrence(current, rule.type, rule.intervalWeeks);
    }

    if (toCreate.length > 0) {
      await prisma.event.createMany({
        data: toCreate.map((date) => ({
          clubId: rule.clubId,
          authorId: rule.authorId,
          subject: rule.subject,
          location: rule.location,
          description: rule.description,
          date,
          recurrenceRuleId: rule.id,
        })),
      });
    }
  }
}
