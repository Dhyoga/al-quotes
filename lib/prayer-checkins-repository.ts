import { Prayer } from '@prisma/client';
import prisma from './prisma.js';
import { publishPrayerCheckInEvent } from './pusher.js';

const ALL_PRAYERS = Object.values(Prayer);

type Schedule = Record<Prayer, string>;

const getOrCreateForDate = async (userId: string, date: Date, schedule: Schedule) => {
  const existing = await prisma.prayerCheckIn.findMany({ where: { userId, date } });
  const existingPrayers = new Set(existing.map((c) => c.prayer));
  const missing = ALL_PRAYERS.filter((prayer) => !existingPrayers.has(prayer));

  if (missing.length === 0) return existing;

  await prisma.prayerCheckIn.createMany({
    data: missing.map((prayer) => ({ userId, date, prayer, scheduledTime: schedule[prayer] })),
    skipDuplicates: true,
  });

  return prisma.prayerCheckIn.findMany({ where: { userId, date } });
};

const findForUser = (userId: string, date: Date, prayer: Prayer) =>
  prisma.prayerCheckIn.findUnique({ where: { userId_date_prayer: { userId, date, prayer } } });

const toggle = async (userId: string, date: Date, prayer: Prayer, done: boolean) => {
  const updated = await prisma.prayerCheckIn.update({
    where: { userId_date_prayer: { userId, date, prayer } },
    data: { actualTime: done ? new Date() : null },
  });
  publishPrayerCheckInEvent(userId, 'prayerCheckIn.updated', updated);
  return updated;
};

export { getOrCreateForDate, findForUser, toggle };
