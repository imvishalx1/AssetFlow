import mongoose, { Schema, Document } from 'mongoose';

export type MaintenanceStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Technician Assigned'
  | 'In Progress'
  | 'Resolved';

export interface IMaintenance extends Document {
  assetId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  photos: string[];
  status: MaintenanceStatus;
  technician?: string;
  assignedAt?: Date | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceSchema = new Schema<IMaintenance>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    photos: [{ type: String }],
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    technician: { type: String },
    assignedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Maintenance = mongoose.model<IMaintenance>('Maintenance', maintenanceSchema);
