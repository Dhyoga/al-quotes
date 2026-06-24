import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cors from 'cors'; // Tambahkan import cors
import quotesRoutes from './routes/quotes.js';
import picturesRoutes from './routes/pictures.js';
import tasksRoutes from './routes/tasks.js';
import habitsRoutes from './routes/habits.js';
import apiKeysRoutes from './routes/api-keys.js';
import mcpRoutes from './routes/mcp.js';
import express, { type Request, type Response, type NextFunction } from 'express';

const app = express();
const port = process.env.PORT || 3000;

// Quotes & Pictures tetap public, read-only, untuk semua origin
app.use(
    ['/quotes', '/pictures'],
    cors({
        origin: '*',
        methods: ['GET'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Tasks, Habits & API key management butuh write methods, dibatasi ke origin extension saja
app.use(
    ['/tasks', '/habits', '/auth/api-keys'],
    cors({
        origin: process.env.EXTENSION_ORIGIN || false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(bodyParser.json());

app.use('/quotes', quotesRoutes);
app.use('/pictures', picturesRoutes);
app.use('/tasks', tasksRoutes);
app.use('/habits', habitsRoutes);
app.use('/auth/api-keys', apiKeysRoutes);
app.use('/mcp', mcpRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Remindeen API');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({ error: err.message });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
