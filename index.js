const express = require("express");
const cors = require("cors");
const app = express();

app.set("trust proxy", true);

app.use(cors()); 

app.get("/api/get-ip", (req, res) => {
	res.json({ ip: req.ip });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`[ OK ] Server listening on http://localhost:${port}`);
});
