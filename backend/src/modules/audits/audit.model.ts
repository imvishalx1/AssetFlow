import mongoose, { Schema, Document } from 'mongoose';

export type AuditResult = 'Pending' | 'Verified' | 'Missing' | 'Damaged';

export interface IAuditCycle extends Document {
  name: string;
  scopeType: 'Department' | 'Location';
  scopeValue: string;
  dateRange: { start: Date; end: Date };
  auditors: mongoose.Types.ObjectId[];
  status: 'Open' | 'Closed';
  locked: boolean; // set true on close; record becomes immutable
  items: { assetId: mongoose.Types.ObjectId; result: AuditResult; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const auditSchema = new Schema<IAuditCycle>(
  {
    name: { type: String, required: true, trim: true },
    scopeType: { type: String, enum: ['Department', 'Location'], required: true },
    scopeValue: { type: String, required: true },
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    auditors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    locked: { type: Boolean, default: false },
    items: [
      {
        assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
        result: {
          type: String,
          enum: ['Pending', 'Verified', 'Missing', 'Damaged'],
          default: 'Pending',
        },
        note: { type: String },
      },
    ],
  },
  { timestamps: true },
);

// Reject inverted date ranges (Finding: reject inverted audit date ranges).
auditSchema.path('dateRange').validate(function (value: { start: Date; end: Date }) {
  return new Date(value.end).getTime() >= new Date(value.start).getTime();
}, 'Audit end date must be on or after the start date');

// Model-level immutability guard: once a cycle is locked, no save may mutate it.
// The legitimate lock-setting save (false -> true) is permitted; any later edit
// by a code path that bypasses the service-layer check is rejected.
auditSchema.pre('save', function (this: IAuditCycle) {
  if (this.isNew) return;
  if (this.locked && !this.isModified('locked')) {
    throw new Error('Cannot modify a locked audit cycle');
  }
});

export const AuditCycle = mongoose.model<IAuditCycle>('AuditCycle', auditSchema);
