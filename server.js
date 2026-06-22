import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import cors from 'cors'; // Tambahkan import cors
import quotesRoutes from './quotes.js';
import picturesRoutes from './pictures.js';
import tasksRoutes from './tasks.js';
import habitsRoutes from './habits.js';
import express from 'express';

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

// Tasks & Habits butuh write methods, dibatasi ke origin extension saja
app.use(
    ['/tasks', '/habits'],
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

app.get('/', (req, res) => {
    res.send('Remindeen API');
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
