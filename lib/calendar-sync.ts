import { Client } from '@upstash/qstash';
import { CalendarEntityType, HabitFrequency } from '@prisma/client';
import prisma from './prisma.js';
import { refreshGoogleAccessToken } from './google-calendar.js';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

const RRULE_BY_FREQUENCY: Record<HabitFrequency, string> = {
  [HabitFrequency.daily]: 'RRULE:FREQ=DAILY',
  [HabitFrequency.weekly]: 'RRULE:FREQ=WEEKLY',
};

// Fire-and-forget: a failure to publish must never propagate into the
// Task/Habit mutation that triggered it (see lib/pusher.ts for the same pattern).
const publishCalendarSync = (payload: Record<string, unknown>): void => {
  const url = process.env.CALENDAR_WEBHOOK_URL;
  const secret = process.env.WEBHOOK_SECRET;

  if (!url || !secret) {
    console.error('Calendar sync not configured: missing CALENDAR_WEBHOOK_URL or WEBHOOK_SECRET');
    return;
  }

  qstash
    .publishJSON({ url, body: payload, headers: { 'X-Webhook-Secret': secret } })
    .catch((error: unknown) => {
      console.error('Failed to publish calendar sync job:', error);
    });
};

const syncUpsert = async (
  userId: string,
  entityType: CalendarEntityType,
  entityId: number,
  entityPayload: Record<string, unknown>
): Promise<void> => {
  const link = await prisma.googleCalendarLink.findUnique({ where: { userId } });
  if (!link) return;

  const [refreshed, sync] = await Promise.all([
    refreshGoogleAccessToken(link.refreshToken),
    prisma.calendarSync.findUnique({ where: { entityType_entityId: { entityType, entityId } } }),
  ]);
  if (!refreshed) return;

  publishCalendarSync({
    event: `${entityType}.upserted`,
    entityType,
    entityId,
    googleEventId: sync?.googleEventId ?? null,
    googleAccessToken: refreshed.accessToken,
    calendarId: link.calendarId,
    [entityType]: entityPayload,
  });
};

// googleEventId is passed in by the caller, snapshotted before the Task/Habit
// row was deleted, since CalendarSync isn't foreign-keyed to either.
const syncDelete = async (
  userId: string,
  entityType: CalendarEntityType,
  entityId: number,
  googleEventId: string
): Promise<void> => {
  const link = await prisma.googleCalendarLink.findUnique({ where: { userId } });
  if (!link) return;

  const refreshed = await refreshGoogleAccessToken(link.refreshToken);
  if (!refreshed) return;

  publishCalendarSync({
    event: `${entityType}.deleted`,
    entityType,
    entityId,
    googleEventId,
    googleAccessToken: refreshed.accessToken,
    calendarId: link.calendarId,
  });
};

export { syncUpsert, syncDelete, RRULE_BY_FREQUENCY };
