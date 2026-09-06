import { HttpError } from "../utils/http-error.js";

/**
 * Central Express error middleware. Converts a thrown {@link HttpError} into
 * its intended status/body; anything else is logged and reduced to an opaque
 * 500 so internals (stack traces, driver errors) never reach the client.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, request, response, next) => {
  // A streaming response (e.g. an /uploads image) has already sent its status
  // and headers, so no error body can be written any more. The usual cause is
  // a client that navigated away mid-download — not something to log or dress
  // up as a 500; just drop the half-written connection.
  if (response.headersSent) {
    response.destroy();
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong", details: undefined },
  });
};
