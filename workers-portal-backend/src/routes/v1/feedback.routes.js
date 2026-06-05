import { Router } from 'express';
import { postFeedback, listFeedback } from '../../controllers/feedback.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const feedbackRouter = Router();

feedbackRouter.get('/worker/:workerId', listFeedback);   // public — anyone can read reviews
feedbackRouter.post('/', requireAuth, postFeedback);     // protected — must be logged in to rate

export { feedbackRouter };
