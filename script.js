document.addEventListener('DOMContentLoaded', (event) => {
	load("[ OK ] DOM fully loaded");
	document.body.classList.add("flicker");

	setTimeout(() => {
		displayTime();
		displayDate();
		updateTimer();
		checkBrowser();
		checkFPS();
		checkMemory();
		checkSpeed();
		checkBattery();
		checkConnection();
		am5.ready(initMap);
	}, 500);
});

// Battery saver

let isActive = true;
let isTabVisible = true;

document.addEventListener("visibilitychange", () => {
	isTabVisible = !document.hidden;
});

function toggleBatterySaver() {
	isActive = !isActive;

	if (!isActive) {
		Object.values(charts).forEach(chart => {
			const ctx = chart.el.getContext("2d");
			ctx.clearRect(0, 0, chart.el.width, chart.el.height);
		});
		closeSide();
	}
}

function shouldRun() {
	return isActive && isTabVisible;
}

// Tab toggle

const sideLeft = document.getElementById("leftTerminal");
const sideRight = document.getElementById("rightTerminal");

const btnLeft = document.getElementById("sideBtnLeft");
const btnRight = document.getElementById("sideBtnRight");

function closeSide() {
	sideLeft.style.width = "0";
	sideRight.style.width = "0";

	btnLeft.style.opacity = "1";
	btnRight.style.opacity = "1";
	isActive = false;
}

function openSide() {
	sideLeft.style.width = "50%";
	sideRight.style.width = "50%";

	btnLeft.style.opacity = "0";
	btnRight.style.opacity = "0";
	isActive = true;
}

// Time

let isTimeInit = false;

function displayTime() {
	if (!shouldRun()) {
		document.getElementById("clock").innerText = "00:00:00";
		return;
	}

	const now = new Date();

	let hours = now.getHours();
	let minutes = now.getMinutes();
	let seconds = now.getSeconds();

	minutes = minutes < 10 ? "0" + minutes : minutes;
	seconds = seconds < 10 ? "0" + seconds : seconds;

	const timeString = hours + ":" + minutes + ":" + seconds;

	document.getElementById("clock").innerText = timeString;

	if (!isTimeInit) {
		load(`[ OK ] Atomic Clock synced: ${timeString}`);
		isTimeInit = true;
	}
}

if (shouldRun()) {
	setInterval(displayTime, 1000);
}

// Date

function displayDate() {
	const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

	const d = new Date();

	let year = d.getFullYear();
	document.getElementById("year").textContent = year;

	let month = months[d.getMonth()];
	document.getElementById("month").textContent = month;

	let day = d.getDate();
	document.getElementById("day").textContent = day;

	load(`[ OK ] Terran Orbital Revolution synced: ${day} ${month} ${year}`);
}

// Uptime

let isUptimeInit = false;

let totalSeconds = 0;
const timerElement = document.getElementById("timer");

function updateTimer() {
	if (!shouldRun()) {
		timerElement.innerText = "00:00:00";
		return;
	}

	totalSeconds++;

	let hours = Math.floor(totalSeconds / 3600);
	let minutes = Math.floor((totalSeconds % 3600) / 60);
	let seconds = totalSeconds % 60;

	let hDisplay = hours.toString().padStart(2, "0");
	let mDisplay = minutes.toString().padStart(2, "0");
	let sDisplay = seconds.toString().padStart(2, "0");

	timerElement.textContent = `${hDisplay}:${mDisplay}:${sDisplay}`;

	if (!isUptimeInit) {
		load(`[ OK ] Uptime synced: ${hDisplay}:${mDisplay}:${sDisplay}`);
		isUptimeInit = true;
	}
}

if (shouldRun()) {
	setInterval(updateTimer, 1000);
}

// Browser

function checkBrowser() {
	const browser = document.getElementById("browser");
	const userAgent = navigator.userAgent;

	if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
		browser.textContent = "CHROME";
		load(`[ OK ] Operating System fetched: ${userAgent}`);
	} else if (userAgent.includes("Firefox")) {
		browser.textContent = "FIREFOX ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
		browser.textContent = "SAFARI ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	} else if (userAgent.includes("Edg")) {
		browser.textContent = "EDGE";
		load(`[ OK ] Operating System fetched: ${userAgent}`);
	} else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
		browser.textContent = "OPERA";
		load(`[ OK ] Operating System fetched: ${userAgent}`);
	} else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
		browser.textContent = "IE ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	} else {
		browser.textContent = "UNKNOWN ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	}
}

// Charts

const charts = {
	mem: {
		el: document.getElementById("memChart"),
		data: [],
		max: 512,
		text: document.getElementById("memText")
	},
	fps: {
		el: document.getElementById("fpsChart"),
		data: [],
		max: 60,
		text: document.getElementById("fpsText")
	},
	speed: {
		el: document.getElementById("speedChart"),
		data: [],
		max: 100,
		text: document.getElementById("speedText")
	}
};

function drawGraph(key, value) {
	const chart = charts[key];
	if (!chart.el) return;
	const ctx = chart.el.getContext("2d");
	const {
		width,
		height
	} = chart.el;
	const paddingX = 40;
	const paddingY = 25;

	const dynamicColor = getComputedStyle(document.documentElement).getPropertyValue("--txt").trim() || "white";

	const timeStr = new Date().toLocaleTimeString("en-GB", {
		hour12: false
	});
	chart.data.push({
		val: value,
		time: timeStr
	});
	if (chart.data.length > 50) chart.data.shift();

	ctx.clearRect(0, 0, width, height);

	ctx.strokeStyle = dynamicColor;
	ctx.globalAlpha = 0.1;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let i = 0; i <= 4; i++) {
		const y = (height - paddingY - 10) - (i / 4 * (height - paddingY - 30));
		ctx.moveTo(paddingX, y);
		ctx.lineTo(width, y);
		const x = paddingX + (i / 4) * (width - paddingX - 10);
		ctx.moveTo(x, 10);
		ctx.lineTo(x, height - paddingY);
	}
	ctx.stroke();
	ctx.globalAlpha = 1.0;

	ctx.fillStyle = dynamicColor;
	ctx.font = "12px 'Courier New'";
	ctx.textAlign = "left";
	ctx.fillText(Math.round(chart.max), 5, 15);
	ctx.fillText("0", 5, height - paddingY - 5);

	if (chart.data.length > 1) {
		ctx.fillText(chart.data[0].time, paddingX, height - 5);
		ctx.textAlign = "right";
		ctx.fillText(chart.data[chart.data.length - 1].time, width - 5, height - 5);
	}

	ctx.beginPath();
	ctx.strokeStyle = dynamicColor;
	ctx.lineWidth = 2;
	ctx.lineJoin = "round";

	chart.data.forEach((point, i) => {
		const x = paddingX + (i / (50 - 1)) * (width - paddingX - 10);
		const y = (height - paddingY - 10) - (Math.min(point.val, chart.max) / chart.max * (height - paddingY - 30));
		i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
	});
	ctx.stroke();
}

// FPS

let isFPSInit = false;

let frames = 0,
	lastTime = performance.now();

