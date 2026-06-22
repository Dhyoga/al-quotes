import prisma from './prisma.js';

const listTasksForUser = (userId) =>
  prisma.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
  });

const findTaskForUser = (userId, id) => prisma.task.findFirst({ where: { id, userId } });

export { listTasksForUser, findTaskForUser };
