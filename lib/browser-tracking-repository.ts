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

export { upsertDailyStats };
