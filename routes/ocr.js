const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = req.file.buffer;
    
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      { logger: info => console.log(info) }
    );

    res.json({
      text: result.data.text,
      confidence: result.data.confidence
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    });
  }
});

module.exports = router;
