// routes/task.js
const express = require('express');
const quotesService = require('./services');

const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const quotes = await quotesService.getQuotesById(id);
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
