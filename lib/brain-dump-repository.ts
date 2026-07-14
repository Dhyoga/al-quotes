import type { BrainDumpTheme } from '@prisma/client';
import prisma from './prisma.js';
import { publishBrainDumpEvent } from './pusher.js';

const listNotesForUser = (userId: string) =>
  prisma.brainDumpNote.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

const findNoteForUser = (userId: string, id: number) =>
  prisma.brainDumpNote.findFirst({ where: { id, userId } });

const createNote = async (userId: string, data: { theme: BrainDumpTheme; body: string }) => {
  const note = await prisma.brainDumpNote.create({ data: { ...data, userId } });
  publishBrainDumpEvent(userId, 'brainDump.created', note);
  return note;
};

const deleteNote = async (userId: string, id: number) => {
  await prisma.brainDumpNote.delete({ where: { id } });
  publishBrainDumpEvent(userId, 'brainDump.deleted', { id });
};

export { listNotesForUser, findNoteForUser, createNote, deleteNote };
