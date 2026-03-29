/**
 * Message Model
 */
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Message content
    content: {
      type: String,
      trim: true,
      default: '',
    },
    // Media attachment
    media: {
      url: { type: String, default: '' },
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document', 'voice'],
        default: null,
      },
      name: { type: String, default: '' },
      size: { type: Number, default: 0 },
      duration: { type: Number, default: 0 }, // For audio/video in seconds
      thumbnail: { type: String, default: '' }, // For video thumbnails
    },
    // Message type
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'voice', 'system'],
      default: 'text',
    },
    // Message status (for 1-1 chats)
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    // For group chats - per-user read receipts
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    deliveredTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Edit history
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    // Deleted status
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    // Reactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    // System message info (e.g., "John added Mary to the group")
    systemInfo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

export default mongoose.model('Message', messageSchema);
