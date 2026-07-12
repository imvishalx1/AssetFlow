import mongoose, { Schema, Document } from 'mongoose';

// Immutable system audit trail. No update/delete routes are exposed for any role.
export interface IActivityLog extends Document {
  actorId?: mongoose.Types.ObjectId | null;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    target: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
