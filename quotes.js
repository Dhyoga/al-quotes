const prisma = require('./lib/prisma');
const createResourceRouter = require('./lib/createResourceRouter');

module.exports = createResourceRouter({
  prisma,
  model: prisma.quotes,
  tableName: 'Quotes',
  notFoundMessage: 'Quotes not found',
});
