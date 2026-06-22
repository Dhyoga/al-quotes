import prisma from './prisma.js';

const listHabitsForUser = (userId) => prisma.habit.findMany({ where: { userId } });

const findHabitForUser = (userId, id) => prisma.habit.findFirst({ where: { id, userId } });

export { listHabitsForUser, findHabitForUser };
