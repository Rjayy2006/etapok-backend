const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS enabled
// Initialize Socket.io with CORS enabled for all origins
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Pass socket instance to controllers via Express app state
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`⚡ Real-Time Socket Client Connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔥 Socket Client Disconnected: ${socket.id}`);
  });
});

app.use('/api/e-tapok/auth', require('./routes/authRoutes'));
app.use('/api/e-tapok/reports', require('./routes/reportRoutes'));
app.use('/api/e-tapok/ai', require('./routes/aiRoutes'));

app.get('/', (req, res) => {
  res.send('E-Tapok API with WebSockets is running...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});