const bodyParser = require('body-parser');
const cors = require('cors'); // Tambahkan import cors
const quotesRoutes = require('./quotes.js');
const picturesRoutes = require('./pictures.js');
const tasksRoutes = require('./tasks.js');
const habitsRoutes = require('./habits.js');
const app = require('express')();
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

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = app;
