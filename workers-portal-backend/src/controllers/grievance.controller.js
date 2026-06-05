import { createGrievance, getCustomerGrievances } from '../services/grievance.service.js';

async function postGrievance(request, response) {
  const { workerId, bookingId, subject, description } = request.body;
  if (!subject || !description) {
    return response.status(400).json({ error: 'subject and description are required.' });
  }
  try {
    const grievance = createGrievance({
      customerId: request.user.userId,
      workerId: workerId ?? null,
      bookingId: bookingId ?? null,
      subject: String(subject),
      description: String(description),
    });
    response.status(201).json({ grievance });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

async function getMyGrievances(request, response) {
  try {
    const grievances = getCustomerGrievances(request.user.userId);
    response.json({ grievances });
  } catch (err) {
    response.status(500).json({ error: err.message });
  }
}

export { postGrievance, getMyGrievances };
