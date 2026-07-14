import prisma from './prisma.js';

interface SiteDuration {
  domain: string;
  duration: number;
}

const upsertDailyStats = (userId: string, date: string, sites: SiteDuration[]) =>
  prisma.$transaction(
    sites.map(({ domain, duration }) =>
      prisma.browsingDailyStat.upsert({
        where: { userId_domain_date: { userId, domain, date: new Date(`${date}T00:00:00.000Z`) } },
        update: { duration },
        create: { userId, domain, date: new Date(`${date}T00:00:00.000Z`), duration },
      })
    )
  );

interface DailyStatRow {
  domain: string;
  date: string;
  duration: number;
}

const getWeeklyStats = async (userId: string, today: string, days = 7): Promise<DailyStatRow[]> => {
  const end = new Date(`${today}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const rows = await prisma.browsingDailyStat.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  return rows.map(({ domain, date, duration }) => ({
    domain,
    date: date.toISOString().slice(0, 10),
    duration,
  }));
};

export { upsertDailyStats, getWeeklyStats };
