import prisma from './prisma.js';
import { publishTodoItemEvent } from './pusher.js';

const listItemsForUser = (userId: string) =>
  prisma.todoItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });

const findItemForUser = (userId: string, id: number) =>
  prisma.todoItem.findFirst({ where: { id, userId } });

const createItem = async (userId: string, text: string) => {
  const item = await prisma.todoItem.create({ data: { userId, text } });
  publishTodoItemEvent(userId, 'todoItem.created', item);
  return item;
};

const toggleItem = async (userId: string, id: number, done: boolean) => {
  const item = await prisma.todoItem.update({ where: { id }, data: { done } });
  publishTodoItemEvent(userId, 'todoItem.updated', item);
  return item;
};

const deleteItem = async (userId: string, id: number) => {
  await prisma.todoItem.delete({ where: { id } });
  publishTodoItemEvent(userId, 'todoItem.deleted', { id });
};

export { listItemsForUser, findItemForUser, createItem, toggleItem, deleteItem };
