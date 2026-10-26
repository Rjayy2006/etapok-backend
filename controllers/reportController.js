const Report = require('../models/Report');
const User = require('../models/User');

const createReport = async (req, res) => {
  try {
    const { wasteType, addressText, latitude, longitude, aiAssisted } = req.body;

    const report = await Report.create({
      residentId: req.user._id,
      wasteType,
      addressText,
      latitude: latitude || 0,
      longitude: longitude || 0,
      aiAssisted: aiAssisted || false,
    });

    // Broadcast new report event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('report:created', report);
    }

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const { search, status, wasteType } = req.query;
    let query = {};

    if (status) query.status = status;
    if (wasteType) query.wasteType = wasteType;
    if (search) {
      query.addressText = { $regex: search, $options: 'i' };
    }

    const reports = await Report.find(query)
      .populate('residentId', 'name barangay accountabilityScore')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const collectReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (report.status === 'Collected') {
      return res.status(400).json({ success: false, message: 'Report already collected' });
    }

    report.status = 'Collected';
    report.collectorId = req.user._id;
    report.collectedAt = Date.now();
    await report.save();

    await User.findByIdAndUpdate(report.residentId, {
      $inc: { accountabilityScore: 10 },
    });

    // Broadcast collection event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('report:collected', report);
    }

    res.status(200).json({
      success: true,
      message: 'Pickup completed and resident score rewarded',
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (report.residentId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this report' });
    }

    await report.deleteOne();

    // Broadcast deletion event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('report:deleted', req.params.id);
    }

    res.status(200).json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc Get waste metrics and LGU summary analytics
// @route GET /api/e-tapok/reports/analytics
const getAnalytics = async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'Pending' });
    const collectedReports = await Report.countDocuments({ status: 'Collected' });
    const malataCount = await Report.countDocuments({ wasteType: 'Malata' });
    const diliMalataCount = await Report.countDocuments({ wasteType: 'Dili Malata' });

    const collectionRate = totalReports > 0 ? Math.round((collectedReports / totalReports) * 100) : 0;
    const malataPercentage = totalReports > 0 ? Math.round((malataCount / totalReports) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        collectedReports,
        malataCount,
        diliMalataCount,
        collectionRate,
        malataPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReport,
  getReports,
  collectReport,
  deleteReport,
  getAnalytics,
};