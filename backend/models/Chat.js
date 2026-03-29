/**
 * Chat Model (One-to-one and Group chats)
 */
import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    // Group-specific fields
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groupAvatar: {
      type: String,
      default: '',
    },
    groupDescription: {
      type: String,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    // Muted participants
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Archived by
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Unread count per participant
    unreadCounts: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Index for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

export default mongoose.model('Chat', chatSchema);
