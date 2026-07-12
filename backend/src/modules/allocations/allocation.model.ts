import mongoose, { Schema, Document } from 'mongoose';

export type AllocationStatus = 'Active' | 'Returned' | 'Transferred';

export interface IAllocation extends Document {
  assetId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId | null;
  expectedReturnDate?: Date | null;
  status: AllocationStatus;
  checkInNotes?: string;
  allocatedAt: Date;
  returnedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IAllocation>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    expectedReturnDate: { type: Date, default: null },
    status: { type: String, enum: ['Active', 'Returned', 'Transferred'], default: 'Active' },
    checkInNotes: { type: String },
    allocatedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Allocation = mongoose.model<IAllocation>('Allocation', allocationSchema);
