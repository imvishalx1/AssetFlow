import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { mongoId } from '../../utils/validators';
import * as controller from './booking.controller';
import { createBookingSchema } from './booking.schema';

const router = Router();

router.use(requireAuth); // any logged-in user may book shared resources

router.get('/', asyncHandler(controller.listBookings));
router.post('/', validate(createBookingSchema), asyncHandler(controller.createBookingHandler));
router.post(
  '/:id/cancel',
  validate(z.object({ id: mongoId }), 'params'),
  asyncHandler(controller.cancelBooking),
);

export default router;
