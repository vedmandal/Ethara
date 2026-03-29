import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [500, 'Status text cannot exceed 500 characters'],
      default: '',
    },
    media: {
      url: { type: String, default: '' },
      type: { type: String, enum: ['', 'image', 'video', 'document'], default: '' },
      name: { type: String, default: '' },
      size: { type: Number, default: 0 },
    },
    background: {
      type: String,
      default: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    },
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

statusSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Status', statusSchema);
