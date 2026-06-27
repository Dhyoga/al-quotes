import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Priority, TaskStatus, type Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { findTaskForUser, createTask, updateTask } from './tasks-repository.js';
import { listHabitsForUser, findHabitForUser, checkInHabit } from './habits-repository.js';
import { computePeriodStart } from './period.js';

const VALID_STATUS = Object.values(TaskStatus) as [string, ...string[]];
const VALID_PRIORITY = Object.values(Priority) as [string, ...string[]];

const toolError = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  isError: true,
});

const toolResult = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

const registerTools = (server: McpServer, userId: string): void => {
  server.registerTool(
    'list_tasks',
    {
      description: "List the user's tasks, optionally filtered by status or due date range.",
      inputSchema: {
        status: z.enum(VALID_STATUS).optional(),
        dueBefore: z.string().datetime().optional(),
        dueAfter: z.string().datetime().optional(),
      },
    },
    async ({ status, dueBefore, dueAfter }) => {
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          ...(status ? { status: status as TaskStatus } : {}),
          ...(dueBefore || dueAfter
            ? {
                dueDate: {
                  ...(dueBefore ? { lte: new Date(dueBefore) } : {}),
                  ...(dueAfter ? { gte: new Date(dueAfter) } : {}),
                },
              }
            : {}),
        },
        orderBy: [{ status: 'asc' }, { position: 'asc' }],
      });
      return toolResult(tasks);
    }
  );

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task for the user.',
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string().datetime().optional(),
        dueDate: z.string().datetime().optional(),
        priority: z.enum(VALID_PRIORITY).optional(),
        syncToCalendar: z.boolean().optional(),
      },
    },
    async ({ title, description, startDate, dueDate, priority, syncToCalendar }) => {
      const task = await createTask(userId, {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority as Priority | undefined,
        syncToCalendar,
      });
      return toolResult(task);
    }
  );

  server.registerTool(
    'update_task',
    {
      description: 'Update one or more fields of an existing task, including its status.',
      inputSchema: {
        id: z.number().int(),
        title: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().datetime().nullable().optional(),
        dueDate: z.string().datetime().nullable().optional(),
        priority: z.enum(VALID_PRIORITY).nullable().optional(),
        status: z.enum(VALID_STATUS).optional(),
        syncToCalendar: z.boolean().optional(),
      },
    },
    async ({ id, title, description, startDate, dueDate, priority, status, syncToCalendar }) => {
      const existing = await findTaskForUser(userId, id);
      if (!existing) return toolError(`No task found with id ${id}.`);

      const data: Prisma.TaskUpdateInput = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (priority !== undefined) data.priority = priority as Priority | null;
      if (syncToCalendar !== undefined) data.syncToCalendar = syncToCalendar;

      const task = await updateTask(userId, id, {
        data,
        statusTransition:
          status !== undefined && status !== existing.status
            ? { fromStatus: existing.status, toStatus: status as TaskStatus }
            : undefined,
        previousSyncToCalendar: existing.syncToCalendar,
      });
      return toolResult(task);
    }
  );

  server.registerTool(
    'list_habits',
    { description: "List the user's habits." },
    async () => toolResult(await listHabitsForUser(userId))
  );

  server.registerTool(
    'check_in_habit',
    {
      description: "Record a check-in for one of the user's habits for the current period.",
      inputSchema: { habitId: z.number().int(), date: z.string().datetime().optional() },
    },
    async ({ habitId, date }) => {
      const habit = await findHabitForUser(userId, habitId);
      if (!habit) return toolError(`No habit found with id ${habitId}.`);

      const checkIn = await checkInHabit(userId, habit, date ? new Date(date) : undefined);
      return toolResult(checkIn);
    }
  );

  server.registerTool(
    'get_today_overview',
    {
      description:
        "Get the user's tasks due today and habits not yet checked in for the current period, combined in one response.",
    },
    async () => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

      const [tasksDueToday, habits] = await Promise.all([
        prisma.task.findMany({
          where: { userId, dueDate: { gte: startOfDay, lt: endOfDay } },
          orderBy: [{ status: 'asc' }, { position: 'asc' }],
        }),
        listHabitsForUser(userId),
      ]);

      const habitsPendingCheckIn = (
        await Promise.all(
          habits.map(async (habit) => {
            const periodStart = computePeriodStart(habit.frequency, now);
            const checkIn = await prisma.habitCheckIn.findUnique({
              where: { habitId_periodStart: { habitId: habit.id, periodStart } },
            });
            return checkIn ? null : habit;
          })
        )
      ).filter((habit): habit is NonNullable<typeof habit> => habit !== null);

      return toolResult({ tasksDueToday, habitsPendingCheckIn });
    }
  );
};

export { registerTools };
