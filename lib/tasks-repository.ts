import { TaskStatus, type Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { publishTaskEvent } from './pusher.js';

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
    },
  });
  publishTaskEvent(userId, 'task.created', task);
  return task;
};

interface UpdateTaskInput {
  data: Prisma.TaskUpdateInput;
  statusTransition?: { fromStatus: TaskStatus; toStatus: TaskStatus };
}

const updateTask = async (userId: string, id: number, { data, statusTransition }: UpdateTaskInput) => {
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
  return task;
};

const deleteTask = async (userId: string, id: number) => {
  await prisma.task.delete({ where: { id } });
  publishTaskEvent(userId, 'task.deleted', { id });
};

export { listTasksForUser, findTaskForUser, createTask, updateTask, deleteTask };
