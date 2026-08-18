import * as organizerEmailConfigService from "../services/organizer-email-config-service.js";

/** GET /api/email-config — the current admin's own email config (password omitted), or null. */
export const getMine = async (request, response) => {
  const config = await organizerEmailConfigService.getMine(request.user.sub);
  response.status(200).json({ data: config ?? null });
};

/** PUT /api/email-config — create or replace a custom-SMTP config; verifies the login before saving. */
export const save = async (request, response) => {
  const config = await organizerEmailConfigService.save(request.user.sub, request.body);
  response.status(200).json({ data: config });
};

/** POST /api/email-config/google — finish the "Connect Gmail" OAuth flow with the consent redirect's code. */
export const connectGoogle = async (request, response) => {
  const config = await organizerEmailConfigService.connectGoogle(request.user.sub, request.body);
  response.status(200).json({ data: config });
};
