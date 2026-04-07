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
	}, 500);
});

// Battery saver (very important)

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

// Telling time, military style

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
	document.getElementById("year").innerHTML = year;

	let month = months[d.getMonth()];
	document.getElementById("month").innerHTML = month;

	let day = d.getDate();
	document.getElementById("day").innerHTML = day;

	load(`[ OK ] Terran Orbital Revolution synced: ${day} ${month} ${year}`);
}

// That timer that shows how chronically online you are

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

// If you don't have a Chromium-based browser, not much will happen but some of the APIs won't work, which is sad

function checkBrowser() {
	const browser = document.getElementById("browser");
	const userAgent = navigator.userAgent;

	if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
		browser.innerHTML = "CHROME";
		load(`[ OK ] Operating System fetched: ${userAgent}`);
	} else if (userAgent.includes("Firefox")) {
		browser.innerHTML = "FIREFOX ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	} else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
		browser.innerHTML = "SAFARI ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	} else if (userAgent.includes("Edg")) {
		browser.innerHTML = "EDGE";
		load(`[ OK ] Operating System fetched: ${userAgent}`);
	} else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
		browser.innerHTML = "OPERA";
		load(`[ OK ] Operating System fetched: ${userAgent}`);
	} else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
		browser.innerHTML = "IE ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	} else {
		browser.innerHTML = "UNKNOWN ⚠";
		load(`[ WARN ] Non-Chromium Operating System detected: ${userAgent}`);
	}
}

// Charts for nerds

const charts = {
	mem: { el: document.getElementById("memChart"), data: [], max: 512, text: document.getElementById("memText") },
	fps: { el: document.getElementById("fpsChart"), data: [], max: 60, text: document.getElementById("fpsText") },
	speed: { el: document.getElementById("speedChart"), data: [], max: 100, text: document.getElementById("speedText") }
};

function drawGraph(key, value) {
	const chart = charts[key];
	if (!chart.el) return;
	
	const ctx = chart.el.getContext("2d");
	const { width, height } = chart.el;
	const paddingX = 40;
	const paddingY = 25;

	const dynamicColor = getComputedStyle(document.documentElement).getPropertyValue("--txt").trim() || "white";

	const timeStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
	chart.data.push({ val: value, time: timeStr });
	if (chart.data.length > 50) chart.data.shift();

	ctx.clearRect(0, 0, width, height);

	ctx.strokeStyle = dynamicColor;
	ctx.globalAlpha = 0.1;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let i = 0; i <= 4; i++) {
		const y = (height - paddingY - 10) - (i / 4 * (height - paddingY - 30));
		ctx.moveTo(paddingX, y); ctx.lineTo(width, y);
		const x = paddingX + (i / 4) * (width - paddingX - 10);
		ctx.moveTo(x, 10); ctx.lineTo(x, height - paddingY);
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

// The FPS somehow stays stable even with some of the most resource consuming apps (except for amCharts)

let isFPSInit = false;

let frames = 0, lastTime = performance.now();

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

// Memory, I think it works

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

// Network speed will eat batteries, but it does clear cache

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

		const response = await fetch(`${imageAddr}?n=${Math.random()}`, { cache: "no-store" });
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

// Battery (doesn't save battery)

const batteryDiv = document.getElementById("battery");

function checkBattery() {
	if (!shouldRun()) {
		batteryDiv.innerHTML = "Calculating...";
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
				batteryDiv.innerHTML = `${level} - ${timeInfo}`;
				document.getElementById("batteryTitle").innerHTML = `BATTERY ${isCharging}`;
			}
			updateAllStatus();

			const events = ["levelchange", "chargingchange", "chargingtimechange", "dischargingtimechange"];
			events.forEach(event => battery.addEventListener(event, updateAllStatus));
			load(`[ OK ] Battery level fetched: ${Math.round(battery.level * 100)}%`);
		});
	} catch (e) {
		load("[ FAIL ] Battery " + e);
		batteryDiv.innerHTML = "ERROR";
	}
}

