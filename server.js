const bodyParser = require('body-parser');
const cors = require('cors'); // Tambahkan import cors
const quotesRoutes = require('./quotes.js');
const picturesRoutes = require('./pictures.js');
const app = require('express')();
const port = process.env.PORT || 3000;

// Gunakan middleware CORS
app.use(
    cors({
        origin: '*', // Mengizinkan semua origin (bisa disesuaikan untuk keamanan)
        methods: ['GET'], // Metode HTTP yang diizinkan
        allowedHeaders: ['Content-Type', 'Authorization'], // Header yang diizinkan
    })
);

app.use(bodyParser.json());

app.use('/quotes', quotesRoutes);
app.use('/pictures', picturesRoutes);

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
