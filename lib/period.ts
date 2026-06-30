import type { HabitFrequency } from '@prisma/client';

const startOfDayUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const startOfIsoWeekUTC = (date: Date): Date => {
  const d = startOfDayUTC(date);
  const day = d.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
};

const computePeriodStart = (
  frequency: HabitFrequency,
  date: string | Date = new Date(),
): Date => {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00.000Z`) : date;
  return frequency === 'weekly' ? startOfIsoWeekUTC(d) : startOfDayUTC(d);
};

export { computePeriodStart };
