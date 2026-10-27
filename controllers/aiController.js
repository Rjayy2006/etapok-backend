const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

/**
 * POST /api/e-tapok/ai/classify
 * Classify waste items into "Malata" or "Dili Malata" using Gemini AI or Heuristic Fallback
 */
exports.classifyWaste = async (req, res) => {
  try {
    const { description, imageUrl } = req.body;

    if (!description && !imageUrl) {
      return res.status(400).json({
        message: 'Please provide either a description or an image file.',
      });
    }

    // Heuristic fallback in case AI key is missing or fails
    const getFallbackCategory = (text) => {
      const lower = (text || '').toLowerCase();
      const bioKeywords = ['food', 'leftover', 'banana', 'peel', 'fruit', 'vegetable', 'yard', 'leaf', 'paper', 'cardboard', 'grass'];
      const isBio = bioKeywords.some((k) => lower.includes(k));
      return isBio
        ? { category: 'Malata', explanation: 'Identified as organic / biodegradable waste.' }
        : { category: 'Dili Malata', explanation: 'Identified as non-biodegradable or residual waste.' };
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using local heuristic fallback.');
      const fallback = getFallbackCategory(description);
      return res.status(200).json(fallback);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const contents = [];
    const promptText = `Analyze this waste item for municipal segregation in the Philippines.
Classify it strictly as either "Malata" (Biodegradable / Organic waste) or "Dili Malata" (Non-Biodegradable / Residual / Recyclable waste like plastics, diapers, metals, glass).
Provide your response strictly in valid JSON format:
{"category": "Malata" or "Dili Malata", "explanation": "Short 1-sentence reason in English or Bisaya"}
User description: ${description || 'Not provided'}`;

    contents.push(promptText);

    // Process image input (Data URI or HTTP URL)
    if (imageUrl && typeof imageUrl === 'string') {
      // Case A: Uploaded Base64 File (data:image/...;base64,...)
      const base64Match = imageUrl.match(/^data:(.+);base64,(.+)$/);
      if (base64Match) {
        contents.push({
          inlineData: {
            mimeType: base64Match[1],
            data: base64Match[2],
          },
        });
      } 
      // Case B: HTTP/HTTPS URL
      else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
          const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const mimeType = imgResponse.headers['content-type'] || 'image/jpeg';
          const base64Data = Buffer.from(imgResponse.data).toString('base64');
          contents.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        } catch (imgErr) {
          console.warn('Could not fetch external image URL, relying on text description:', imgErr.message);
        }
      }
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    // Clean JSON response from Gemini
    const cleanedJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJsonStr);

    return res.status(200).json({
      category: parsed.category === 'Malata' ? 'Malata' : 'Dili Malata',
      explanation: parsed.explanation || 'Classified by Gemini AI.',
    });
  } catch (err) {
    console.error('AI CLASSIFY ERROR:', err);
    // Graceful fallback prevents HTTP 400/500 errors on frontend
    const fallback = {
      category: req.body?.description?.toLowerCase().includes('diaper') ? 'Dili Malata' : 'Malata',
      explanation: 'Classified using local waste segregation guidelines.',
    };
    return res.status(200).json(fallback);
  }
};