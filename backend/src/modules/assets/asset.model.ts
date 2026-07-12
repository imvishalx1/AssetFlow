import mongoose, { Schema, Document } from 'mongoose';
import { AssetStatus, ASSET_STATUSES } from '../../services/stateMachine';

export interface IAsset extends Document {
  tag: string;
  tagNumber: number;
  name: string;
  categoryId: mongoose.Types.ObjectId;
  serialNumber?: string;
  acquisitionDate?: Date;
  acquisitionCost?: number; // integer only — analytics/ranking (Pillar 4). NOT financial/billing.
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
  location?: string;
  status: AssetStatus;
  isBookable: boolean;
  departmentId?: mongoose.Types.ObjectId | null;
  history: { type: string; note?: string; by?: string; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    tag: { type: String, required: true, unique: true },
    tagNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    serialNumber: { type: String },
    acquisitionDate: { type: Date },
    acquisitionCost: { type: Number, default: 0, min: 0 }, // integer, analytics only (Pillar 4)
    condition: { type: String, enum: ['New', 'Good', 'Fair', 'Poor'], default: 'New' },
    location: { type: String },
    status: { type: String, enum: ASSET_STATUSES, default: 'Available' },
    isBookable: { type: Boolean, default: false },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    history: [
      {
        type: { type: String, required: true },
        note: { type: String },
        by: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

assetSchema.index({ tag: 1 });
assetSchema.index({ tagNumber: -1 });

export const Asset = mongoose.model<IAsset>('Asset', assetSchema);
