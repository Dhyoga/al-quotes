import { CalendarEntityType, type Habit, type Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { publishHabitEvent } from './pusher.js';
import { computePeriodStart } from './period.js';
import { syncUpsert, syncDelete, buildHabitRrule } from './calendar-sync.js';

const toCalendarPayload = (habit: Habit) => ({
  title: habit.title,
  description: habit.description,
  priority: habit.priority,
  frequency: habit.frequency,
  rrule: buildHabitRrule(habit.frequency, habit.weekDays),
});

const syncHabitToCalendar = (userId: string, habit: Habit): void => {
  if (!habit.syncToCalendar) return;
  syncUpsert(userId, CalendarEntityType.habit, habit.id, toCalendarPayload(habit)).catch((error: unknown) => {
    console.error('Failed to sync habit to calendar:', error);
  });
};

const listHabitsForUser = (userId: string) => prisma.habit.findMany({ where: { userId } });

const findHabitForUser = (userId: string, id: number) =>
  prisma.habit.findFirst({ where: { id, userId } });

const createHabit = async (
  userId: string,
  data: Omit<Prisma.HabitCreateWithoutCheckInsInput, 'userId'>
) => {
  const habit = await prisma.habit.create({ data: { ...data, userId } });
  publishHabitEvent(userId, 'habit.created', habit);
  syncHabitToCalendar(userId, habit);
  return habit;
};

const updateHabit = async (userId: string, id: number, data: Prisma.HabitUpdateInput) => {
  const previous = await prisma.habit.findUnique({ where: { id } });
  const habit = await prisma.habit.update({ where: { id }, data });
  publishHabitEvent(userId, 'habit.updated', habit);
  syncHabitToCalendar(userId, habit);

  if (previous?.syncToCalendar && !habit.syncToCalendar) {
    prisma.calendarSync
      .findUnique({ where: { entityType_entityId: { entityType: CalendarEntityType.habit, entityId: id } } })
      .then((existingSync) => {
        if (existingSync) {
          return syncDelete(userId, CalendarEntityType.habit, id, existingSync.googleEventId);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to remove habit from calendar:', error);
      });
  }

  return habit;
};

const deleteHabit = async (userId: string, id: number) => {
  const existingSync = await prisma.calendarSync.findUnique({
    where: { entityType_entityId: { entityType: CalendarEntityType.habit, entityId: id } },
  });

  await prisma.habit.delete({ where: { id } });
  publishHabitEvent(userId, 'habit.deleted', { id });

  if (existingSync) {
    syncDelete(userId, CalendarEntityType.habit, id, existingSync.googleEventId).catch((error: unknown) => {
      console.error('Failed to sync habit deletion to calendar:', error);
    });
  }
};

const checkInHabit = async (userId: string, habit: Habit, date?: string | Date) => {
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