function checkFPS() {
	if (!shouldRun()) {
		requestAnimationFrame(checkFPS);
		charts.fps.text.innerText = "Calculating...";
		return;
	}

	frames++;
	const now = performance.now();

	if (now >= lastTime + 1000) {
		const fps = Math.round((frames * 1000) / (now - lastTime));
		charts.fps.text.innerText = `${fps} FPS`;
		drawGraph("fps", fps);
		frames = 0;
		lastTime = now;
	}
	requestAnimationFrame(checkFPS);

	if (!isFPSInit) {
		load(`[ OK ] FPS fetched: ${Math.round((frames * 1000) / (now - lastTime))} FPS`);
		isFPSInit = true;
	}
}

// Memory

let isMemoryInit = false;

async function checkMemory() {
	if (!shouldRun()) {
		charts.mem.text.innerText = "Calculating...";
		return;
	}

	try {
		const used = performance.memory.usedJSHeapSize / 1e+6;
		const limit = performance.memory.totalJSHeapSize / 1e+6;

		charts.mem.text.innerText = `${used.toFixed(2)} / ${limit.toFixed(0)} MB`;
		charts.mem.max = limit;
		drawGraph("mem", used);

		if (!isMemoryInit) {
			load(`[ OK ] Memory loaded: ${used.toFixed(2)} / ${limit.toFixed(0)} MB`);
			isMemoryInit = true;
		}
	} catch (e) {
		if (!isMemoryInit) {
			load("[ FAIL ] Memory " + e);
			isMemoryInit = true;
			charts.memory.text.innerText = "ERROR";
		}
	}
}

// Network speed

let isSpeedInit = false;

async function checkSpeed() {
	if (!shouldRun()) {
		charts.speed.text.innerText = "Calculating...";
		return;
	}

	const imageAddr = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/A_Man_on_the_Moon%2C_AS11-40-5903_%28cropped%29.jpg/3840px-A_Man_on_the_Moon%2C_AS11-40-5903_%28cropped%29.jpg";
	const downloadSizeInBytes = 3822654;

	try {
		const startTime = performance.now();

		const response = await fetch(`${imageAddr}?n=${Math.random()}`, {
			cache: "no-store"
		});
		await response.blob();

		const endTime = performance.now();
		const durationInSeconds = (endTime - startTime) / 1000;

		const bitsLoaded = downloadSizeInBytes * 8;
		const speedMbps = (bitsLoaded / (1024 * 1024)) / durationInSeconds;

		if (speedMbps > charts.speed.max) charts.speed.max = speedMbps * 1.2;
		charts.speed.text.innerText = `${speedMbps.toFixed(2)} Mbps`;
		drawGraph("speed", speedMbps);

		if (!isSpeedInit) {
			load(`[ OK ] Speed loaded: ${speedMbps.toFixed(2)} Mbps`);
			isSpeedInit = true;
		}
	} catch (e) {
		if (!isSpeedInit) {
			load("[ FAIL ] Speed " + e);
			isSpeedInit = true;
			charts.speed.text.innerText = "ERROR";
		}
	}
}

setInterval(checkMemory, 1000);
setInterval(checkSpeed, 5000);

// Battery

const batteryDiv = document.getElementById("battery");

function checkBattery() {
	if (!shouldRun()) {
		batteryDiv.textContent = "Calculating...";
		return;
	}

	try {
		navigator.getBattery().then(function(battery) {
			function updateAllStatus() {
				const level = `${Math.round(battery.level * 100)}%`;
				const isCharging = battery.charging ? "🗲" : "";

				function formatTime(seconds) {
					if (seconds === Infinity || isNaN(seconds)) return "Calculating...";

					const hours = Math.floor(seconds / 3600);
					const mins = Math.floor((seconds % 3600) / 60);
					const displayMins = mins < 10 ? `0${mins}` : mins;
					return `${hours}:${displayMins}`;
				}

				let timeInfo = "";
				const time = battery.charging ? battery.chargingTime : battery.dischargingTime;
				const formatted = formatTime(time);

				if (formatted === "Calculating...") {
					timeInfo = `${formatted}`;
				} else if (battery.charging) {
					timeInfo = `${formatted} until full`;
				} else {
					timeInfo = `${formatted} left`;
				}
				batteryDiv.textContent = `${level} - ${timeInfo}`;
				document.getElementById("batteryTitle").textContent = `BATTERY ${isCharging}`;
			}
			updateAllStatus();

			const events = ["levelchange", "chargingchange", "chargingtimechange", "dischargingtimechange"];
			events.forEach(event => battery.addEventListener(event, updateAllStatus));
			load(`[ OK ] Battery level fetched: ${Math.round(battery.level * 100)}%`);
		});
	} catch (e) {
		load("[ FAIL ] Battery " + e);
		batteryDiv.textContent = "ERROR";
	}
}

// Themes

const rInput = document.getElementById("r");
const gInput = document.getElementById("g");
const bInput = document.getElementById("b");
const rootColor = document.documentElement;

const bgR = document.getElementById("bg-r");
const bgG = document.getElementById("bg-g");
const bgB = document.getElementById("bg-b");

const txtR = document.getElementById("txt-r");
const txtG = document.getElementById("txt-g");
const txtB = document.getElementById("txt-b");

let pointTemplate;

let colorConfig = {
	theme: "",
	bg: "",
	txt: ""
};

