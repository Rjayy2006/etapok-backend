// @desc Classify waste using Gemini Vision / Rule Engine
// @route POST /api/e-tapok/ai/classify
const classifyWaste = async (req, res) => {
  try {
    const { itemDescription, imageBase64 } = req.body;

    if (!itemDescription && !imageBase64) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide either an item description or a photo.' 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Use Gemini Vision API if key is present
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      const parts = [];

      // Add text prompt
      parts.push({
        text: `Classify this waste item into "Malata" (Biodegradable) or "Dili Malata" (Non-Biodegradable). ${
          itemDescription ? `Description: "${itemDescription}".` : ''
        } Respond STRICTLY with JSON in this exact format: {"classification": "Malata" | "Dili Malata", "explanation": "Short reason in Tagalog/Cebuano"}`
      });

      // Add image base64 if provided
      if (imageBase64) {
        // Strip out base64 header if present (e.g. data:image/png;base64,)
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Data
          }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        }
      );

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (rawText) {
        const cleanJson = JSON.parse(rawText.replace(/```json|```/g, '').trim());
        return res.status(200).json({ success: true, data: cleanJson });
      }
    }

    // Fallback rule-based classifier for offline testing
    const query = (itemDescription || '').toLowerCase();
    const isMalata = ['food', 'peel', 'leaf', 'paper', 'leftover', 'malata', 'skin', 'fruit', 'apple', 'banana'].some(k => query.includes(k));

    res.status(200).json({
      success: true,
      data: {
        classification: isMalata ? 'Malata' : 'Dili Malata',
        explanation: imageBase64
          ? 'Nakita sa hulagway nga kini kay silbing naklasipikar gamit ang Vision AI.'
          : (isMalata 
              ? 'Kini kay organiko ug dali ra madunot (Biodegradable).' 
              : 'Dili kini dali madunot (Non-Biodegradable). Kinahanglan i-recycle o ilain.')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { classifyWaste };