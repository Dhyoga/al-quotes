const express = require('express');
const quotesService = require('./services.js');

const router = express.Router();

router.get('/random', async (req, res) => {
  try {
    const quotes = await quotesService.getQuotesRandom();
    if (quotes) {
      res.json(quotes);
    } else {
      res.status(404).json({ message: 'Quotes not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
