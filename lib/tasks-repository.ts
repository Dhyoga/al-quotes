import { TaskStatus, CalendarEntityType, type Task, type Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { publishTaskEvent } from './pusher.js';
import { syncUpsert, syncDelete } from './calendar-sync.js';

const toCalendarPayload = (task: Task) => ({
  title: task.title,
  description: task.description,
  startDate: task.startDate?.toISOString() ?? null,
  dueDate: task.dueDate?.toISOString() ?? null,
  priority: task.priority,
  status: task.status,
});

const syncTaskToCalendar = (userId: string, task: Task, previousSyncToCalendar?: boolean): void => {
  if (task.syncToCalendar) {
    syncUpsert(userId, CalendarEntityType.task, task.id, toCalendarPayload(task)).catch((error: unknown) => {
      console.error('Failed to sync task to calendar:', error);
    });
    return;
  }

  // Flag was just turned off: remove the event it previously had, if any,
  // so it doesn't linger stale in the user's calendar.
  if (previousSyncToCalendar) {
    prisma.calendarSync
      .findUnique({ where: { entityType_entityId: { entityType: CalendarEntityType.task, entityId: task.id } } })
      .then((existingSync) => {
        if (existingSync) {
          return syncDelete(userId, CalendarEntityType.task, task.id, existingSync.googleEventId);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to remove task from calendar:', error);
      });
  }
};

const listTasksForUser = (userId: string) =>
  prisma.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
  });

const findTaskForUser = (userId: string, id: number) =>
  prisma.task.findFirst({ where: { id, userId } });

const nextPosition = async (userId: string, status: TaskStatus): Promise<number> => {
  const last = await prisma.task.findFirst({
    where: { userId, status },
    orderBy: { position: 'desc' },
  });
  return (last?.position ?? 0) + 1;
};

interface CreateTaskInput {
  title: string;
  description?: string | null;
  startDate?: Date;
  dueDate?: Date;
  priority?: Prisma.TaskCreateInput['priority'];
  syncToCalendar?: boolean;
}

const createTask = async (userId: string, input: CreateTaskInput) => {
  const position = await nextPosition(userId, TaskStatus.TODO);
  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      dueDate: input.dueDate,
      priority: input.priority,
      status: TaskStatus.TODO,
      position,
      syncToCalendar: input.syncToCalendar ?? false,
    },
  });
  publishTaskEvent(userId, 'task.created', task);
  syncTaskToCalendar(userId, task);
  return task;
};

interface UpdateTaskInput {
  data: Prisma.TaskUpdateInput;
  statusTransition?: { fromStatus: TaskStatus; toStatus: TaskStatus };
  previousSyncToCalendar?: boolean;
}

const updateTask = async (
  userId: string,
  id: number,
  { data, statusTransition, previousSyncToCalendar }: UpdateTaskInput
) => {
  let task;
  if (statusTransition) {
    task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: { ...data, status: statusTransition.toStatus },
      });
      await tx.taskStatusHistory.create({
        data: {
          taskId: id,
          fromStatus: statusTransition.fromStatus,
          toStatus: statusTransition.toStatus,
        },
      });
      return updated;
    });
  } else {
    task = await prisma.task.update({ where: { id }, data });
  }
  publishTaskEvent(userId, 'task.updated', task);
  syncTaskToCalendar(userId, task, previousSyncToCalendar);
  return task;
};

const deleteTask = async (userId: string, id: number) => {
  const existingSync = await prisma.calendarSync.findUnique({
    where: { entityType_entityId: { entityType: CalendarEntityType.task, entityId: id } },
  });

  await prisma.task.delete({ where: { id } });
  publishTaskEvent(userId, 'task.deleted', { id });

  if (existingSync) {
    syncDelete(userId, CalendarEntityType.task, id, existingSync.googleEventId).catch((error: unknown) => {
      console.error('Failed to sync task deletion to calendar:', error);
    });
  }
};

export { listTasksForUser, findTaskForUser, createTask, updateTask, deleteTask };
