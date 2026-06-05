import { submitFeedback, getWorkerFeedback } from '../services/feedback.service.js';

function postFeedback(request, response) {
  const { workerId, bookingId, rating, comment } = request.body;

  if (!workerId || !rating) {
    return response.status(400).json({ message: 'workerId and rating are required.' });
  }

  try {
    const result = submitFeedback({
      customerId: request.user.userId,
      workerId,
      bookingId,
      rating,
      comment,
    });
    response.status(201).json(result);
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ message: err.message });
  }
}

function listFeedback(request, response) {
  const { workerId } = request.params;
  const feedback = getWorkerFeedback(workerId);
  response.json({ feedback });
}

export { postFeedback, listFeedback };