function setCookie(name, value, days = 7) {
	const d = new Date();
	d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
	document.cookie = `${name}=${JSON.stringify(value)};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
	const nameEQ = name + "=";
	const ca = document.cookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i].trim();
		if (c.indexOf(nameEQ) == 0) return JSON.parse(c.substring(nameEQ.length, c.length));
	}
	return null;
}

function updateColor() {
	const r = rInput.value || 0;
	const g = gInput.value || 0;
	const b = bInput.value || 0;
	const colorString = `rgb(${r}, ${g}, ${b})`;
	rootColor.style.setProperty("--theme", colorString);

	const bgr = bgR.value || 0;
	const bgg = bgG.value || 0;
	const bgb = bgB.value || 0;
	const bgString = `rgb(${bgr}, ${bgg}, ${bgb})`;
	rootColor.style.setProperty("--bg", bgString);
	document.body.style.backgroundColor = bgString;

	const tr = txtR.value || 0;
	const tg = txtG.value || 0;
	const tb = txtB.value || 0;
	const textColor = `rgb(${tr}, ${tg}, ${tb})`;
	rootColor.style.setProperty("--txt", textColor);

	const terminal = document.getElementById("terminalContent");
	const stdin = document.getElementById("stdin");

	if (terminal) terminal.style.color = textColor;
	if (stdin) stdin.style.color = textColor;

	colorConfig = {
		theme: colorString,
		bg: bgString,
		txt: textColor,
		raw: {
			main: [r, g, b],
			bg: [bgr, bgg, bgb],
			txt: [tr, tg, tb]
		}
	};

	setCookie("colorSettings", colorConfig.raw);

	if (pointTemplate) {
		pointTemplate.set("fill", am5.color(colorString));
	}
}

function setFullPreset(main, bg, txt) {
	[rInput.value, gInput.value, bInput.value] = main;
	[bgR.value, bgG.value, bgB.value] = bg;
	[txtR.value, txtG.value, txtB.value] = txt;
	updateColor();
}

function loadColors() {
	const saved = getCookie("colorSettings");
	if (saved) {
		[rInput.value, gInput.value, bInput.value] = saved.main;
		[bgR.value, bgG.value, bgB.value] = saved.bg;
		[txtR.value, txtG.value, txtB.value] = saved.txt;
	}
	updateColor();
}

[rInput, gInput, bInput, bgR, bgG, bgB, txtR, txtG, txtB].forEach(input => {
	input.addEventListener("input", updateColor);
});

document.getElementById("bgGreen").onclick = () => {
	setFullPreset([51, 255, 51], [0, 0, 0], [51, 255, 51]);
	setTimeout(updateColor, 10);
};

document.getElementById("bgAmber").onclick = () => {
	setFullPreset([255, 176, 0], [0, 0, 0], [255, 176, 0]);
	setTimeout(updateColor, 10);
};

document.getElementById("bgWhite").onclick = () => {
	setFullPreset([240, 255, 255], [0, 0, 0], [240, 255, 255]);
	setTimeout(updateColor, 10);
};

loadColors();

// Themes

const IMPERIAL_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 288 103' preserveAspectRatio='xMidYMid meet'%3E%3Cg transform='translate(38.75693,-216.41937)'%3E%3Cpath pathLength='1' fill='%230F0' d='m -35.934708,216.41937 8.880078,10.12341 86.028339,-3.58479 c 0,0 -2.087983,2.37169 -2.816365,4.55683 l -74.891034,7.22074 7.211962,7.46776 66.313263,-10.96677 c 0,0 -0.725019,1.85443 -0.725019,3.88349 l -56.8828333,14.46577 7.1685546,6.48644 49.5003367,-18.572 c 0,0 0.0067,3.00013 0.6165,4.27623 l -42.051696,21.08035 6.444051,4.69429 36.399845,-22.83012 c 0,0 1.06979,2.69192 1.962671,3.58481 l -28.206547,26.54255 5.675623,3.96824 24.74991,-28.24945 c 0.382665,0.89289 3.286104,2.60347 3.286104,2.60347 L 45.616902,282.1027 c 3.146348,2.12593 7.126697,0.89607 7.126697,0.89607 l 12.545486,-28.93208 c 2.423541,1.02044 4.096909,0.81078 4.096909,0.81078 l -8.662522,25.85943 c 4.081751,-0.6803 6.059062,-3.20032 6.059062,-3.20032 l 5.248775,-22.61672 c 1.913321,0.21259 3.840594,-0.17052 3.840594,-0.17052 -0.127561,2.76368 -2.986898,18.43452 -2.986898,18.43452 0,0 6.406468,-8.02391 7.894609,-8.44909 0,0 -2.30486,-8.37118 -2.43241,-10.32701 0,0 2.095685,-0.13142 3.413744,-1.15189 0,0 1.792404,5.55384 1.877404,7.33962 1.913321,-1.70074 3.115056,-4.26744 3.115056,-4.26744 0,0 -1.154594,-0.99568 -1.877404,-4.86481 0,-3e-5 4.315701,-1.61023 5.051372,0.0915 0.735658,1.70166 0.04766,7.04865 -4.119129,11.6406 0,0 -4.394112,6.87547 -8.050672,9.04391 1.78576,-0.12755 8.421396,2.37675 9.739458,5.6932 l 10.507368,-26.26921 -7.668265,-8.81651 c -12.712941,7.73831 -28.201831,6.05992 -30.229164,-0.11369 -2.02733,-6.17361 -0.422193,-16.12024 5.168162,-20.50469 1.812808,-1.42176 5.625761,-3.00274 5.93607,-5.80895 l -107.145912,0 z m 174.855478,0 c 0.31031,2.80621 4.12326,4.38719 5.93607,5.80895 5.59035,4.38445 7.19549,14.33108 5.16816,20.50469 -2.02733,6.17361 -17.51622,7.852 -30.22916,0.11369 l -7.66827,8.81651 10.50737,26.26921 c 1.31806,-3.31645 7.95369,-5.82075 9.73945,-5.6932 -3.65656,-2.16844 -8.05118,-9.04391 -8.05118,-9.04391 -4.16679,-4.59195 -4.85428,-9.93894 -4.11861,-11.6406 0.73566,-1.7017 5.05137,-0.0915 5.05137,-0.0915 -0.72281,3.86913 -1.87792,4.86481 -1.87792,4.86481 0,0 1.20225,2.5667 3.11557,4.26744 0.085,-1.78578 1.8774,-7.33962 1.8774,-7.33962 1.31806,1.02047 3.41375,1.15189 3.41375,1.15189 -0.12755,1.95583 -2.43241,10.32701 -2.43241,10.32701 1.48814,0.42518 7.89461,8.44909 7.89461,8.44909 0,0 -2.85934,-15.67084 -2.9869,-18.43452 0,0 1.92675,0.38311 3.84007,0.17052 l 5.24878,22.61672 c 0,0 1.97783,2.52002 6.05958,3.20032 l -8.66252,-25.85943 c 0,0 1.67337,0.20966 4.0969,-0.81078 l 12.54549,28.93208 c 0,0 3.98035,1.22986 7.1267,-0.89607 l -17.11214,-28.93208 c 0,0 2.90344,-1.71058 3.28611,-2.60347 l 24.74991,28.24945 5.67562,-3.96824 -28.20655,-26.54255 c 0.8929,-0.89289 1.96268,-3.58481 1.96268,-3.58481 l 36.39984,22.83012 6.44354,-4.69429 -42.05118,-21.08035 c 0.60979,-1.2761 0.6165,-4.27623 0.6165,-4.27623 l 49.49982,18.572 7.16907,-6.48644 -56.88283,-14.46577 c 0,-2.02906 -0.72503,-3.88349 -0.72503,-3.88349 l 66.31327,10.96677 7.21145,-7.46776 -74.89052,-7.22074 c -0.72838,-2.18514 -2.81637,-4.55683 -2.81637,-4.55683 l 86.02834,3.58479 8.88008,-10.12341 -107.14591,0 z m -19.75849,7.5246 -0.87075,1.35186 -9.109,0.21704 11.35228,3.9517 0.79065,5.89163 c 5.4606,-3.0177 2.80206,-4.88585 9.69966,-7.32875 l 0.40205,-2.36523 -3.60805,-0.23255 -0.81907,-0.62632 -7.83777,-0.85938 z m -40.989227,1.13792 0.933793,2.94556 c 6.897611,2.4429 4.239067,4.31105 9.699668,7.32875 l 0.790649,-5.89163 11.352277,-3.9517 -22.776387,-0.43098 z m 7.831563,1.00562 a 2.0836513,2.0836513 0 0 1 2.083594,2.0836 2.0836513,2.0836513 0 0 1 -2.083594,2.08411 2.0836513,2.0836513 0 0 1 -2.083594,-2.08411 2.0836513,2.0836513 0 0 1 2.083594,-2.0836 z m -6.979417,3.53932 c -1.681703,0.0345 -4.30289,0.69358 -6.097302,1.34669 0.19521,2.09548 1.381993,3.46651 1.939933,5.24516 0.199948,0.63741 0.379352,2.39744 0.580842,3.20807 0.201491,0.81063 0.999422,0.52814 0.999422,0.52814 0,0 -0.287237,-2.15585 1.29346,-4.3832 0,0 5.748271,-0.64616 6.538619,-1.79576 -1.939949,-1.22145 -2.446242,-3.15966 -3.952214,-3.95221 -0.286303,-0.15067 -0.742196,-0.20838 -1.30276,-0.19689 z m 52.081571,0 c -0.56056,-0.0115 -1.01697,0.0462 -1.30328,0.19689 -1.50597,0.79255 -2.01174,2.73076 -3.95169,3.95221 0.79035,1.1496 6.53862,1.79576 6.53862,1.79576 1.5807,2.22735 1.29294,4.3832 1.29294,4.3832 0,0 0.79845,0.28249 0.99994,-0.52814 0.20149,-0.81063 0.38089,-2.57066 0.58084,-3.20807 0.55794,-1.77865 1.74473,-3.14968 1.93994,-5.24516 -1.79442,-0.65311 -4.41561,-1.31221 -6.09731,-1.34669 z m -35.251076,0.12971 -3.728453,1.02268 -1.623674,6.37429 8.779825,9.32088 4.449858,-11.06496 -7.877556,-5.65289 z m 18.420586,0 -7.87756,5.65289 4.44986,11.06496 8.77982,-9.32088 -1.62367,-6.37429 -3.72845,-1.02268 z m -9.2103,6.1991 -16.05121,47.99759 7.128245,4.63383 -7.020758,12.33154 3.114021,2.89907 6.335014,-13.95887 1.297078,0.92501 -6.021337,14.64459 3.972882,3.54345 4.294835,-16.8584 c 0.98381,-0.46297 1.28055,0.008 1.39629,0.64442 l -3.22151,18.57613 4.77645,4.93922 4.77646,-4.93922 -3.22151,-18.57613 c 0.11574,-0.63627 0.41248,-1.10739 1.3963,-0.64442 l 4.29482,16.8584 3.97289,-3.54345 -6.02134,-14.64459 1.29708,-0.92501 6.33501,13.95887 3.11403,-2.89907 -7.02077,-12.33154 7.12773,-4.63383 -16.0507,-47.99759 z m 15.20786,50.53129 -4.55269,2.62567 7.82071,10.20093 c 0,0 -0.909,1.07802 -0.86403,1.7172 0.0357,0.50797 0.87126,1.25524 0.87126,1.25524 l -4.08812,4.71701 c 0,0 -2.41939,-0.12083 -3.39307,0.43254 1.01011,0.702 1.42208,0.67871 1.76061,1.30742 0.0484,1.11231 -0.14521,2.31664 -0.14521,2.31664 1.08986,-0.40312 2.13612,-0.81 3.31763,-1.11258 1.88611,0.3869 8.82944,3.99098 8.82944,3.99098 0,0 -5.32048,-6.37823 -5.6963,-7.18355 0.16107,-0.64426 2.04846,-2.70734 2.04846,-2.70734 0.48319,-0.59055 0.87216,-0.64265 1.24798,0.0553 0,0 0.91694,1.21042 1.38441,2.78175 0.0717,0.24093 -1.00169,1.74895 -0.86713,1.98025 0.30491,0.52406 1.68274,-0.12136 2.0743,0.37465 1.89767,2.40382 2.88792,5.81234 2.97036,6.19704 -0.64426,1.2885 -3.17811,4.2199 -3.17811,4.2199 0,0 3.44657,-1.26662 5.18108,-1.75546 0.76104,-0.21447 1.45986,1.96165 1.45986,1.96165 0.32213,-0.42953 0.3219,-5.95125 0.2682,-7.1324 -0.46825,-0.9625 -1.99756,-3.19122 -3.59926,-5.38314 -0.27253,-0.37293 0.61397,-1.80858 0.34572,-2.16937 -0.40199,-0.54062 -1.46534,0.0933 -1.95079,-0.24545 -1.21611,-0.84876 -1.86552,-2.18797 -1.86552,-2.18797 -0.26845,-0.64426 0.0631,-1.03209 0.65371,-1.13948 0,0 1.81971,-0.38479 3.02875,-0.33642 3.2213,4.99303 3.85507,9.69089 3.85507,9.69089 0,0 0.6687,-8.21526 0.0884,-11.31043 0,0 2.46218,-1.75668 2.31304,-2.20917 -0.11909,-0.36131 -2.5709,0.0579 -2.5709,0.0579 l -0.45114,-1.68518 c -0.13821,-0.581 -0.61514,-0.62955 -0.85007,0.0465 l -0.5948,1.95543 -6.13244,1.19891 c -0.38449,0.12816 -0.0414,-1.09736 -0.64492,-1.63555 -0.4078,-0.36364 -1.90089,0.0294 -1.98748,-0.18709 l -6.08697,-10.70321 z m -30.560922,0.0966 -7.102409,12.34705 c -0.214751,0.53684 -0.682276,0.53824 -1.326533,0.32351 l -8.858893,-1.71773 0.322461,12.93876 c 0,0 0.536612,-4.45606 3.757911,-9.44904 l 3.319177,0.57825 c 0.59059,0.10736 0.922158,0.49522 0.653706,1.13948 0,0 -6.925633,7.99949 -7.892023,9.98593 -0.05369,1.18115 0.429762,4.1878 0.751893,4.61729 0,0 1.279154,0 2.040183,0.21498 1.734521,0.48884 4.939234,2.09394 4.939234,2.09394 0,0 -3.114167,-3.2213 -3.758428,-4.5098 0.161071,-0.75163 5.852356,-11.38227 5.852356,-11.38227 0.375822,-0.69794 1.054703,-0.30736 1.537891,0.28319 0,0 1.79075,1.91836 1.95182,2.56264 -0.375819,0.80532 -5.744868,7.08639 -5.744868,7.08639 l 11.489221,-5.58313 -5.691126,-6.54997 c -0.69795,-0.75166 -0.680488,-0.80452 -0.08992,-1.71723 l 8.3044,-10.68512 -4.456057,-2.57712 z' /%3E%3C/g%3E%3C/svg%3E\")";

function setThemeSoviet() {
	document.getElementById("container").style.setProperty("--bg-image", "");
	setCookie("appliedTheme", "sovietwave", 30);
	load("[ OK ] Theme set to Sovietwave");
}

function setThemeImperial() {
	document.getElementById("container").style.setProperty("--bg-image", IMPERIAL_URI);
	setCookie("appliedTheme", "imperial", 30);
	load("[ OK ] Theme set to Imperial");
}

function loadAppliedTheme() {
	const savedTheme = getCookie("appliedTheme");
	const container = document.getElementById("container");
	if (savedTheme === "imperial") {
		setThemeImperial();
	}
}

loadAppliedTheme();

// Fonts

const fontSelect = document.getElementById("fontSelect");

function setGlobalFont(fontFamily) {
	document.body.style.fontFamily = fontFamily;

	let fontStyle = document.getElementById("dynamicFontFace");
	if (!fontStyle) {
		fontStyle = document.createElement("style");
		fontStyle.id = "dynamicFontFace";
		document.head.appendChild(fontStyle);
	}

	fontStyle.textContent = `
		body, input, button, textarea, .terminal, .mini-info, b, span, 
		#codebox, #codeBlock, #lineNumbers, #preCode code { 
			font-family: "${fontFamily}", monospace !important; 
		}
	`;

	setCookie("selectedFont", fontFamily, 30);
}

fontSelect.addEventListener("change", (e) => {
	setGlobalFont(e.target.value);
	load(`[ OK ] Font set to ${e.target.value}`);
});

function loadSavedFont() {
	const savedFont = getCookie("selectedFont");
	if (savedFont) {
		setGlobalFont(savedFont);
		fontSelect.value = savedFont;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	loadSavedFont();
});

// Admin

var admin = false;

function login() {
	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;

	if (CONFIG.ADMINS[email] && CONFIG.ADMINS[email].password === password) {
		document.getElementById("login").style.display = "none";
		document.getElementById("admin").style.display = "block";
		document.getElementById("commandInput").style.display = "block";
		document.querySelectorAll(".user").textContent = email;
		closeSide();
		document.getElementById("adminFrame").src = "https://docs.google.com/document/d/1Bz3dKVIdB5TTtfKcIagypFutgDw-PpwQhGuxRZK4CgU/edit?tab=t.sul0nicbvnre";

		admin = true;
	} else {
		document.getElementById("adminAlert").style.display = "block";
	}
}

// Internet

const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

function checkConnection() {
	if (!shouldRun()) {
		document.getElementById("status").textContent = "Calculating...";
		return;
	}

	try {
		document.getElementById("status").textContent = connection.effectiveType;
		load(`[ OK ] Network status fetched: ${connection.effectiveType}`);
	} catch (e) {
		load("[ FAIL ] Network status " + e);
		document.getElementById("status").textContent = "ERROR";
	}
}

// IP

let userData = null;
let isGlobeInit = false;
let root, chart, rotationAnimation;
let polygonTemplate, graticuleTemplate, circleTemplate;

document.addEventListener("DOMContentLoaded", async function() {
	await fetchIPData();
});

async function fetchIPData() {
	if (userData) return userData;

	try {
		const response = await fetch("https://ipapi.co/json/");

		if (!response.ok) throw new Error("Network response was not ok");

		const data = await response.json();
		userData = {
			ip: data.ip,
			lat: data.latitude,
			lon: data.longitude
		};

		document.getElementById("ip").textContent = userData.ip;
		document.getElementById("coords").textContent = `${userData.lat}, ${userData.lon}`;
		if (typeof load === "function") load(`[ OK ] IP fetched: ${userData.ip}`);

		return userData;
	} catch (e) {
		document.getElementById("ip").textContent = "ERROR";
		document.getElementById("coords").textContent = "ERROR";
		if (typeof load === "function") load("[ FAIL ] IP fetch error: " + e.message);
		userData = {
			ip: 0,
			lat: 0,
			lon: 0
		};

		return null;
	}
}

// Weather

async function updateMarsWeatherTable() {
	const res = await fetch("https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json");
	const data = await res.json();

	let sols = Object.values(data.soles)
		.filter(sol => sol && sol.max_temp !== null && sol.min_temp !== null && sol.sol && sol.terrestrial_date)
		.sort((a, b) => new Date(b.terrestrial_date) - new Date(a.terrestrial_date));

	if (sols.length > 0) {
		const latest = sols[0];
		document.getElementById("high").textContent = `${latest.max_temp}°C`;
		document.getElementById("low").textContent = `${latest.min_temp}°C`;
		document.getElementById("sol").textContent = `${latest.sol}`;
		load(`[ OK ] Curiosity Rover REMS connected: ${latest.max_temp}°C - ${latest.min_temp}°C`);
	} else {
		load("[ FAIL ] Curiosity Rover REMS unable to connect");
	}
}

updateMarsWeatherTable();

// World view

async function initMap() {
	if (root) return;

	const data = await fetchIPData();
	if (!data) return;

	root = am5.Root.new("chartdiv");
	 root._logo.dispose();
	root.setThemes([am5themes_Animated.new(root)]);

	chart = root.container.children.push(am5map.MapChart.new(root, {
		panX: "rotateX",
		panY: "rotateY",
		projection: am5map.geoOrthographic(),
		rotationX: -data.lon,
		rotationY: -data.lat,
		maxZoomLevel: 1
	}));

	let graticuleSeries = chart.series.unshift(am5map.GraticuleSeries.new(root, {
		step: 10
	}));
	graticuleTemplate = graticuleSeries.mapLines.template;

	let polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {
		geoJSON: am5geodata_worldLow
	}));
	polygonTemplate = polygonSeries.mapPolygons.template;

	let pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
	pointSeries.bullets.push(() => {
		const circle = am5.Circle.new(root, {
			radius: 5
		});
		circleTemplate = circle;
		return am5.Bullet.new(root, {
			sprite: circle
		});
	});

	pointSeries.data.setAll([{
		geometry: {
			type: "Point",
			coordinates: [data.lon, data.lat]
		}
	}]);

	refreshColors();

	const toggleSpin = () => {
		if (rotationAnimation) {
			rotationAnimation.stop();
			rotationAnimation = null;
		} else {
			rotationAnimation = chart.animate({
				key: "rotationX",
				from: chart.get("rotationX"),
				to: chart.get("rotationX") + 360,
				duration: 30000,
				loops: Infinity
			});
		}
	};

	const goHome = () => {
		if (rotationAnimation) toggleSpin();
		chart.animate({
			key: "rotationX",
			to: -data.lon,
			duration: 1000,
			easing: am5.ease.out(am5.ease.cubic)
		});
		chart.animate({
			key: "rotationY",
			to: -data.lat,
			duration: 1000,
			easing: am5.ease.out(am5.ease.cubic)
		});
	};

	document.getElementById("spinBtn").onclick = toggleSpin;
	document.getElementById("homeBtn").onclick = goHome;

	chart.appear();

	if (!isGlobeInit) {
		if (typeof load === "function") load("[ OK ] Global Holographic Projection connected");
		isGlobeInit = true;
	}
}

function refreshColors() {
	if (!root) return;
	const style = getComputedStyle(document.documentElement);
	const txtColor = am5.color(style.getPropertyValue("--txt").trim() || "#FFFFFF");
	const themeColor = am5.color(style.getPropertyValue("--theme").trim() || "#00FF00");

	if (graticuleTemplate) graticuleTemplate.setAll({
		stroke: txtColor,
		strokeOpacity: 0.25
	});
	if (polygonTemplate) polygonTemplate.setAll({
		stroke: txtColor,
		strokeWidth: 1,
		fillOpacity: 0
	});
	if (circleTemplate) circleTemplate.set("fill", themeColor);
}

setInterval(() => {
	refreshColors();
}, 1000);

// Code editor

const codebox = document.getElementById("codebox");
const codeBlock = document.getElementById("codeBlock");
const lineNumbers = document.getElementById("lineNumbers");

// Line numbers

function updateLineNumbers() {
	let lineCount = codebox.value.split("\n").length;
	let lines = "";
	for (let i = 1; i <= lineCount; i++) {
		lines += i + "\n";
	}
	lineNumbers.textContent = lines;
}

function updateCode() {
	let content = codebox.value;
	codeBlock.textContent = content;

	updateLineNumbers();
	highlightJS();
}

function highlightJS() {
	document.querySelectorAll("pre code").forEach((el) => {
		hljs.highlightElement(el);
	});
	load("[ OK ] Code Editor loaded");
}

codebox.addEventListener("input", () => {
	updateCode();
	setTheme();
});

codebox.addEventListener("scroll", () => {
	codeBlock.scrollTop = codebox.scrollTop;
	codeBlock.scrollLeft = codebox.scrollLeft;
	lineNumbers.scrollTop = codebox.scrollTop;
});

codebox.addEventListener('keydown', (e) => {
	if (e.key === 'Tab') {
		e.preventDefault();
		const {
			selectionStart,
			selectionEnd,
			value
		} = codebox;
		const spaces = "  ";
		codebox.value = value.substring(0, selectionStart) + spaces + value.substring(selectionEnd);
		codebox.selectionStart = codebox.selectionEnd = selectionStart + spaces.length;
	}
});

const themeLink = document.getElementById("theme");

document.getElementById("selectStyle").addEventListener("change", (e) => {
	themeLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${e.target.value}.min.css`;

	themeLink.onload = () => {
		setTheme();
	};
});

