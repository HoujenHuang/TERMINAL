const express = require("express");
const cors = require("cors");
const app = express();

app.set("trust proxy", true);

app.use(cors()); 

app.get("/", (req, res) => {
	res.send("[ OK ] Root path retrieved");
});

app.get("/api/get-ip", (req, res) => {
	res.json({ message: "[ OK ] IP API endpoint retrieved", ip: req.ip });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`[ OK ] Server listening on http://localhost:${port}`);
});