// Colors

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

	const bgr = bgR.value || 255;
	const bgg = bgG.value || 255;
	const bgb = bgB.value || 255;
	const bgString = `rgb(${bgr}, ${bgg}, ${bgb})`;
	rootColor.style.setProperty("--bg", bgString);

	const tr = txtR.value || 0;
	const tg = txtG.value || 0;
	const tb = txtB.value || 0;
	const textColor = `rgb(${tr}, ${tg}, ${tb})`;
	rootColor.style.setProperty("--txt", textColor);

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

document.getElementById("bgGreen").addEventListener("click", () => {
	setFullPreset([51, 255, 51], [0, 0, 0], [51, 255, 51]);
});

document.getElementById("bgAmber").addEventListener("click", () => {
	setFullPreset([255, 176, 0], [0, 0, 0], [255, 176, 0]);
});

document.getElementById("bgWhite").addEventListener("click", () => {
	setFullPreset([240, 255, 255], [0, 0, 0], [240, 255, 255]);
});

loadColors();

// Checks if you're cool

var admin = false;

const admins = {
	"houjen@terminal": {
		password: "а ну чики брики и в дамки"
	},
	"dylan@terminal": {
		password: "BorschtTheBear"
	},
	"rithvik@terminal": {
		password: "రిత్విక్_గుమ్మ"
	}
};

function login() {
	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;

	if (admins[email] && admins[email].password === password) {
		document.getElementById("login").style.display = "none";
		document.getElementById("admin").style.display = "block";
		document.getElementById("commandInput").style.display = "block";
		document.querySelectorAll(".user").innerHTML = email;
		closeSide();
		document.getElementById("adminFrame").src = "https://docs.google.com/document/d/1Bz3dKVIdB5TTtfKcIagypFutgDw-PpwQhGuxRZK4CgU/edit?tab=t.sul0nicbvnre";

		admin = true;
	} else {
		document.getElementById("adminAlert").style.display = "block";
	}
}

// Checks your internet, and may explode if you are on cellular

const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

function checkConnection() {
	if (!shouldRun()) {
		document.getElementById("status").innerHTML = "Calculating...";
		return;
	}

	try {
		document.getElementById("status").innerHTML = connection.effectiveType;
		load(`[ OK ] Network status fetched: ${connection.effectiveType}`);
	} catch (e) {
		load("[ FAIL ] Network status " + e);
		document.getElementById("status").innerHTML = "ERROR";
	}
}

// This your IP? LOL, get doxxed

document.addEventListener("DOMContentLoaded", function() {
	fetch("https://free.freeipapi.com/api/json")
	.then(response => {
		if (!response.ok) {
			document.getElementById("ip").innerHTML = "ERROR";
			document.getElementById("coords").innerHTML = "ERROR";
		}
		return response.json();
	})
	.then(data => {
		document.getElementById("ip").innerHTML = data.ipAddress;
		document.getElementById("coords").innerHTML = `${data.latitude}, ${data.longitude}`;
		load(`[ OK ] IP fetched: ${data.ipAddress}`);
	})
	.catch(e => {
		document.getElementById("ip").innerHTML = "ERROR";
		document.getElementById("coords").innerHTML = "ERROR";
		load("[ FAIL ] IP " + e);
	});
});

// This weather API is very useful, trust me

async function updateMarsWeatherTable() {
	const res = await fetch("https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json");
	const data = await res.json();

	let sols = Object.values(data.soles)
	  .filter(sol => sol && sol.max_temp !== null && sol.min_temp !== null && sol.sol && sol.terrestrial_date)
	  .sort((a, b) => new Date(b.terrestrial_date) - new Date(a.terrestrial_date));

	if (sols.length > 0) {
		const latest = sols[0];
		document.getElementById("high").innerHTML = `${latest.max_temp}°C`;
		document.getElementById("low").innerHTML = `${latest.min_temp}°C`;
		document.getElementById("sol").innerHTML = `${latest.sol}`;
		load(`[ OK ] Curiosity Rover REMS connected: ${latest.max_temp}°C - ${latest.min_temp}°C`);
	} else {
		load("[ FAIL ] Curiosity Rover REMS unable to connect");
	}
}