function setTheme() {
	const r = document.documentElement;
	const themeLink = document.getElementById("theme");

	if (!themeLink) return;

	const sheet = Array.from(document.styleSheets).find(s => s.ownerNode === themeLink);
	if (!sheet) return;

	let rules;
	try {
		  rules = Array.from(sheet.cssRules || sheet.rules);
	} catch (e) {
		console.warn("Access to stylesheet denied (CORS issue or not loaded yet)");
		return;
	}

	const getStyle = (selector) => {
		const rule = rules.find(rule => rule.selectorText && rule.selectorText.split(',').some(s => s.trim() === selector));
		return rule ? rule.style : null;
	};

	const hljs = getStyle(".hljs");
	const subst = getStyle(".hljs-subst");
	const comment = getStyle(".hljs-comment");

	if (hljs) {
		const bgColor = hljs.backgroundColor || hljs.background;
		if (bgColor) r.style.setProperty("--bg", bgColor);

		const txtColor = hljs.color || (subst ? subst.color : null);
		if (txtColor) r.style.setProperty("--txt", txtColor);
	}

	if (comment && comment.color) {
		r.style.setProperty("--theme", comment.color);
	} else if (hljs && hljs.color) {
		r.style.setProperty("--theme", hljs.color);
	}
}

codebox.addEventListener("input", function() {
	localStorage.setItem("savedCode", this.value);
});

