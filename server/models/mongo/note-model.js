// models/note.js
const { Schema, model } = require('mongoose');

const NoteSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },   // raw markdown
  rendered: { type: String, default: '' },  // cached sanitized HTML (опц.)
  parentId: { type: Schema.Types.ObjectId, ref: 'Note', default: null },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  isPublic: { type: Boolean, default: false },
  isReadOnly: { type: Boolean, default: true }, // по твоему желанию
  allowCopy: { type: Boolean, default: true },
  access: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['read','edit'], default: 'read' },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  version: { type: Number, default: 1 },
  meta: {
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
    excerpt: { type: String, default: '' }
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Индексы
NoteSchema.index({ ownerId: 1, updatedAt: -1 });
NoteSchema.index({ isPublic: 1, updatedAt: -1 });
NoteSchema.index({ parentId: 1 });

module.exports = model('Note', NoteSchema);
