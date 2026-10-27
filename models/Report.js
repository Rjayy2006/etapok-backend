const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    wasteType: {
      type: String,
      enum: ['Malata', 'Dili Malata'],
      default: 'Malata',
    },
    locationName: {
      type: String,
      default: 'Unspecified Location',
    },
    lat: {
      type: Number,
      default: 10.3157,
    },
    lng: {
      type: Number,
      default: 123.8854,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    barangay: {
      type: String,
      default: 'Barangay Central',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Collected'],
      default: 'Pending',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'Anonymous Resident',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);