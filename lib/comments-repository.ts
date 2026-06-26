import prisma from './prisma.js';
import { publishCommentEvent } from './pusher.js';

const listCommentsForTask = (taskId: number) =>
  prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
  });

const createComment = async (userId: string, taskId: number, body: string) => {
  const comment = await prisma.comment.create({ data: { taskId, body } });
  publishCommentEvent(userId, 'comment.created', comment);
  return comment;
};

const updateComment = async (userId: string, taskId: number, commentId: number, body: string) => {
  const comment = await prisma.comment.update({ where: { id: commentId }, data: { body } });
  publishCommentEvent(userId, 'comment.updated', comment);
  return comment;
};

const deleteComment = async (userId: string, taskId: number, commentId: number) => {
  await prisma.comment.delete({ where: { id: commentId } });
  publishCommentEvent(userId, 'comment.deleted', { id: commentId, taskId });
};

export { listCommentsForTask, createComment, updateComment, deleteComment };
