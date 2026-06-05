import { Router } from 'express';
import { listWorkers, getWorker, postBooking, listMyBookings, deleteBooking } from '../../controllers/booking.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const bookingRouter = Router();

bookingRouter.get('/workers', listWorkers);
bookingRouter.get('/workers/:id', getWorker);

bookingRouter.use(requireAuth);
bookingRouter.post('/', postBooking);
bookingRouter.get('/my', listMyBookings);
bookingRouter.delete('/:id', deleteBooking);

export { bookingRouter };
