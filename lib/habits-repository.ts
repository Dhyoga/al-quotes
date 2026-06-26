import type { Habit, Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { publishHabitEvent } from './pusher.js';
import { computePeriodStart } from './period.js';

const listHabitsForUser = (userId: string) => prisma.habit.findMany({ where: { userId } });

const findHabitForUser = (userId: string, id: number) =>
  prisma.habit.findFirst({ where: { id, userId } });

const createHabit = async (
  userId: string,
  data: Omit<Prisma.HabitCreateWithoutCheckInsInput, 'userId'>
) => {
  const habit = await prisma.habit.create({ data: { ...data, userId } });
  publishHabitEvent(userId, 'habit.created', habit);
  return habit;
};

const updateHabit = async (userId: string, id: number, data: Prisma.HabitUpdateInput) => {
  const habit = await prisma.habit.update({ where: { id }, data });
  publishHabitEvent(userId, 'habit.updated', habit);
  return habit;
};

const deleteHabit = async (userId: string, id: number) => {
  await prisma.habit.delete({ where: { id } });
  publishHabitEvent(userId, 'habit.deleted', { id });
};

const checkInHabit = async (userId: string, habit: Habit, date?: Date) => {
  const periodStart = computePeriodStart(habit.frequency, date);
  const checkIn = await prisma.habitCheckIn.upsert({
    where: { habitId_periodStart: { habitId: habit.id, periodStart } },
    update: {},
    create: { habitId: habit.id, periodStart, completed: true },
  });
  publishHabitEvent(userId, 'habit.checkedIn', checkIn);
  return checkIn;
};

export { listHabitsForUser, findHabitForUser, createHabit, updateHabit, deleteHabit, checkInHabit };
