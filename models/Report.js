const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  wasteType: { type: String, enum: ['Malata', 'Dili Malata'], required: true },
  status: { type: String, enum: ['Pending', 'Collected', 'Cancelled'], default: 'Pending' },
  addressText: { type: String, required: true },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  aiAssisted: { type: Boolean, default: false },
  collectedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);