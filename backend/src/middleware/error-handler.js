import { HttpError } from "../utils/http-error.js";

/**
 * Central Express error middleware. Converts a thrown {@link HttpError} into
 * its intended status/body; anything else is logged and reduced to an opaque
 * 500 so internals (stack traces, driver errors) never reach the client.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, request, response, next) => {
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
