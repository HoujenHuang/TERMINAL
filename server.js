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
            <title>System Monitor</title>
            <style>
                body { background: #000; color: #0f0; font-family: "Courier New", monospace; padding: 20px; }
                h1 { border-bottom: 1px solid #0f0; padding-bottom: 10px; }
                .stat { margin: 10px 0; }
                .label { font-weight: bold; color: #8af; }
            </style>
        </head>
        <body>
            <h1>SYSTEM INFORMATION</h1>
            <div class="stat"><span class="label">IP:</span> ${ip}</div>
            
            <h1>CPU</h1>
            <div class="stat"><span class="label">NAME:</span> ${stats.cpuName}</div>
            <div class="stat"><span class="label">USER:</span> ${stats.cpuUser}%</div>
            <div class="stat"><span class="label">SYSTEM:</span> ${stats.cpuSystem}%</div>
            <div class="stat"><span class="label">TEMPERATURE:</span> ${stats.cpuTemp}${stats.cpuTemp !== "N/A" ? "°C" : ""}</div>
            <div class="stat"><span class="label">CURRENT SPEED:</span> ${stats.cpuSpeed} ${stats.cpuSpeed !== "N/A" ? "GHz" : ""}</div>
            
            <h1>MEMORY</h1>
            <div class="stat">${stats.memUsed} GB / ${stats.memTotal} GB</div>
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
