const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

/**
 * POST /api/e-tapok/ai/classify
 * Classifies items into "Malata" or "Dili Malata" with Gemini AI & Local Fallback
 */
exports.classifyWaste = async (req, res) => {
  const { description, imageUrl } = req.body;

  if (!description && !imageUrl) {
    return res.status(400).json({
      message: 'Please provide either an item description or an image file.',
    });
  }

  // Local rule-based classification fallback
  const getFallbackClassification = (text) => {
    const lower = (text || '').toLowerCase();
    const bioKeywords = [
      'food', 'leftover', 'banana', 'peel', 'fruit', 'vegetable',
      'yard', 'leaf', 'paper', 'cardboard', 'grass', 'compost'
    ];
    const nonBioKeywords = [
      'diaper', 'plastic', 'bottle', 'can', 'metal', 'glass',
      'styrofoam', 'wrapper', 'sachet', 'cellophane', 'rubber'
    ];

    if (nonBioKeywords.some((k) => lower.includes(k))) {
      return {
        category: 'Dili Malata',
        explanation: 'Identified as non-biodegradable / sanitary residual waste.',
      };
    }

    if (bioKeywords.some((k) => lower.includes(k))) {
      return {
        category: 'Malata',
        explanation: 'Identified as organic / biodegradable waste.',
      };
    }

    return {
      category: 'Dili Malata',
      explanation: 'Classified as non-biodegradable under local segregation rules.',
    };
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY missing. Using local rule engine fallback.');
      return res.status(200).json(getFallbackClassification(description));
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const contents = [];
    const promptText = `You are a municipal waste classification AI in the Philippines.
Classify the following item strictly as either "Malata" (Biodegradable / Organic waste) or "Dili Malata" (Non-Biodegradable / Residual / Recyclable waste like plastics, diapers, metals).
Respond ONLY in valid JSON:
{"category": "Malata" or "Dili Malata", "explanation": "Short 1-sentence reason in English or Bisaya"}
Item description: ${description || 'Not provided'}`;

    contents.push(promptText);

    // Parse Base64 Image
    if (imageUrl && typeof imageUrl === 'string') {
      const base64Match = imageUrl.match(/^data:(.+);base64,(.+)$/);
      if (base64Match) {
        contents.push({
          inlineData: {
            mimeType: base64Match[1],
            data: base64Match[2],
          },
        });
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
          const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const mimeType = imgResponse.headers['content-type'] || 'image/jpeg';
          const base64Data = Buffer.from(imgResponse.data).toString('base64');
          contents.push({
            inlineData: { mimeType, data: base64Data },
          });
        } catch (imgErr) {
          console.warn('Could not fetch external image, using text prompt only:', imgErr.message);
        }
      }
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    const cleanedJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJsonStr);

    return res.status(200).json({
      category: parsed.category === 'Malata' ? 'Malata' : 'Dili Malata',
      explanation: parsed.explanation || 'Classified by Gemini AI.',
    });
  } catch (err) {
    console.error('AI Processing Error:', err);
    // Graceful fallback prevents HTTP error toasts
    return res.status(200).json(getFallbackClassification(description));
  }
};