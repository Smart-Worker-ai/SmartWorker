import {
  getWorkers,
  getWorkerById,
  getWorkerBookedDates,
  createBooking,
  getCustomerBookings,
  cancelBooking,
} from '../services/booking.service.js';

function listWorkers(request, response) {
  const { district, town, jobType } = request.query;
  const workers = getWorkers({ district, town, jobType });
  response.json({ workers });
}

function getWorker(request, response) {
  const worker = getWorkerById(request.params.id);
  if (!worker) return response.status(404).json({ error: 'Worker not found.' });
  const bookedDates = getWorkerBookedDates(request.params.id);
  response.json({ worker: { ...worker, bookedDates } });
}

function postBooking(request, response) {
  const { workerId, date, numberOfDays, address, notes } = request.body;
  if (!workerId || !date || !numberOfDays || !address) {
    return response.status(400).json({ error: 'workerId, date, numberOfDays, and address are required.' });
  }
  try {
    const booking = createBooking({
      customerId: request.user.userId,
      workerId,
      date,
      numberOfDays,
      address,
      notes,
    });
    response.status(201).json({ booking });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

function listMyBookings(request, response) {
  const bookings = getCustomerBookings(request.user.userId);
  response.json({ bookings });
}

function deleteBooking(request, response) {
  try {
    const booking = cancelBooking(request.params.id, request.user.userId);
    response.json({ booking });
  } catch (err) {
    response.status(err.statusCode ?? 500).json({ error: err.message });
  }
}

export { listWorkers, getWorker, postBooking, listMyBookings, deleteBooking };
