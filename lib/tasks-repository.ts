import prisma from './prisma.js';

const listTasksForUser = (userId: string) =>
  prisma.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
  });

const findTaskForUser = (userId: string, id: number) =>
  prisma.task.findFirst({ where: { id, userId } });

export { listTasksForUser, findTaskForUser };
