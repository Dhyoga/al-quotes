const prisma = require('./prisma');

const listHabitsForUser = (userId) => prisma.habit.findMany({ where: { userId } });

const findHabitForUser = (userId, id) => prisma.habit.findFirst({ where: { id, userId } });

module.exports = { listHabitsForUser, findHabitForUser };
