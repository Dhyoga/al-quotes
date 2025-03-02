const express = require('express');
const prisma = new (require('@prisma/client')).PrismaClient();
const router = express.Router();

const getQuotesRandom = async () => {
  try {
    const totalQuotes = await prisma.quotes.count();
    if (totalQuotes === 0) {
      return null; // Jika tabel kosong, kembalikan null
    }

    const randomId = Math.floor(Math.random() * totalQuotes) + 1;

    return await prisma.quotes.findUnique({
      where: { id: randomId },
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

router.get('/random', async (req, res) => {
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
});

module.exports = router;
