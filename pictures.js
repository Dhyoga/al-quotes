const express = require('express');
const prisma = new (require('@prisma/client')).PrismaClient();
const router = express.Router();

const getPictureRandom = async () => {
  try {
    const totalPictures = await prisma.pictures.count();
    if (totalPictures === 0) {
      return null; // Jika tabel kosong, kembalikan null
    }

    const randomId = Math.floor(Math.random() * totalPictures) + 1;

    return await prisma.pictures.findUnique({
      where: { id: randomId },
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

router.get('/random', async (req, res) => {
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
});

module.exports = router;