const prisma = new (require('@prisma/client')).PrismaClient();

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


module.exports = {
  getQuotesRandom
};
