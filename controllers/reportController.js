const Report = require('../models/Report');

/**
 * GET /api/e-tapok/reports
 * Retrieve all reports sorted newest first
 */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.status(200).json(reports);
  } catch (err) {
    console.error('SERVER ERROR IN GET ALL REPORTS:', err);
    return res.status(500).json({
      message: 'Failed to retrieve reports from database.',
      error: err.message,
    });
  }
};

/**
 * POST /api/e-tapok/reports
 * Create a new waste report with safe fallbacks
 */
exports.createReport = async (req, res) => {
  try {
    const { description, wasteType, locationName, imageUrl, barangay, userName } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Waste description is required.' });
    }

    const validWasteTypes = ['Malata', 'Dili Malata'];
    const normalizedWasteType = validWasteTypes.includes(wasteType) ? wasteType : 'Malata';

    const newReport = new Report({
      description: description.trim(),
      wasteType: normalizedWasteType,
      locationName: locationName || 'Unspecified Location',
      imageUrl: imageUrl || '',
      barangay: barangay || req.user?.barangay || 'Barangay Central',
      userId: req.user?._id || null,
      userName: userName || req.user?.name || 'Anonymous Resident',
      status: 'Pending',
    });

    const savedReport = await newReport.save();

    if (req.io && typeof req.io.emit === 'function') {
      req.io.emit('report_created', savedReport);
    }

    return res.status(201).json(savedReport);
  } catch (err) {
    console.error('SERVER ERROR IN CREATE REPORT:', err);
    return res.status(500).json({
      message: 'Server error while creating report.',
      error: err.message,
    });
  }
};

/**
 * PUT /api/e-tapok/reports/:id/status
 * Update report collection status
 */
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Collected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    if (req.io && typeof req.io.emit === 'function') {
      req.io.emit('report_updated', updatedReport);
    }

    return res.status(200).json(updatedReport);
  } catch (err) {
    console.error('SERVER ERROR IN UPDATE STATUS:', err);
    return res.status(500).json({
      message: 'Server error while updating report status.',
      error: err.message,
    });
  }
};