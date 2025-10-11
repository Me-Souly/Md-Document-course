const mongoose = require('mongoose');
const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 'user','moderator','admin'
  permissions: { type: [String], default: [] } // опционально: ['delete_public_notes', ...]
}, { timestamps: true });
module.exports = mongoose.model('Role', RoleSchema);