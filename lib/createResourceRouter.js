import express from 'express';

const createResourceRouter = ({ prisma, model, tableName, notFoundMessage }) => {
  const router = express.Router();

  router
    .get('/random', async (req, res, next) => {
      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${tableName}" ORDER BY RANDOM() LIMIT 1`
        );
        const item = rows[0];
        if (item) {
          res.json(item);
        } else {
          res.status(404).json({ message: notFoundMessage });
        }
      } catch (error) {
        next(error);
      }
    })
    .get('/', async (req, res, next) => {
      try {
        const items = await model.findMany();
        res.json(items);
      } catch (error) {
        next(error);
      }
    });

  return router;
};

export default createResourceRouter;
