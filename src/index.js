// index.js
const express = require('express');
const bodyParser = require('body-parser');
const quotesRoutes = require('./routes');

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.use('/quotes', quotesRoutes);

app.get('/', (req, res) => {
    res.send('Remindeen API');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