window.addEventListener("load", function() {
	const savedData = localStorage.getItem("savedCode");
	if (savedData) {
		codebox.value = savedData;
		updateCode();
	}
});

document.getElementById("selectLanguage").addEventListener("change", function() {
	document.getElementById("codeBlock").className = this.value;

	const selectElement = document.getElementById("selectLanguage");
	const selectedIndex = selectElement.selectedIndex;
	const hasSavedContent = localStorage.getItem("savedCode");

	if (selectedIndex === 0) {
		document.getElementById("rte").style.display = "none";
		document.getElementById("preview-window").style.display = "block";

		if (!hasSavedContent) {
			codebox.value = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Title</title>\n<style>\n</style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n<script>\n<\/script>\n</body>\n</html>';
		}
	} else if (selectedIndex === 1) {
		document.getElementById("preview-window").style.display = "none";
		document.getElementById("rte").style.display = "block";

		if (!hasSavedContent) {
			codebox.value = 'print("Hello, World!")';
		}
		initializePyodide();
	}

	updateCode();
	setTheme();
});

window.onload = function() {
	localStorage.clear();
};

function runEditor() {
	const selectElement = document.getElementById("selectLanguage");
	const selectedIndex = selectElement.selectedIndex;

	if (selectedIndex === 0) {
		const preview = document.getElementById("preview-window").contentDocument;

		preview.open();
		preview.write(codebox.value);
		preview.close();
	} else if (selectedIndex === 1) {
		evaluatePython();
	}
}

