const bodyParser = require('body-parser');
const quotesRoutes = require('./routes.js');

const app = require('express')();
const port = 3000;

app.use(bodyParser.json());

app.use('/quotes', quotesRoutes);

app.get('/', (req, res) => {
    res.send('Remindeen API');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;