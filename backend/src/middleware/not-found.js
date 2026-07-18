/** Terminal handler for any request that matched no route. */
export const notFoundHandler = (request, response) => {
  response.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: `No route for ${request.method} ${request.originalUrl}` },
  });
};
