import * as eventImageService from "../services/event-image-service.js";
import { badRequest } from "../utils/http-error.js";

/** GET /api/events/:eventId/images */
export const list = async (request, response) => {
  const images = await eventImageService.listImages(request.params.eventId);
  response.status(200).json({ data: images });
};

/** POST /api/events/:eventId/images — multipart upload, field name "image". */
export const upload = async (request, response) => {
  if (!request.file) throw badRequest("IMAGE_REQUIRED", 'A file is required in the "image" field');

  const image = await eventImageService.addImage(
    request.params.eventId,
    request.user,
    request.file,
    request.body.isPoster,
  );
  response.status(201).json({ data: image });
};

/** DELETE /api/events/:eventId/images/:imageId */
export const remove = async (request, response) => {
  await eventImageService.removeImage(request.params.eventId, request.user, request.params.imageId);
  response.status(204).send();
};
