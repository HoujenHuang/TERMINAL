const express = require('express');
const path = require('path');
const app = express();

app.set('trust proxy', true);

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/get-ip', (req, res) => {
	res.json({ ip: req.ip });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});
