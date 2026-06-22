const prisma = require('./prisma');

const listTasksForUser = (userId) =>
  prisma.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
  });

const findTaskForUser = (userId, id) => prisma.task.findFirst({ where: { id, userId } });

module.exports = { listTasksForUser, findTaskForUser };
