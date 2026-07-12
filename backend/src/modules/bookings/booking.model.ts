import mongoose, { Schema, Document } from 'mongoose';
import { Asset } from '../assets/asset.model';

export type BookingStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface IBooking extends Document {
  resourceId: mongoose.Types.ObjectId; // must reference a bookable Asset
  userId: mongoose.Types.ObjectId;
  title: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    resourceId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'], default: 'Upcoming' },
  },
  { timestamps: true },
);

bookingSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });

// Enforce the isBookable invariant: bookings only for bookable assets.
bookingSchema.pre('save', async function () {
  const asset = await Asset.findById(this.resourceId);
  if (!asset) throw new Error('Resource not found');
  if (!asset.isBookable) throw new Error('Selected asset is not bookable');
});

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
