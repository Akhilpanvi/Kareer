import mongoose, { Schema, model, type InferSchemaType, type Model, type Types } from 'mongoose'

const statSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true },
    handle: { type: String, required: true },
    status: { type: String, enum: ['pending', 'ok', 'not_found', 'error'], default: 'pending' },
    error: String,
    data: Schema.Types.Mixed,
    metrics: Schema.Types.Mixed,
    history: [{ _id: false, at: Date, value: Number }],
    fetchedAt: Date,
    checkedAt: { type: Date, default: () => new Date(0), index: true },
  },
  { minimize: false },
)

statSchema.index({ user: 1, platform: 1 }, { unique: true })

export type StatDoc = InferSchemaType<typeof statSchema> & { _id: Types.ObjectId }
export const PlatformStat = (mongoose.models.PlatformStat as Model<StatDoc>) || model<StatDoc>('PlatformStat', statSchema)
