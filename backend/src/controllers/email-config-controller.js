import * as organizerEmailConfigService from "../services/organizer-email-config-service.js";

/** GET /api/email-config — the current admin's own email config (password omitted), or null. */
export const getMine = async (request, response) => {
  const config = await organizerEmailConfigService.getMine(request.user.sub);
  response.status(200).json({ data: config ?? null });
};

/** PUT /api/email-config — create or replace; verifies the SMTP login before saving. */
export const save = async (request, response) => {
  const config = await organizerEmailConfigService.save(request.user.sub, request.body);
  response.status(200).json({ data: config });
};
