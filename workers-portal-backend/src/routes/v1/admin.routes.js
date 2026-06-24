import { Router } from 'express';
import { env } from '../../config/env.js';
import {
  getStats,
  listCustomers, blockCustomer, unblockCustomer, removeCustomer,
  listWorkers, addWorker, blockWorker, unblockWorker, verifyWorker, removeWorker,
  listBookings,
  listGrievances, patchGrievance,
} from '../../controllers/admin.controller.js';

const adminRouter = Router();

// Simple secret-key guard for admin routes
adminRouter.use((req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== env.adminSecret) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  next();
});

adminRouter.get('/stats', getStats);

adminRouter.get('/customers', listCustomers);
adminRouter.post('/customers/:id/block', blockCustomer);
adminRouter.post('/customers/:id/unblock', unblockCustomer);
adminRouter.delete('/customers/:id', removeCustomer);

adminRouter.get('/workers', listWorkers);
adminRouter.post('/workers', addWorker);
adminRouter.delete('/workers/:id', removeWorker);
adminRouter.post('/workers/:id/block', blockWorker);
adminRouter.post('/workers/:id/unblock', unblockWorker);
adminRouter.post('/workers/:id/verify', verifyWorker);

adminRouter.get('/bookings', listBookings);

adminRouter.get('/grievances', listGrievances);
adminRouter.patch('/grievances/:id', patchGrievance);

export { adminRouter };
