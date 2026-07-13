const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');

const app = express();
const server = createServer(app);

app.use(express.static(join(__dirname, 'public')));

app.use('/uv/', express.static(uvPath));

app.use((req, res, next) => {
	if (req.url.startsWith('/service/')) {
		next();
	} else {
		res.status(404).sendFile(join(__dirname, 'public', '404.html'));
	}
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
	console.log(`[ OK ] Server is listening on port http://localhost:${PORT}`);
});
