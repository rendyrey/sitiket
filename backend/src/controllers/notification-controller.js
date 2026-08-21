import * as webNotificationService from "../services/web-notification-service.js";

/** GET /api/notifications — the caller's latest bell notifications + unread count. */
export const list = async (request, response) => {
  const { rows, unreadCount } = await webNotificationService.listForUser(request.user.sub, {
    unreadOnly: request.query.unreadOnly,
    limit: request.query.limit,
  });
  response.status(200).json({ data: rows, meta: { unreadCount } });
};

/** GET /api/notifications/unread-count — cheap badge poll. */
export const unreadCount = async (request, response) => {
  const count = await webNotificationService.getUnreadCount(request.user.sub);
  response.status(200).json({ data: { unreadCount: count } });
};

/** POST /api/notifications/read — mark the given ids (or everything) read. */
export const markRead = async (request, response) => {
  await webNotificationService.markRead(request.user.sub, request.body.ids);
  const count = await webNotificationService.getUnreadCount(request.user.sub);
  response.status(200).json({ data: { unreadCount: count } });
};
