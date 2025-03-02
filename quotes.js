const express = require('express');
const prisma = new (require('@prisma/client')).PrismaClient();
const router = express.Router();

const getQuotesRandom = async () => {
  try {
    const quotes = await prisma.quotes.findFirst({
      skip: Math.floor(Math.random() * await prisma.quotes.count()),  // Menggunakan skip untuk quotes acak
    });
    return quotes;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getQuotes = async () => {
  try {
    const quotes = await prisma.quotes.findMany();
    return quotes;
  } catch (error) {
    throw new Error(error.message);
  }
}

router
  .get('/random', async (req, res) => {
    try {
      const quotes = await getQuotesRandom();
      if (quotes) {
        res.json(quotes);
      } else {
        res.status(404).json({ message: 'Quotes not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  .get('/', async (req, res) => {
    try {
      const quotes = await getQuotes();
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;
