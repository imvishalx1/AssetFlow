import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import * as controller from './auth.controller';
import { signupSchema, loginSchema } from './auth.schema';

const router = Router();

router.post('/signup', validate(signupSchema), asyncHandler(controller.signup));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.post('/refresh', asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

export default router;