codebox.value = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Title goes here</title>\n<style>\n /* CSS goes here */\n</style>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n<script>\n  // JS goes here\n<\/script>\n</body>\n</html>';

runEditor();
updateCode();

// Python editor

const rte = document.getElementById("rte");

function addToOutput(s) {
	rte.value += `${s}\n`;
	rte.scrollTop = rte.scrollHeight;
}

async function initializePyodide() {
	addToOutput("Initializing...");
	window.pyodide = await loadPyodide({
		stdout: addToOutput,
		stderr: addToOutput
	});
	addToOutput("Ready");
}

async function evaluatePython() {
	const pythonCode = codebox.value;

	try {
		await pyodide.loadPackagesFromImports(pythonCode, addToOutput, addToOutput);
		let result = await pyodide.runPythonAsync(pythonCode);

		if (result !== undefined) {
			addToOutput(`${result}`);
		}
	} catch (e) {
		addToOutput(`ERROR: ${e}`);
	}
}

// Commands

var stdout = document.getElementById("stdout");
var check = 0;

const input = document.getElementById("stdin");
const output = document.getElementById("stdout");

input.addEventListener("keydown", function(e) {
	if (e.key === "Enter") {
		const command = input.value;
		output.innerHTML += `<b>${document.getElementById("email").value || "guest@terminal"}:~$</b> ${command}<br>`;
		handleCommand(command);
		input.value = "";
		const scroll = document.getElementById("commandInput");

		scroll.scrollIntoView({
			block: "end"
		});
	}
});

function handleCommand(cmd) {
	let response = "";
	switch (cmd.toLowerCase()) {
		case "help":
			response = "List of available commands: about, games, youtube, telescope, radio, editor, theme, login, clear";
			break;
		case "about":
			response = `The TERMINAL is a repository of free games, proxies, and unblocked tools. All resources have been checked for malware.<br><br>
				Special thanks to the <a href="https://docs.google.com/document/d/1_FmH3BlSBQI7FGgAQL59-ZPe8eCxs35wel6JUyVaG8Q/edit?tab=t.0">Ultimate Game Stash</a> for providing the game files. All rights go to their respective owners.
			`;
			break;
		case "games":
			document.getElementById("commandInput").style.display = "none";
			document.getElementById("games").style.display = "block";
			break;
		case "youtube":
			document.getElementById("commandInput").style.display = "none";
			document.getElementById("youtube").style.display = "block";
			document.getElementById("query").focus();
			break;
		case "telescope":
			document.getElementById("telescope").style.display = "block";
			document.getElementById("commandInput").style.display = "none";
			break;
		case "radio":
			document.getElementById("radio").style.display = "block";
			document.getElementById("commandInput").style.display = "none";
			break;
		case "editor":
			document.getElementById("html").style.display = "block";
			document.getElementById("terminalContent").style.display = "none";
			closeSide();
			setTheme(); 
			updateCode(); 

			isCrtEnabled = true;
			toggleCrt();
			document.body.style.textShadow = "none";
			break;
		case "theme":
			document.getElementById("themeSetting").style.display = "block";
			document.getElementById("commandInput").style.display = "none";
			break;
		case "login":
			document.getElementById("login").style.display = "block";
			document.getElementById("commandInput").style.display = "none";
			break;
		case "admin":
			if (admin === true) {
				document.getElementById("admin").style.display = "block";
			} else {
				response = "Access denied.";
			}
			break;
		case "furries are cringe":
			response = "I agree"; // Am I wrong?
			break;
		case "clear":
			output.textContent = "";
			return;
		default:
			response = `ERROR: Command not found: ${cmd}`;
	}
	output.innerHTML += `${response}<br>`;
}

// Search

document.getElementById("fileSearch").focus();