updateMarsWeatherTable();

// Not much, just the entire planet

let isGlobeInit = false;
let root, chart, rotationAnimation;
let initialLat, initialLon;
let polygonTemplate, graticuleTemplate, circleTemplate;

async function initMap() {
	// Basic syntax and stuff

	if (root) return;

	const response = await fetch("https://free.freeipapi.com/api/json");
	const data = await response.json();
	initialLat = data.latitude;
	initialLon = data.longitude;

	root = am5.Root.new("chartdiv");
	root.setThemes([am5themes_Animated.new(root)]);

	chart = root.container.children.push(am5map.MapChart.new(root, {
		panX: "rotateX",
		panY: "rotateY",
		projection: am5map.geoOrthographic(),
		rotationX: -initialLon,
		rotationY: -initialLat,
		maxZoomLevel: 1,
	}));

	let graticuleSeries = chart.series.unshift(am5map.GraticuleSeries.new(root, { step: 10 }));
	graticuleTemplate = graticuleSeries.mapLines.template;

	let polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, { geoJSON: am5geodata_worldLow }));
	polygonTemplate = polygonSeries.mapPolygons.template;

	let pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}));
	pointSeries.bullets.push(() => {
		const circle = am5.Circle.new(root, { radius: 5 });
		circleTemplate = circle;
		return am5.Bullet.new(root, { sprite: circle });
	});

	pointSeries.data.setAll([{ geometry: { type: "Point", coordinates: [initialLon, initialLat] } }]);

	refreshColors();

	// You spin me right round, baby, right round

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

	// Go home

	const goHome = () => {
		if (rotationAnimation) toggleSpin();
		chart.animate({ key: "rotationX", to: -initialLon, duration: 1000, easing: am5.ease.out(am5.ease.cubic) });
		chart.animate({ key: "rotationY", to: -initialLat, duration: 1000, easing: am5.ease.out(am5.ease.cubic) });
	};

	// Buttons

	document.getElementById("spinBtn").onclick = toggleSpin;
	document.getElementById("homeBtn").onclick = goHome;

	chart.appear();

	if (!isGlobeInit) {
		load("[ OK ] Global Holographic Projection connected");
		isGlobeInit = true;
	}
}

// Colors (again)

function refreshColors() {
	if (!root) return;

	const style = getComputedStyle(document.documentElement);
	const txtColor = am5.color(style.getPropertyValue("--txt").trim());
	const themeColor = am5.color(style.getPropertyValue("--theme").trim());

	if (graticuleTemplate) {
		graticuleTemplate.setAll({ stroke: txtColor, strokeOpacity: 0.25 });
	}
	if (polygonTemplate) {
		polygonTemplate.setAll({ stroke: txtColor, strokeWidth: 1, fillOpacity: 0 });
	}
	if (circleTemplate) {
		circleTemplate.set("fill", themeColor);
	}
}

// Checks if the theme changes every second

setInterval(() => {
	if (typeof shouldRun === "function" && !shouldRun()) {
		if (root) {
			root.dispose();
			root = null;
			polygonTemplate = graticuleTemplate = circleTemplate = null;
		}
	} else {
		if (!root) initMap();
	}

	refreshColors();
}, 1000);

am5.ready(initMap);

// No one is going to use this editor except, like, me and maybe Dylan

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
	lineNumbers.innerHTML = lines;
}javascript:void(0)

// Syntax highlighting

