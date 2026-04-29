const express = require("express");
const cors = require("cors");
const si = require("systeminformation");
const app = express();

app.set("trust proxy", true);
app.use(cors());

async function getStats() {
	try {
		const [cpu, temp, load, mem, speed] = await Promise.all([
			si.cpu(),
			si.cpuTemperature(),
			si.currentLoad(),
			si.mem(),
			si.cpuCurrentSpeed()
		]);

		const formatNum = (value, decimals = 2) => {
			const num = parseFloat(value);
			return isNaN(num) ? "0.00" : num.toFixed(decimals);
		};

		return {
			cpuName: `${cpu.manufacturer || ''} ${cpu.brand || 'Generic CPU'}`.trim(),
			cpuUser: formatNum(load.currentLoadUser),
			cpuSystem: formatNum(load.currentLoadSystem),
			cpuTemp: temp.main ? temp.main.toString() : "N/A",
			cpuSpeed: speed.avg && speed.avg > 0 ? speed.avg : "N/A",
			memUsed: formatNum(mem.used / 1024 / 1024 / 1024),
			memTotal: formatNum(mem.total / 1024 / 1024 / 1024)
		};
	} catch (e) {
		console.error("ERROR fetching system stats: ", e);
		return null;
	}
}

app.get("/", async (req, res) => {
	const ip = req.ip;
	const stats = await getStats();

	if (!stats) {
		return res.status(500).send("Error fetching system stats");
	}

	res.send(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>TERMINAL Backend</title>
			<style>
				body {
					background: black;
					color: lime;
					font-family: "Courier New";
				}
			</style>
		</head>
		<body>
		<b>> SYSTEM INFORMATION</b>
		<p><b>IP:</b> ${ip}</p>

		<b>> CPU</b>
		<p><b>NAME:</b> ${stats.cpuName}</p>
		<p><b>USER:</b> ${stats.cpuUser}%</p>
		<p><b>SYSTEM:</b> ${stats.cpuSystem}%</p>
		<p><b>TEMPERATURE:</b> ${stats.cpuTemp}°C</p>
		<p><b>CURRENT SPEED:</b> ${stats.cpuSpeed} GHz</p>

		<b>> MEMORY</b>
		<p><b>MEMORY USED:</b> ${stats.memUsed} GB OUT OF ${stats.memTotal} GB</p>
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
	console.log(`[ OK ] Server listening on port ${port}`);
});
