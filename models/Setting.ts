import mongoose, { Schema, model, type InferSchemaType, type Model } from 'mongoose'

const settingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  at: Date,
  value: Schema.Types.Mixed,
})

export type SettingDoc = InferSchemaType<typeof settingSchema>
export const Setting = (mongoose.models.Setting as Model<SettingDoc>) || model<SettingDoc>('Setting', settingSchema)
