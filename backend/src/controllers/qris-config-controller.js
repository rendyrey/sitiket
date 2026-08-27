import * as qrisConfigService from "../services/qris-config-service.js";

/** GET /api/qris-config — the current admin's own QRIS config, or null. */
export const getMine = async (request, response) => {
  const config = await qrisConfigService.getMine(request.user.sub);
  response.status(200).json({ data: config ?? null });
};

/** PUT /api/qris-config — create or replace (multipart: `qrisImage` + `merchantName`). */
export const save = async (request, response) => {
  const config = await qrisConfigService.save(request.user.sub, {
    merchantName: request.body.merchantName,
    file: request.file,
  });
  response.status(200).json({ data: config });
};

/** PATCH /api/qris-config — where the code is shown (ticket/merch checkout). */
export const update = async (request, response) => {
  const config = await qrisConfigService.updateChannels(request.user.sub, request.body);
  response.status(200).json({ data: config });
};

/** DELETE /api/qris-config */
export const remove = async (request, response) => {
  await qrisConfigService.remove(request.user.sub);
  response.status(200).json({ data: { removed: true } });
};
