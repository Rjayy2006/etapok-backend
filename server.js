const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io Setup for Real-time Updates
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Attach Socket instance to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ------------------ MONGOOSE SCHEMAS ------------------

// 1. User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Resident' },
  barangay: { type: String, default: 'Barangay Central' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// 2. Report Schema
const reportSchema = new mongoose.Schema({
  description: { type: String, required: true },
  wasteType: { type: String, default: 'Malata' },
  locationName: { type: String, default: 'Unspecified' },
  lat: Number,
  lng: Number,
  imageUrl: String,
  status: { type: String, default: 'Pending' },
  barangay: { type: String, default: 'Barangay Central' },
  userName: { type: String, default: 'Resident' },
  createdAt: { type: Date, default: Date.now },
});

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);


// ------------------ AUTHENTICATION ROUTES ------------------

// Register Endpoint
// Login Endpoint (Auto-registers user if email doesn't exist yet)
app.post('/api/e-tapok/auth/login', async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user = await User.findOne({ email });

    // Auto-create account if user does not exist in database yet
    if (!user) {
      user = new User({
        name: email.split('@')[0],
        email,
        password,
        role: 'Resident',
        barangay: 'Barangay Central',
      });
      await user.save();
    } else if (user.password !== password) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    const token = `token_${user._id}`;
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        barangay: user.barangay,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ------------------ REPORT CRUD ROUTES ------------------

// READ: Fetch All Reports
app.get('/api/e-tapok/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE: Submit New Waste Report
app.post('/api/e-tapok/reports', async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    req.io.emit('report_created', report);
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE: Change Report Status
app.put('/api/e-tapok/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    req.io.emit('report_updated', updatedReport);
    res.status(200).json(updatedReport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE: Remove Report by ID
app.delete('/api/e-tapok/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedReport = await Report.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    req.io.emit('report_deleted', id);
    res.status(200).json({ message: 'Report deleted successfully', id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ------------------ SERVER INITIALIZATION ------------------

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });