import * as eventAttendanceService from "../services/event-attendance-service.js";

/** GET /api/events/:eventId/attendance */
export const get = async (request, response) => {
  const report = await eventAttendanceService.getAttendanceReport(request.params.eventId, request.user);
  response.status(200).json({ data: report });
};
