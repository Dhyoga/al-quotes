import { CalendarEntityType, type Event, type Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { publishEventEvent } from './pusher.js';
import { syncUpsert, syncDelete } from './calendar-sync.js';

const toCalendarPayload = (event: Event) => ({
  title: event.title,
  description: event.description,
  location: event.location,
  startAt: event.startAt,
  endAt: event.endAt,
  isRecurring: event.isRecurring,
  rrule: event.rrule,
});

const syncEventToCalendar = (userId: string, event: Event): void => {
  if (!event.syncToCalendar) return;
  syncUpsert(userId, CalendarEntityType.event, event.id, toCalendarPayload(event)).catch((error: unknown) => {
    console.error('Failed to sync event to calendar:', error);
  });
};

const listEventsForUser = (userId: string) =>
  prisma.event.findMany({ where: { userId }, orderBy: { startAt: 'asc' } });

const findEventForUser = (userId: string, id: number) =>
  prisma.event.findFirst({ where: { id, userId } });

const createEvent = async (userId: string, data: Omit<Prisma.EventCreateInput, 'userId'>) => {
  const event = await prisma.event.create({ data: { ...data, userId } });
  publishEventEvent(userId, 'event.created', event);
  syncEventToCalendar(userId, event);
  return event;
};

const updateEvent = async (userId: string, id: number, data: Prisma.EventUpdateInput) => {
  const event = await prisma.event.update({ where: { id }, data });
  publishEventEvent(userId, 'event.updated', event);
  syncEventToCalendar(userId, event);
  return event;
};

const deleteEvent = async (userId: string, id: number) => {
  const existingSync = await prisma.calendarSync.findUnique({
    where: { entityType_entityId: { entityType: CalendarEntityType.event, entityId: id } },
  });

  await prisma.event.delete({ where: { id } });
  publishEventEvent(userId, 'event.deleted', { id });

  if (existingSync) {
    syncDelete(userId, CalendarEntityType.event, id, existingSync.googleEventId).catch((error: unknown) => {
      console.error('Failed to sync event deletion to calendar:', error);
    });
  }
};

export { listEventsForUser, findEventForUser, createEvent, updateEvent, deleteEvent };
