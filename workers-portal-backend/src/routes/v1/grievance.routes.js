import { Router } from 'express';
import { postGrievance, getMyGrievances } from '../../controllers/grievance.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const grievanceRouter = Router();

grievanceRouter.post('/', requireAuth, postGrievance);
grievanceRouter.get('/my', requireAuth, getMyGrievances);

export { grievanceRouter };
