const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/reports', reportController.getAllReports);
router.post('/reports', reportController.createReport);
router.put('/reports/:id/status', reportController.updateReportStatus);

module.exports = router;