document.body.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		e.preventDefault();

		document.querySelectorAll(".program").forEach(el => {
			el.style.display = "none";
		});

		const terminal = document.getElementById("terminalContent");
		const cmdInput = document.getElementById("commandInput");
		const stdin = document.getElementById("stdin");

		terminal.style.display = "block";
		cmdInput.style.display = "block";

		if (colorConfig) {
			terminal.style.color = colorConfig.theme;
			stdin.style.color = colorConfig.theme;

			document.body.style.backgroundColor = colorConfig.bg;

			rootColor.style.setProperty("--theme", colorConfig.theme);
			rootColor.style.setProperty("--bg", colorConfig.bg);
			rootColor.style.setProperty("--txt", colorConfig.txt);
		}
		stdin.focus();
	}
});

function handleSearch() {
	const query = document.getElementById("fileSearch").value.toLowerCase();
	generateAllSections(query);
}

// Games

const blacklistArr = ["clclassof09", "cldokidokiliteratureclub", "clskibididibidygyattohiorizzingallovertheplacestillwatermangotheoryfemboydrool", "clskibidiinthebackrooms", "clyanderesimulator", "clyouvs100skibidi", "clyouvs100skibidi(1)"];

function handleBlacklistedFile() {
	initReactor();
	document.getElementById("terminalContent").style.display = "none";
	document.getElementById("chernobyl").style.display = "block";
	closeSide();
}

function formatBytes(bytes) {
	if (!bytes || isNaN(bytes)) return "ERROR";
	const b = Number(bytes);
	if (b < 1024) return b + " bytes";
	const kb = b / 1024;
	if (kb < 1024) return kb.toFixed(1) + " KB";
	return (kb / 1024).toFixed(2) + " MB";
}

const sizeObserver = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			const btn = entry.target;
			const url = btn.dataset.url;
			const sizeInfo = btn.querySelector(".file-size");

			sizeObserver.unobserve(btn);

			fetch(url, {
					method: 'HEAD'
				})
				.then(res => {
					const size = res.headers.get("content-length");
					sizeInfo.textContent = formatBytes(size);
				})
				.catch(() => {
					sizeInfo.textContent = " ERROR";
				});
		}
	});
}, {
	rootMargin: "50px"
});

function generateAllSections(filter = "") {
	const container = document.getElementById("sections-container");
	const fileCount = document.getElementById("fileCount");
	container.textContent = "";

	const allChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	const filesByChar = {};
	allChars.forEach(char => filesByChar[char] = []);

	let totalFiles = 0;

	files.forEach(file => {
		const lower = file.toLowerCase();
		if (lower.includes(filter.toLowerCase()) && lower.startsWith("cl")) {
			const aftercl = lower.substring(2);
			if (aftercl.length > 0) {
				const firstChar = aftercl[0].toUpperCase();
				if (filesByChar[firstChar]) {
					filesByChar[firstChar].push(file);
					totalFiles++;
				}
			}
		}
	});

	if (fileCount) {
		if (totalFiles > 1) {
			fileCount.textContent = totalFiles + " items";
		} else {
			fileCount.textContent = totalFiles + " item";
		}
	}

	allChars.forEach(char => {
		if (filter !== "" && filesByChar[char].length === 0) return;

		const section = document.createElement("div");
		section.className = "letter-section";

		const header = document.createElement("div");
		header.className = "letter-header";
		header.textContent = char;
		section.appendChild(header);

		const buttonsContainer = document.createElement("div");
		buttonsContainer.className = "buttons-container";

		if (filesByChar[char].length > 0) {
			filesByChar[char].forEach(file => {
				const btn = document.createElement("button");
				btn.className = "file-button";

				const titleSpan = document.createElement("span");
				titleSpan.className = "file-title";
				titleSpan.textContent = file.replace(/^cl/, "");

				const sizeInfo = document.createElement("span");
				sizeInfo.className = "file-size";
				sizeInfo.textContent = "Calculating...";

				btn.appendChild(titleSpan);
				btn.appendChild(sizeInfo);

				const normalized = file.includes(".") ? file : file + ".html";
				const encoded = encodeURIComponent(normalized);
				const url = `https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/${encoded}?t=${Date.now()}`;

				btn.dataset.url = url;
				sizeObserver.observe(btn);

				btn.onclick = () => {
					if (typeof blacklistArr !== 'undefined' && blacklistArr.includes(file.toLowerCase())) {
						handleBlacklistedFile();
					} else {
						fetch(url)
							.then(res => res.text())
							.then(text => {
								const newWin = window.open("about:blank", "_blank");
								if (newWin) {
									newWin.document.open();
									newWin.document.write(text);
									newWin.document.close();
								}
							});
					}
				};

				buttonsContainer.appendChild(btn);
			});
		} else {
			const emptyMsg = document.createElement("div");
			emptyMsg.className = "empty-message";
			emptyMsg.textContent = "ERROR: No files have been found";
			buttonsContainer.appendChild(emptyMsg);
		}

		section.appendChild(buttonsContainer);
		container.appendChild(section);
	});
}

document.addEventListener("DOMContentLoaded", function() {
	generateAllSections();
	load("[ OK ] Games loaded");
});

// Telescope

const imagePaths = ["potw1924a.jpg", "heic2007a.jpg", "heic1509a.jpg", "heic1501a.jpg", "potw2050a.jpg", "heic2018b.jpg", "heic0715a.jpg", "heic1608a.jpg", "potw1345a.jpg", "heic1307a.jpg", "heic0817a.jpg", "heic0406a.jpg", "potw2049a.jpg", "opo0328a.jpg", "heic0702a.jpg", "heic0515a.jpg", "heic1808a.jpg", "potw1811a.jpg", "heic0910h.jpg", "heic0601a.jpg", "heic0514a.jpg", "heic0506b.jpg", "heic0506a.jpg", "opo0511a.jpg", "heic0503a.jpg", "opo0501a.jpg", "heic0206c.jpg", "heic0206a.jpg", "heic0206b.jpg", "heic0109a.jpg", "opo0006a.jpg", "heic2105a.jpg", "heic1302a.jpg", "heic1105a.jpg", "heic1104a.jpg", "heic1007a.jpg", "heic0910s.jpg", "heic0910i.jpg", "heic0905a.jpg", "heic0719a.jpg", "heic0707a.jpg", "heic0706a.jpg", "opo0624a.jpg", "heic0604a.jpg", "heic0602a.jpg", "opo0028a.jpg", "opo9941a.jpg", "potw2114a.jpg", "potw2108a.jpg", "potw2036a.jpg", "heic1516a.jpg", "heic1310a.jpg", "heic0411a.jpg", "opo0123a.jpg", "potw2110a.jpg", "potw1441a.jpg", "heic1406a.jpg", "heic1305a.jpg", "heic1110a.jpg", "heic0814a.jpg", "opo0010a.jpg", "potw1933a.jpg", "potw1932a.jpg", "potw1847a.jpg", "potw1805a.jpg", "potw1542a.jpg", "potw2144a.jpg", "potw1921a.jpg", "heic1907a.jpg", "potw1850a.jpg", "potw1849a.jpg", "heic1811a.jpg", "potw1822a.jpg", "heic1806a.jpg", "potw1804a.jpg", "potw1751a.jpg", "heic1712a.jpg", "heic1520a.jpg", "heic1518a.jpg", "heic1503a.jpg", "heic1502a.jpg", "opo1438b.jpg", "heic1323a.jpg", "heic0910e.jpg", "heic0814b.jpg", "potw2044a.jpg", "potw2006a.jpg", "potw1940a.jpg", "potw1924a.jpg", "heic2017a.jpg"];

