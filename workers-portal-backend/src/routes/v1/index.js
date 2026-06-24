import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { workerRouter } from './worker.routes.js';
import { vaultRouter } from './vault.routes.js';
import { bookingRouter } from './booking.routes.js';
import { feedbackRouter } from './feedback.routes.js';
import { grievanceRouter } from './grievance.routes.js';
import { adminRouter } from './admin.routes.js';

const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/workers', workerRouter);
v1Router.use('/vault', vaultRouter);
v1Router.use('/bookings', bookingRouter);
v1Router.use('/feedback', feedbackRouter);
v1Router.use('/grievances', grievanceRouter);
v1Router.use('/admin', adminRouter);

export { v1Router };
