function apiErrorHandler(error, _request, response, _next) {
  console.error(error);

  const status = error.statusCode ?? 500;
  const message = status < 500 ? error.message : 'Internal server error';

  response.status(status).json({ message });
}

export { apiErrorHandler };
