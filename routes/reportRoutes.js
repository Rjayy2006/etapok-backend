const express = require('express');
const router = express.Router();
const { 
  createReport, 
  getReports, 
  collectReport, 
  deleteReport,
  getAnalytics
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getReports);
router.get('/analytics', protect, getAnalytics);
router.post('/', protect, createReport);
router.put('/:id/collect', protect, collectReport);
router.delete('/:id', protect, deleteReport);

module.exports = router;