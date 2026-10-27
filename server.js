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

app.post('/api/e-tapok/auth/register', async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const { name, password, role, barangay } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });

    if (user) {
      user.name = name || user.name;
      user.password = password;
      user.role = role || user.role;
      user.barangay = barangay || user.barangay;
      await user.save();
    } else {
      user = new User({
        name: name || email.split('@')[0],
        email,
        password,
        role: role || 'Resident',
        barangay: barangay || 'Barangay Central',
      });
      await user.save();
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

app.post('/api/e-tapok/auth/login', async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });

    if (!user) {
      user = new User({
        name: email.split('@')[0],
        email,
        password,
        role: 'Resident',
        barangay: 'Barangay Central',
      });
      await user.save();
    } else {
      user.password = password;
      await user.save();
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

app.get('/api/e-tapok/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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


// ------------------ GEMINI AI CLASSIFICATION ROUTE ------------------

// ------------------ ENHANCED GEMINI AI CLASSIFICATION ROUTE ------------------

// ------------------ HIGH-ACCURACY GEMINI AI ROUTE ------------------

app.post('/api/e-tapok/ai/classify', async (req, res) => {
  try {
    const { description, imageUrl } = req.body;

    if (!description && !imageUrl) {
      return res.status(400).json({ message: 'Please provide a description or an image.' });
    }

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
      try {
        // High precision configuration
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.1, // Near zero randomness for accurate classification
            responseMimeType: 'application/json', // Strictly forces clean JSON format
          },
          systemInstruction: `You are the municipal waste classifier AI for Maasin City, Southern Leyte, Philippines (E-TAPOK Waste Portal).
Your sole task is to classify waste items accurately into ONE of these 3 strict categories:

1. "Malata" (Biodegradable / Organic waste: food leftovers, fruit & vegetable peels, paper, cardboard, leaves, wood, fish/meat bones, coconut husk/shell).
2. "Dili Malata" (Non-biodegradable waste: plastics, diapers, sanitary pads, styrofoam, tin cans, glass bottles, rubber, e-waste, metals, sachets, cellophane wrappers).
3. "Invalid Item" (Person names, human names, greetings, non-waste objects, unidentifiable random pictures, or gibberish).

LANGUAGE RULES:
- Recognize English, Tagalog, and Bisaya / Cebuano terms.

FEW-SHOT EXAMPLES:
- Input: "diaper" -> {"category": "Dili Malata", "explanation": "Diapers contain non-biodegradable plastic layers and synthetic absorbent polymers."}
- Input: "Juan Dela Cruz" -> {"category": "Invalid Item", "explanation": "This input is a person's name, not a waste item."}
- Input: "balat ng saging" -> {"category": "Malata", "explanation": "Banana peels are organic plant waste that naturally decomposes."}
- Input: "sachet ng shampoo" -> {"category": "Dili Malata", "explanation": "Laminated foil and plastic sachets are non-biodegradable waste."}
- Input: "tilapia bones" -> {"category": "Malata", "explanation": "Fish and animal bones are organic waste material."}
`
        });

        const contents = [];

        // Attach Image first if present (Vision priority)
        if (imageUrl && imageUrl.startsWith('data:image')) {
          const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
          const base64Data = imageUrl.split(',')[1];
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          });
        }

        // Attach text prompt
        const userPrompt = description
          ? `Classify this item: "${description}".`
          : 'Identify the waste item in this photo and classify it.';
        contents.push(userPrompt);

        const result = await model.generateContent(contents);
        const parsedData = JSON.parse(result.response.text());

        return res.status(200).json(parsedData);
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to smart rules:', geminiErr.message);
      }
    }

    // Fallback Rule Engine if API Key is not loaded
    const text = (description || '').trim();
    const lowerText = text.toLowerCase();

    const sampleNames = ['erick', 'john', 'juan', 'maria', 'jose', 'kim', 'pedro', 'ana', 'mark', 'sarah', 'david'];
    const isPersonName = sampleNames.some((name) => lowerText.split(' ').includes(name));

    if (isPersonName && !lowerText.includes('waste') && !lowerText.includes('trash')) {
      return res.status(200).json({
        category: 'Invalid Item',
        explanation: `"${text}" appears to be a person's name, not a waste item.`,
      });
    }

    const nonBioKeywords = ['diaper', 'plastic', 'bottle', 'wrapper', 'can', 'tin', 'glass', 'styrofoam', 'cellophane', 'sachet', 'rubber', 'metal', 'foil', 'bag'];
    const isNonBio = nonBioKeywords.some((kw) => lowerText.includes(kw));

    return res.status(200).json({
      category: isNonBio ? 'Dili Malata' : 'Malata',
      explanation: isNonBio
        ? 'Contains non-biodegradable or synthetic materials (Dili Malata).'
        : 'Appears to be organic or compostable material (Malata).',
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
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