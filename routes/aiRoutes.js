const express = require('express');
const router = express.Router();
const { classifyWaste } = require('../controllers/aiController');

router.post('/classify', classifyWaste);

module.exports = router;