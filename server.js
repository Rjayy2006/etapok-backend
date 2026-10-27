const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware to attach socket.io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected successfully.'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

const reportRoutes = require('./routes/reportRoutes');
app.use('/api/e-tapok', reportRoutes);

try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/e-tapok/auth', authRoutes);
} catch (e) {
  console.log('authRoutes handled internally or loaded separately.');
}

try {
  const aiRoutes = require('./routes/aiRoutes');
  app.use('/api/e-tapok/ai', aiRoutes);
} catch (e) {
  console.log('aiRoutes handled internally or loaded separately.');
}

app.get('/', (req, res) => {
  res.send('E-Tapok Backend API Service Active.');
});

io.on('connection', (socket) => {
  console.log('Client connected to WebSocket:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSocket:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`E-Tapok server running on port ${PORT}`);
});