const express = require("express");
const cors = require("cors");
const si = require("systeminformation");
const app = express();

app.set("trust proxy", true);
app.use(cors());

async function getStats() {
	try {
		const cpu = await si.cpu();
		const temp = await si.cpuTemperature();
		const load = await si.currentLoad();
		const mem = await si.mem();
		const speed = await si.cpuCurrentSpeed();

		return {
			cpuName: `${cpu.manufacturer} ${cpu.brand}`,
			cpuUser: load.currentLoadUser.toFixed(2),
			cpuSystem: load.currentLoadSystem.toFixed(2),
			cpuTemp: temp.main || "N/A",
			cpuSpeed: speed.avg,
			memUsed: (mem.active / 1024 / 1024 / 1024).toFixed(2),
			memTotal: (mem.total / 1024 / 1024 / 1024).toFixed(2)
		};
	} catch (e) {
		console.error("ERROR: ", e);
		return null;
	}
}

app.get("/", async (req, res) => {
	const ip = req.ip;
	const stats = await getStats();

	res.send(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>Not The TERMINAL</title>
			<style>
				body {
					background: black;
					color: lime;
					font-family: "Courier New";
				}
			</style>
		</head>
		<body>
			<h1>SYSTEM INFORMATION</h1>
			<p>IP: ${ip}</p>
			<h1>CPU</h1>
			<p>NAME: ${stats.cpuName}</p>
			<p>USER: ${stats.cpuUser}%</p>
			<p>SYSTEM: ${stats.cpuSystem}%</p>
			<p>TEMPERATURE: ${stats.cpuTemp}°C</p>
			<p>CURRENT SPEED: ${stats.cpuSpeed} GHz</p>
			<h1>MEMORY</h1>
			<p>${stats.memUsed} GB OUT OF ${stats.memTotal} GB AVAILABLE</p>
		</body>
		</html>
	`);
});

app.get("/api/stats", async (req, res) => {
	const stats = await getStats();
	res.json({
		message: "[ OK ] Stats fetched",
		ip: req.ip,
		data: stats
	});
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`[ OK ] Server listening on http://localhost:${port}`);
});