const bg = document.getElementById("bg");

function setRandomBackground() {
	const randomIndex = Math.floor(Math.random() * imagePaths.length);
	const selectedImagePath = imagePaths[randomIndex];
	bg.style.backgroundImage = `url("https://cdn.esahubble.org/archives/images/wallpaper2/${selectedImagePath}")`;

	load("[ OK ] GLAZ-1 Orbital Telescope connected");
}

window.onload = setRandomBackground;

function toggleBackground() {
	bg.classList.toggle("invisible");

	if (bg.classList.contains("invisible")) {
		document.getElementById("teleStatus").textContent = "> STATUS: Deactivated";
	} else {
		document.getElementById("teleStatus").textContent = "> STATUS: Activated";
	}
}

// Radio and YouTube

const songData = [{
		id: "Z3Ia6vV9pXk",
		title: "ППК - Воскрешение"
	},
	{
		id: "G0HsHQe-dT4",
		title: "Gummy Boy - Don't Leave"
	},
	{
		id: "ZG5NA8Ni7Ns",
		title: "PRNRML - Загадка 1"
	},
	{
		id: "d5HQdXkkfso",
		title: "Зодиак - Зодиак"
	},
	{
		id: "rQ6J2Qf2MXA",
		title: "Творожное озеро - Гроза (vwqp remix)"
	},
	{
		id: "UV06-kggQpg",
		title: "Dmitriy Ivankov - Phobos"
	},
	{
		id: "mkUOEQZwCaI",
		title: "Наукоград - Время"
	},
	{
		id: "ve81BNWbC5s",
		title: "Priroda - 8080"
	},
	{
		id: "fOlCt6pVUwY",
		title: "NTorchestra - Млечными путями в Прекрасное далеко"
	}
];

let radioPlayer;
let searchPlayer;

function getRandomSong() {
	return songData[Math.floor(Math.random() * songData.length)];
}

function onYouTubeIframeAPIReady() {
	const firstSong = getRandomSong();

	radioPlayer = new YT.Player("radioPlayer", {
		height: "0",
		width: "0",
		videoId: firstSong.id,
		playerVars: {
			"autoplay": 1,
			"controls": 0
		},
		events: {
			"onReady": (e) => updateTitleDisplay(firstSong.title),
			"onStateChange": onRadioStateChange
		}
	});

	searchPlayer = new YT.Player("mainVideoDisplay", {
		height: "360",
		width: "640",
		videoId: "",
		events: {
			"onStateChange": onSearchPlayerStateChange
		}
	});
}

function onRadioStateChange(event) {
	if (event.data === YT.PlayerState.ENDED) {
		const nextSong = getRandomSong();
		radioPlayer.loadVideoById(nextSong.id);
		updateTitleDisplay(nextSong.title);
	}
}

function onSearchPlayerStateChange(event) {
	if (event.data === YT.PlayerState.PLAYING) {
		radioPlayer.pauseVideo();
		document.getElementById("playBtn").textContent = "> PLAY";
	} else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
		radioPlayer.playVideo();
		document.getElementById("playBtn").textContent = "> PAUSE";
	}
}

const searchBtn = document.getElementById("youtubeSearch");
searchBtn.addEventListener("click", searchVideos);

async function searchVideos() {
	const query = document.getElementById("query").value;
	if (!query) return alert("Enter a search term");

	const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${query}&type=video&key=${CONFIG.YOUTUBE_API_KEY}`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		displayResults(data.items);
		document.getElementById("videoDisplay").style.display = "none";
	} catch (e) {
		document.getElementById("results").textContent = "ERROR: " + e;
	}
}

function displayResults(videos) {
	const resultsDiv = document.getElementById("results");
	resultsDiv.textContent = "";
	videos.forEach(video => {
		const {
			title,
			thumbnails,
			channelTitle
		} = video.snippet;
		const videoId = video.id.videoId;

		const card = document.createElement("div");
		card.className = "video-card";
		card.textContent = `
			<img src="${thumbnails.medium.url}" alt="${title}">
			<p>${title}</p>
			<span>${channelTitle}</span>
		`;

		card.onclick = () => {
			document.getElementById("videoDisplay").style.display = "block";
			document.getElementById("playingTitle").innerText = title;
			searchPlayer.loadVideoById(videoId);
			const vid = document.getElementById("videoDisplay");
			vid.scrollIntoView({
				behavior: "smooth"
			});
		};
		resultsDiv.appendChild(card);
	});
}

function togglePlayback() {
	const btn = document.getElementById("playBtn");
	if (radioPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
		radioPlayer.playVideo();
		btn.textContent = "> PAUSE";
	} else {
		radioPlayer.pauseVideo();
		btn.textContent = "> PLAY";
	}
}

function updateTitleDisplay(title) {
	document.getElementById("songTitle").textContent = `NOW PLAYING: ${title}`;
}

// Loading screen

function load(msg) {
	const newItem = document.createElement("li");
	newItem.classList.add("stdout");

	newItem.textContent = msg;
	document.getElementById("outputList").appendChild(newItem);

	window.addEventListener("load", (event) => {
		setTimeout(showSplash, 500)
	});
}

function showSplash() {
	document.getElementById("outputList").style.display = "none";
	document.getElementById("splash").style.display = "block";
	document.getElementById("splash").classList.add("fade-in");
	setTimeout(showTerminal, 3000);
}

function showTerminal() {
	document.getElementById("terminalContent").classList.add("fade-in");
	document.getElementById("bg").classList.add("fade-in-bg");
	setTimeout(openSide, 1500);
	setTimeout(() => {
		document.getElementById("terminalContent").style.opacity = "1";
		document.getElementById("terminalContent").classList.remove("fade-in");
	}, 1500);
}

// Glitch effect

const container = document.querySelectorAll(".container");
const body = document.querySelectorAll("*");
const filter = document.getElementById("displacement");
const noise = document.querySelector("feTurbulence");
const glowline = document.getElementById("glowline");
const scanline = document.getElementById("scanline");

let isCrtEnabled = true;

function triggerGlitch() {
	if (!isCrtEnabled) {
		filter.setAttribute("scale", 0);
		return;
	}

	noise.setAttribute("seed", Math.random() * 100);
	const intensity = Math.random() * 5;
	filter.setAttribute("scale", intensity);

	const duration = Math.random() * 200 + 50;

	setTimeout(() => {
		filter.setAttribute("scale", 0);
		if (isCrtEnabled) {
			const nextGlitch = Math.random() * 1500 + 500;
			setTimeout(triggerGlitch, nextGlitch);
		}
	}, duration);
}

function toggleCrt() {
	isCrtEnabled = !isCrtEnabled;

	container.forEach(container => {
		if (isCrtEnabled) {
			container.style.filter = "url(#chromatic-aberration) url(#glitch)";
			body.forEach(element => {
				element.style.textShadow = "0 0 5px var(--txt)";
			});

		} else {
			container.style.filter = "none";
			body.forEach(element => {
				element.style.textShadow = "none";
			});
		}
	});

	if (isCrtEnabled) {
		triggerGlitch();
		glowline.style.display = "block";
		scanline.style.display = "block";
		document.body.classList.add("flicker");
	} else {
		filter.setAttribute("scale", 0);
		glowline.style.display = "none";
		scanline.style.display = "none";
		document.body.classList.remove("flicker");
	}
}

triggerGlitch();
