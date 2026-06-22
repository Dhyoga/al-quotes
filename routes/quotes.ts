import prisma from '../lib/prisma.js';
import createResourceRouter from '../lib/createResourceRouter.js';

export default createResourceRouter({
  prisma,
  model: prisma.quotes,
  tableName: 'Quotes',
  notFoundMessage: 'Quotes not found',
});
