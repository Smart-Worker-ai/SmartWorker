import { Router } from 'express';
import { fetchProfile, fetchEarnings, fetchHistory } from '../../controllers/worker.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const workerRouter = Router();

workerRouter.use(requireAuth);
workerRouter.get('/profile', fetchProfile);
workerRouter.get('/earnings', fetchEarnings);
workerRouter.get('/history', fetchHistory);

export { workerRouter };
