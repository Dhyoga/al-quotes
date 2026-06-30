import rrulePkg from 'rrule';
import type { Event } from '@prisma/client';

// rrule's CJS build is a webpack UMD bundle with no package.json "exports" field,
// so Node's native ESM loader can't statically detect named exports (cjs-module-lexer
// can't parse the webpack output) and `import { rrulestr } from 'rrule'` fails to link
// at runtime. Importing the default and destructuring at runtime sidesteps that.
const { rrulestr } = rrulePkg;

// Stored RRULE strings never carry DTSTART (see buildHabitRrule in lib/calendar-sync.ts
// and the events feature design notes), so dtstart is supplied separately from startAt.
const getEventOccurrencesInRange = (event: Event, start: Date, end: Date): Date[] => {
  if (!event.isRecurring || !event.rrule) {
    return [];
  }

  try {
    const rule = rrulestr(event.rrule, { dtstart: new Date(event.startAt) });
    return rule.between(start, end, true);
  } catch (error: unknown) {
    console.error(`Failed to parse rrule for event ${event.id}:`, error);
    return [];
  }
};

export { getEventOccurrencesInRange };
