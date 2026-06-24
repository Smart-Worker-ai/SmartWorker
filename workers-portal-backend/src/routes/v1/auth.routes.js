import { Router } from 'express';
import {
  postSendOtp, postVerifyOtp, postCompleteProfile,
  postRegisterEmail, postLoginEmail, postVerifyFirebasePhone,
} from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const authRouter = Router();

authRouter.post('/send-otp', postSendOtp);
authRouter.post('/verify-otp', postVerifyOtp);
authRouter.post('/verify-firebase-phone', postVerifyFirebasePhone);
authRouter.post('/complete-profile', requireAuth, postCompleteProfile);
authRouter.post('/register-email', postRegisterEmail);
authRouter.post('/login-email', postLoginEmail);

export { authRouter };
