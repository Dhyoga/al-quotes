const prisma = require('./lib/prisma');
const createResourceRouter = require('./lib/createResourceRouter');

module.exports = createResourceRouter({
  prisma,
  model: prisma.pictures,
  tableName: 'Pictures',
  notFoundMessage: 'Picture not found',
});
