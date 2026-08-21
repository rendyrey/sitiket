import * as notificationsRepository from "../repositories/notifications-repository.js";

/**
 * Fire-and-log creation of an in-app notification (the header bell) — like
 * email in notification-service.js, a notification failing to write must
 * never fail the state change it announces (the order/payment it belongs to
 * is already committed).
 * @param {{ userId: string, type: string, title: string, body: string, href?: string }} input
 */
export const pushNotification = async (input) => {
  try {
    await notificationsRepository.create(input);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[web-notification] failed to write "${input.type}" for user ${input.userId}:`, error.message);
  }
};

/**
 * @param {string} userId
 * @param {{ unreadOnly?: boolean, limit?: number }} [options]
 */
export const listForUser = async (userId, options) => {
  const [rows, unreadCount] = await Promise.all([
    notificationsRepository.listByUser(userId, options),
    notificationsRepository.countUnread(userId),
  ]);
  return { rows, unreadCount };
};

/** @param {string} userId */
export const getUnreadCount = (userId) => notificationsRepository.countUnread(userId);

/**
 * @param {string} userId
 * @param {string[]} [ids] - omitted, everything unread is marked read
 */
export const markRead = (userId, ids) =>
  ids?.length ? notificationsRepository.markRead(userId, ids) : notificationsRepository.markAllRead(userId);
