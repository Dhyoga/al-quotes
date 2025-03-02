const express = require('express');
const prisma = new (require('@prisma/client')).PrismaClient();
const router = express.Router();

const getPictureRandom = async () => {
  try {
    const picture = await prisma.pictures.findFirst({
      skip: Math.floor(Math.random() * await prisma.pictures.count()),  // Menggunakan skip untuk gambar acak
    });
    return picture;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getPictures = async () => {
  try {
    const pictures = await prisma.pictures.findMany();
    return pictures;
  } catch (error) {
    throw new Error(error.message);
  }
};

router
  .get('/random', async (req, res) => {
    try {
      const picture = await getPictureRandom();
      if (picture) {
        res.json(picture);
      } else {
        res.status(404).json({ message: 'Picture not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  .get('/', async (req, res) => {
    try {
      const pictures = await getPictures();
      res.json(pictures);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;