function updateCode() {
	let content = codebox.value;

	content = content.replace(/&/g, "&amp;");
	content = content.replace(/</g, "&lt;");
	content = content.replace(/>/g, "&gt;");

	codeBlock.innerHTML = content;
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

// I think this is for the code/textbox stitching, but I kinda forgot

codebox.addEventListener("scroll", () => {
	codeBlock.scrollTop = codebox.scrollTop;
	codeBlock.scrollLeft = codebox.scrollLeft;
	lineNumbers.scrollTop = codebox.scrollTop;
});

// Makes it in so that pressing tab would indent the code

codebox.addEventListener('keydown', (e) => {
	if (e.key === 'Tab') {
		e.preventDefault();
		const { selectionStart, selectionEnd, value } = codebox;
		const spaces = "	";
		codebox.value = value.substring(0, selectionStart) + spaces + value.substring(selectionEnd);
		codebox.selectionStart = codebox.selectionEnd = selectionStart + spaces.length;
	}
});

// Sets the style

const themeLink = document.getElementById("theme1");

document.getElementById("selectStyle").addEventListener("change", (e) => {
	themeLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${e.target.value}.min.css`;

	themeLink.onload = () => {
		setTimeout(setTheme, 50);
	};
});

// Sets the theme

function setTheme() {
	const r = document.documentElement;
	const sheet = Array.from(document.styleSheets).find(s => s.ownerNode === themeLink);

	if (!sheet) return;

	const rules = Array.from(sheet.cssRules || sheet.rules);

	const getStyle = (selector) => {
		const rule = rules.find(rule => rule.selectorText && rule.selectorText.split(',').some(s => s.trim() === selector));
		return rule ? rule.style : null;
	};

	const hljs = getStyle(".hljs");
	const subst = getStyle(".hljs-subst");
	const comment = getStyle(".hljs-comment");

	r.style.setProperty("--bg", hljs.backgroundColor || hljs.background);
	r.style.setProperty("--txt", hljs.color || subst.color);
	r.style.setProperty("--theme", comment.color);
}

// Sets the language

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

document.getElementById("selectLanguage").addEventListener("change", function () {
	document.getElementById("codeBlock").className = this.value;

	const selectElement = document.getElementById("selectLanguage");
	const selectedIndex = selectElement.selectedIndex;
	const hasSavedContent = localStorage.getItem("savedCode");

	if (selectedIndex === 0) {
		document.getElementById("rte").style.display = "none";
		document.getElementById("preview-window").style.display = "block";

		if (!hasSavedContent) {
			codebox.value = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Title</title>\n<style>\n</style>\n</head>\n<body>\n	<h1>Hello, World!</h1>\n<script>\n<\/script>\n</body>\n</html>';
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

// Clears cache so that the code doesn't crash randomly after, like, 500 attempts at running it

window.onload = function() {
	localStorage.clear();
};

// Writes the sample code

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

codebox.value = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Title goes here</title>\n<style>\n	/* CSS goes here */\n</style>\n</head>\n<body>\n	<h1>Hello, World!</h1>\n<script>\n	// JS goes here\n<\/script>\n</body>\n</html>';

runEditor();
updateCode();

// Python editor for Dylan

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

// Commands thingy

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

		scroll.scrollIntoView({ block: "end" });
	}
});

function handleCommand(cmd) {
	let response = "";
	switch(cmd.toLowerCase()) {
		case "help":
			response = `List of available commands: about, games, youtube, telescope, radio, editor, color, login, clear`;
			break;
		case "about":
			response = "The TERMINAL is a repository of free and unblockable games for people like you to play in their free time. This project is basically a coding playground for when I get bored, and more content will be added in future updates.<br>Special thanks to the very cool people at the UGS Google Doc for making this possible.";
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
			isCrtEnabled = true;
			toggleCrt();

			document.getElementById("bg").style.display = "none";
			document.body.style.textShadow = "none";
			break;
		case "color":
			document.getElementById("color").style.display = "block";
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
				response = "Access denied. You think it's gonna be that easy?";
			}
			break;
		case "password":
			response = "Really? I'm not just gonna tell you, you gotta do better than that!";
			break;
		case "furries are cringe":
			response = "I agree"; // Am I wrong?
			break;
		case "clear":
			output.innerHTML = "";
			return;
		default:
			response = `ERROR: Command not found: ${cmd}`;
	}
	output.innerHTML += `${response}<br>`;
}

// Handles search and programs

document.getElementById("file-search").focus();

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

			isCrtEnabled = false;
			toggleCrt();
		}
		stdin.focus();
	}
});

function handleSearch() {
	const query = document.getElementById("file-search").value.toLowerCase();
	generateAllSections(query);
}

// You will never be able to play those stupid anime dating sims ever again

const blacklistArr = ["clclassof09", "cldokidokiliteratureclub", "clskibididibidygyattohiorizzingallovertheplacestillwatermangotheoryfemboydrool", "clskibidiinthebackrooms", "clyanderesimulator", "clyouvs100skibidi", "clyouvs100skibidi(1)"];

function handleBlacklistedFile() {
	window.location.replace("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBmWI_HHzCuIVhRxRoKUeT8Wer6MyOp1WXgg&s");
}

// Actual GitHub extraction and display

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

			fetch(url, { method: 'HEAD' })
				.then(res => {
					const size = res.headers.get("content-length");
					sizeInfo.textContent = formatBytes(size);
				})
				.catch(() => {
					sizeInfo.textContent = " ERROR";
				});
		}
	});
}, { rootMargin: "50px" });

function generateAllSections(filter = "") {
	const container = document.getElementById("sections-container");
	container.innerHTML = "";

	const allChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	const filesByChar = {};
	allChars.forEach(char => filesByChar[char] = []);

	files.forEach(file => {
		const lower = file.toLowerCase();
		if (lower.includes(filter.toLowerCase()) && lower.startsWith("cl")) {
			const aftercl = lower.substring(2);
			if (aftercl.length > 0) {
				const firstChar = aftercl[0].toUpperCase();
				if (filesByChar[firstChar]) {
					filesByChar[firstChar].push(file);
				}
			}
		}
	});

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

document.addEventListener("DOMContentLoaded", function () {
	generateAllSections();
	load("[ OK ] Games loaded");
});

// I'm going to the ONE place that isn't corrupted by Capitalism... SPACE!

const imagePaths = [ "potw1924a.jpg", "heic2007a.jpg", "heic1509a.jpg", "heic1501a.jpg", "potw2050a.jpg", "heic2018b.jpg", "heic0715a.jpg", "heic1608a.jpg", "potw1345a.jpg", "heic1307a.jpg", "heic0817a.jpg", "heic0406a.jpg", "potw2049a.jpg", "opo0328a.jpg", "heic0702a.jpg", "heic0515a.jpg", "heic1808a.jpg", "potw1811a.jpg", "heic0910h.jpg", "heic0601a.jpg", "heic0514a.jpg", "heic0506b.jpg", "heic0506a.jpg", "opo0511a.jpg", "heic0503a.jpg", "opo0501a.jpg", "heic0206c.jpg", "heic0206a.jpg", "heic0206b.jpg", "heic0109a.jpg", "opo0006a.jpg", "heic2105a.jpg", "heic1302a.jpg", "heic1105a.jpg", "heic1104a.jpg", "heic1007a.jpg", "heic0910s.jpg", "heic0910i.jpg", "heic0905a.jpg", "heic0719a.jpg", "heic0707a.jpg", "heic0706a.jpg", "opo0624a.jpg", "heic0604a.jpg", "heic0602a.jpg", "opo0028a.jpg", "opo9941a.jpg", "potw2114a.jpg", "potw2108a.jpg", "potw2036a.jpg", "heic1516a.jpg", "heic1310a.jpg", "heic0411a.jpg", "opo0123a.jpg", "potw2110a.jpg", "potw1441a.jpg", "heic1406a.jpg", "heic1305a.jpg", "heic1110a.jpg", "heic0814a.jpg", "opo0010a.jpg", "potw1933a.jpg", "potw1932a.jpg", "potw1847a.jpg", "potw1805a.jpg", "potw1542a.jpg", "potw2144a.jpg", "potw1921a.jpg", "heic1907a.jpg", "potw1850a.jpg", "potw1849a.jpg", "heic1811a.jpg", "potw1822a.jpg", "heic1806a.jpg", "potw1804a.jpg", "potw1751a.jpg", "heic1712a.jpg", "heic1520a.jpg", "heic1518a.jpg", "heic1503a.jpg", "heic1502a.jpg", "opo1438b.jpg", "heic1323a.jpg", "heic0910e.jpg", "heic0814b.jpg", "potw2044a.jpg", "potw2006a.jpg", "potw1940a.jpg", "potw1924a.jpg", "heic2017a.jpg" ];

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
		document.getElementById("teleStatus").innerHTML = "> STATUS: Deactivated";
	} else {
		document.getElementById("teleStatus").innerHTML = "> STATUS: Activated";
	}
}

// The music player extracts YouTube videos and plays them in an invisible iframe, which means that there will always be a video playing on The TERMINAL

const songData = [
    { id: "Z3Ia6vV9pXk", title: "ППК - Воскрешение" },
    { id: "G0HsHQe-dT4", title: "Gummy Boy - Don't Leave" },
    { id: "ZG5NA8Ni7Ns", title: "PRNRML - Загадка 1" },
    { id: "d5HQdXkkfso", title: "Зодиак - Зодиак" },
    { id: "rQ6J2Qf2MXA", title: "Творожное озеро - Гроза (vwqp remix)" },
    { id: "UV06-kggQpg", title: "Dmitriy Ivankov - Phobos" },
    { id: "mkUOEQZwCaI", title: "Наукоград - Время" },
    { id: "ve81BNWbC5s", title: "Priroda - 8080" },
    { id: "fOlCt6pVUwY", title: "NTorchestra - Млечными путями в Прекрасное далеко" }
];

let radioPlayer;
let searchPlayer;
const API_KEY = "AIzaSyARfwKry_c26u7Y86Tc1nUE1tkTDv-BS3Y";

function getRandomSong() {
    return songData[Math.floor(Math.random() * songData.length)];
}

function onYouTubeIframeAPIReady() {
    const firstSong = getRandomSong();

    radioPlayer = new YT.Player("radio-player", {
        height: "0",
        width: "0",
        videoId: firstSong.id,
        playerVars: { "autoplay": 1, "controls": 0 },
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
    } 
    else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        radioPlayer.playVideo();
        document.getElementById("playBtn").textContent = "> PAUSE";
    }
}

const searchBtn = document.getElementById("youtubeSearch");
searchBtn.addEventListener("click", searchVideos);

async function searchVideos() {
    const query = document.getElementById("query").value;
    if (!query) return alert("Enter a search term");

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${query}&type=video&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        displayResults(data.items);
		document.getElementById("videoDisplay").style.display = "none";
    } catch (e) {
        document.getElementById("results").innerHTML = "ERROR: " + e;
    }
}

function displayResults(videos) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";
    videos.forEach(video => {
        const { title, thumbnails, channelTitle } = video.snippet;
        const videoId = video.id.videoId;

        const card = document.createElement("div");
        card.className = "video-card";
        card.innerHTML = `
            <img src="${thumbnails.medium.url}" alt="${title}">
            <p>${title}</p>
            <span>${channelTitle}</span>
        `;
        
        card.onclick = () => {
            document.getElementById("videoDisplay").style.display = "block";
            document.getElementById("playingTitle").innerText = title;
            searchPlayer.loadVideoById(videoId);
			const vid = document.getElementById("videoDisplay");
			vid.scrollIntoView({ behavior: "smooth" });
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

	window.addEventListener("load", (event) => { setTimeout(showSplash, 500) });
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

// Glitch effect (it literally uses fractals simply because it would be more accurate)

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
	const intensity = Math.random() > 0.8 ? Math.random() * 15 : Math.random() * 5;
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
		bg.style.display = "block";
	} else {
		filter.setAttribute("scale", 0);
		glowline.style.display = "none";
		scanline.style.display = "none";
		document.body.classList.remove("flicker");
		bg.style.display = "none";
	}
}

triggerGlitch();
