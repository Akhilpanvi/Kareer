import mongoose, { Schema, model, type InferSchemaType, type Model, type Types } from 'mongoose'

const project = new Schema(
  { title: String, description: String, tech: [String], url: String, repo: String, date: Date },
  { timestamps: true },
)
const certification = new Schema({ name: String, issuer: String, url: String, date: Date }, { timestamps: true })
const achievement = new Schema({ title: String, description: String, date: Date }, { timestamps: true })
const skill = new Schema({ name: String, rating: { type: Number, min: 1, max: 5, default: 3 } }, { _id: false })

const userSchema = new Schema(
  {
    regNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
    passwordHash: { type: String, select: false }, // absent = uploaded by admin, not yet registered
    sessionVersion: { type: Number, default: 0 },
    mustChangePassword: { type: Boolean, default: false },
    slug: { type: String, index: { unique: true, sparse: true } },
    publicProfile: { type: Boolean, default: true },
    registeredAt: Date,
    checkDay: { type: String, select: false },
    checkCount: { type: Number, select: false },
    active: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
    resetTokenHash: { type: String, select: false, index: { sparse: true } },
    resetTokenExpires: { type: Date, select: false },
    resetRequestedAt: Date,
    aiDay: { type: String, select: false },
    aiCount: { type: Number, select: false },
    aiAt: { type: Date, select: false },

    branch: String,
    batch: String,
    campus: String,
    section: String,
    phone: String,
    headline: String,
    bio: String,
    cgpa: Number,
    class10: Number, // X %
    class12: Number, // XII %
    backlogs: Number,
    links: { linkedin: String, portfolio: String, resume: String },

    // platform key -> username, e.g. { github: 'octocat' }
    handles: { type: Map, of: String, default: {} },
    skills: [skill],
    projects: [project],
    certifications: [certification],
    achievements: [achievement],

    // denormalised from PlatformStat for fast admin listing
    metrics: { type: Map, of: Number, default: {} },
    score: { type: Number, default: 0 },
  },
  { timestamps: true },
)

userSchema.index({ role: 1, score: -1 })
userSchema.index({ role: 1, branch: 1, batch: 1 })

export type UserDoc = Omit<InferSchemaType<typeof userSchema>, 'handles' | 'metrics'> & {
  _id: Types.ObjectId
  handles: Record<string, string>
  metrics: Record<string, number>
}
export const User = (mongoose.models.User as Model<UserDoc>) || model<UserDoc>('User', userSchema)
