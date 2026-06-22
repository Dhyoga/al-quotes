import prisma from '../lib/prisma.js';
import createResourceRouter from '../lib/createResourceRouter.js';

export default createResourceRouter({
  prisma,
  model: prisma.pictures,
  tableName: 'Pictures',
  notFoundMessage: 'Picture not found',
});
