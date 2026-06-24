function getHealth(_request, response) {
  response.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}

export { getHealth };
