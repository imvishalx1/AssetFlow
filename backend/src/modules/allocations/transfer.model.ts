import mongoose, { Schema, Document } from 'mongoose';

export type TransferStatus = 'Requested' | 'Approved' | 'Rejected';

export interface ITransfer extends Document {
  assetId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  status: TransferStatus;
  note?: string;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const transferSchema = new Schema<ITransfer>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Requested', 'Approved', 'Rejected'], default: 'Requested' },
    note: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Transfer = mongoose.model<ITransfer>('Transfer', transferSchema);
