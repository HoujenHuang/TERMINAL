const express = require('express');
const os = require('os');
const app = express();
const port = process.env.PORT || 8080;

app.get('/stats', (req, res) => {
  res.json({
    freeMemory: Math.round(os.freemem() / 1024 / 1024) + " MB",
    cpuCores: os.cpus().length,
    uptime: Math.round(os.uptime() / 60) + " minutes"
  });
});

app.get('/', (req, res) => {
	res.send(`
		<h1>System Diagnostics</h1>
		<div id="data">Loading...</div>
		<script>
			fetch('/stats').then(r => r.json()).then(data => {
			document.getElementById('data').innerHTML = 
			'Cores: ' + data.cpuCores + '<br>Free RAM: ' + data.freeMemory;
		});
		</script>
	`);
});

app.listen(port, () => console.log('Server running on port ' + port));
