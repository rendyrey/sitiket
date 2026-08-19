import { imageSize } from "image-size";
import * as eventImagesRepository from "../repositories/event-images-repository.js";
import { getOwnedEventOrThrow } from "./event-service.js";
import { badRequest, notFound } from "../utils/http-error.js";

// Instagram feed (square), portrait feed, and story resolutions — see
// docs/business/DATABASE_DESIGN.md §4.4. 1080x1350 is Instagram's 4:5 portrait
// feed size and the one that fits best: the event detail hero and event cards
// both render the poster in an `aspect-[4/5]` frame, so a 1080x1350 artwork
// fills it with no cropping at all.
const POSTER_RESOLUTIONS = [
  { label: "Instagram feed (1080x1080)", width: 1080, height: 1080 },
  { label: "Instagram portrait (1080x1350)", width: 1080, height: 1350 },
  { label: "Instagram story (1080x1920)", width: 1080, height: 1920 },
];

/** @param {string} eventId */
export const listImages = (eventId) => eventImagesRepository.listByEvent(eventId);

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {{ path: string, filename: string }} file - the multer-saved file
 * @param {boolean} isPoster
 */
export const addImage = async (eventId, requester, file, isPoster) => {
  await getOwnedEventOrThrow(eventId, requester);

  const { width, height } = imageSize(file.path);

  if (isPoster && !POSTER_RESOLUTIONS.some((resolution) => resolution.width === width && resolution.height === height)) {
    const labels = POSTER_RESOLUTIONS.map((resolution) => resolution.label);
    const allowed = `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}`;
    throw badRequest(
      "INVALID_POSTER_RESOLUTION",
      `Poster image is ${width}x${height}; it must be exactly ${allowed}`,
    );
  }

  return eventImagesRepository.create({
    eventId,
    imageUrl: `/uploads/${file.filename}`,
    isPoster,
    width,
    height,
  });
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} imageId
 */
export const removeImage = async (eventId, requester, imageId) => {
  await getOwnedEventOrThrow(eventId, requester);

  const image = await eventImagesRepository.findById(imageId);
  if (!image || image.event_id !== eventId) throw notFound("IMAGE_NOT_FOUND", "Event image not found");

  await eventImagesRepository.remove(imageId);
};
