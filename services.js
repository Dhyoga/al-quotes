// services/taskService.js
const prisma = new (require('@prisma/client')).PrismaClient();

const getQuotesById = async (id) => {
  try {
    return await prisma.quotes.findUnique({
      where: { id: parseInt(id) },
    });
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  getQuotesById,
};
