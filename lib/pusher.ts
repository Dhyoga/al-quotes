import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.app_id!,
  key: process.env.key!,
  secret: process.env.secret!,
  cluster: process.env.cluster!,
  useTLS: true,
});

const publish = (channel: string, event: string, payload: unknown): void => {
  pusher.trigger(channel, event, payload).catch((error: unknown) => {
    console.error(`Failed to publish Pusher event "${event}" on "${channel}":`, error);
  });
};

const publishTaskEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishHabitEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishCommentEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishEventEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishBrainDumpEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishPrayerCheckInEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishQuranProgressEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

const publishTodoItemEvent = (userId: string, event: string, payload: unknown): void => {
  publish(`private-user-${userId}`, event, payload);
};

export {
  pusher,
  publishTaskEvent,
  publishHabitEvent,
  publishCommentEvent,
  publishEventEvent,
  publishBrainDumpEvent,
  publishPrayerCheckInEvent,
  publishQuranProgressEvent,
  publishTodoItemEvent,
};
