import prisma from './prisma.js';

const listHabitsForUser = (userId: string) => prisma.habit.findMany({ where: { userId } });

const findHabitForUser = (userId: string, id: number) =>
  prisma.habit.findFirst({ where: { id, userId } });

export { listHabitsForUser, findHabitForUser };
