document.addEventListener('DOMContentLoaded', (event) => {
	load("[ OK ] DOM fully loaded");
	document.body.classList.add("flicker");

	const stdin = document.getElementById("stdin");
	stdin.addEventListener("keydown", function(e) {
		if (e.key === "Enter") {
			const cmd = stdin.value;

			const stdout = document.getElementById("stdout");
			const line = document.createElement("div");
			line.innerHTML = `<b><span class="user">guest</span>@terminal:~$</b> ${cmd}`;
			stdout.appendChild(line);

			handleCommand(cmd);

			stdin.value = "";
			stdout.parentElement.scrollTop = stdout.parentElement.scrollHeight;
		}
	});

	setTimeout(() => {
		displayTime();
		displayDate();
		updateTimer();
		checkBrowser();
		checkFPS();
		checkMemory();
		checkSpeed();
		checkBattery();
		checkIP();
		checkConnection();
		am5.ready(initMap);
		updateMarsWeatherTable();
		setRandomBackground();
	}, 500);
});

let radioPlayer;
let searchPlayer;
let currentRadioSong = null;

// Radio and YouTube init

function onYouTubeIframeAPIReady() {
	const firstSong = getRandomSong();
	currentRadioSong = firstSong;

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

// Commands

function handleCommand(cmd) {
	const stdout = document.getElementById("stdout");
	const program = document.getElementById("program");
	const inputArea = document.getElementById("commandInput");
	const cleanCmd = cmd.toLowerCase().trim();

	let response = "";

	switch (cleanCmd) {
		case "help":
			response = `
				List of available commands:<br>
				about      System info<br>
				games      Open games directory<br>
				youtube    Open YouTube app<br>
				telescope  Open background app<br>
				radio      Open music app<br>
				editor     Open code editor app<br>
				help       You already know what this does<br> 
`;
			break;
		case "about":
			response = "ТЕРМИНАЛ v1.0.0";
			break;
		case "clear":
			stdout.innerHTML = "Type 'help' to see list of available commands<br>Type Esc key to return to home directory<br><br>";
			return;
		case "games":
			inputArea.classList.add("invisible");
			program.innerHTML = `
				<section class="flexbox">
					<div class="normal">
						<span><b><span class="user">guest</span>@games:~$</b> find&nbsp;</span>
					</div>
					<div class="stretch">
						<input type="text" id="file-search" onkeyup="handleSearch()" autocomplete="off">
					</div>
				</section>
				CAUTION: Some files may be corrupted.
				<div id="sections-container"></div>`;
			generateAllSections();
			setTimeout(() => document.getElementById("file-search").focus(), 10);
			return;
		case "telescope":
			inputArea.classList.add("invisible");
			program.innerHTML = `
				=====<br>
				<b>ГЛАЗ-1</b><br><br>
				Наш космос – это чудесное место.<br><br>
				<button id="teleStatus" onclick="toggleBackground()">> STATUS: Activated</button><br>
				<button onclick="setRandomBackground()">> Operate Orbital Telescope</button><br>`;
			return;
		case "radio":
			inputArea.classList.add("invisible");
			program.innerHTML = `
				=====<br>
				<b>УВБ-76</b><br><br>
				Вы слушаете радио «Советская волна». Рекомендуется использовать наушники.<br><br>
				<div id="songTitle">NOW PLAYING: ${currentRadioSong ? currentRadioSong.title : "Loading..."}</div><br>
				<button id="playBtn" onclick="togglePlayback()">> ${radioPlayer && radioPlayer.getPlayerState() === 1 ? 'PAUSE' : 'PLAY'}</button><br>`;
			return;
		case "youtube":
			inputArea.classList.add("invisible");
			program.innerHTML = `
				=====<br>
				<section class="search-box flexbox">
					<div class="normal">
						<span><b><span class="user">guest</span>@youtube:~$</b>&nbsp;</span>
					</div><br><br>
					<div class="stretch">
						<input id="query" type="text" autocomplete="off">
					</div>
				</section>

				<button id="youtubeSearch" onclick="searchVideos()">Search</button>

				<div id="videoDisplay" class="invisible">
					<div id="mainVideoDisplay"></div>
					<h2 id="playingTitle"></h2>
				</div>

				<div id="results" class="video-grid"></div>`;
			return;
		case "":
			return;

		default:
			response = `<span style="color: #ff5555;">ERROR: Command '${cleanCmd}' not recognized.</span>`;
	}

	if (response) {
		const respLine = document.createElement("div");
		respLine.innerHTML = response;
		stdout.appendChild(respLine);
	}
}

// Radio

function onSearchPlayerStateChange(event) {
	if (event.data === YT.PlayerState.PLAYING) {
		radioPlayer.pauseVideo();
		const btn = document.getElementById("playBtn");
		if (btn) btn.textContent = "> PLAY";
	} else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
		radioPlayer.playVideo();
		const btn = document.getElementById("playBtn");
		if (btn) btn.textContent = "> PAUSE";
	}
}

function onRadioStateChange(event) {
	if (event.data === YT.PlayerState.ENDED) {
		const nextSong = getRandomSong();
		currentRadioSong = nextSong;
		radioPlayer.loadVideoById(nextSong.id);
		updateTitleDisplay(nextSong.title);
	}
}

// YouTube

async function searchVideos() {
	const API_KEY = "AIzaSyARfwKry_c26u7Y86Tc1nUE1tkTDv-BS3Y";
	const query = document.getElementById("query").value;
	if (!query) return alert("Enter a search term");

	document.getElementById("results").innerHTML = "Searching...";

	const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (data.items && data.items.length > 0) {
			displayResults(data.items);
		} else {
			document.getElementById("results").innerHTML = "No results found.";
		}
	} catch (e) {
		document.getElementById("results").innerHTML = "ERROR: " + e;
	}
}

function displayResults(videos) {
	const resultsDiv = document.getElementById("results");
	resultsDiv.innerHTML = "";

	videos.forEach(video => {
		const {
			title,
			thumbnails,
			channelTitle
		} = video.snippet;
		const videoId = video.id.videoId;

		const card = document.createElement("div");
		card.className = "video-card";
		card.innerHTML = `
			<img src="${thumbnails.medium.url}" alt="${title}">
			<p>${title}</p>
			<span>${channelTitle}</span>
		`;

		card.onclick = () => {
			const displayArea = document.getElementById("videoDisplay");
			displayArea.style.display = "block";
			document.getElementById("playingTitle").innerText = title;

			if (searchPlayer && typeof searchPlayer.loadVideoById === "function") {
				searchPlayer.loadVideoById(videoId);
				displayArea.scrollIntoView({
					behavior: "smooth"
				});
			} else {
				searchPlayer = new YT.Player("mainVideoDisplay", {
					height: "360",
					width: "640",
					videoId: videoId,
					events: {
						"onStateChange": onSearchPlayerStateChange
					}
				});
			}
		};
		resultsDiv.appendChild(card);
	});
}

// Radio (again)

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
	const el = document.getElementById("songTitle");
	if (el) el.textContent = `NOW PLAYING: ${title}`;
}

function getRandomSong() {
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
	return songData[Math.floor(Math.random() * songData.length)];
}

// Program exit function

document.body.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		e.preventDefault();

		document.getElementById("program").innerHTML = "";

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

// Games

function handleSearch() {
	const query = document.getElementById("file-search").value.toLowerCase();
	generateAllSections(query);
}

const blacklistArr = ["clclassof09", "cldokidokiliteratureclub", "clskibididibidygyattohiorizzingallovertheplacestillwatermangotheoryfemboydrool", "clskibidiinthebackrooms", "clyanderesimulator", "clyouvs100skibidi", "clyouvs100skibidi(1)", "cltralalerotralalaescapetungtungtungsahur", "cltungtunghorror",
"cltungtungtungsahurobby", "clgachaverse"];

function handleBlacklistedFile() {
	initReactor();
	document.getElementById("terminalContent").style.display = "none";
	document.getElementById("chernobyl").style.display = "block";
	closeSide();
}

function generateAllSections(filter = "") {
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

function displayDate() {
	const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
	const d = new Date();
	document.getElementById("year").innerHTML = d.getFullYear();
	document.getElementById("month").innerHTML = months[d.getMonth()];
	document.getElementById("day").innerHTML = d.getDate();
}

// Uptime

let totalSeconds = 0;

function updateTimer() {
	if (!shouldRun()) return;
	totalSeconds++;
	let h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
	let m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
	let s = (totalSeconds % 60).toString().padStart(2, "0");
	document.getElementById("timer").textContent = `${h}:${m}:${s}`;
}
setInterval(updateTimer, 1000);

// Browser

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

// Admin

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

// Status

function checkConnection() {
	const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

	if (!shouldRun()) {
		document.getElementById("status").innerHTML = "Calculating...";
		return;
	}

	try {
		document.getElementById("status").innerHTML = `${connection.effectiveType} (${connection.type})`;
		load(`[ OK ] Network status fetched: ${connection.effectiveType}`);
	} catch (e) {
		load("[ FAIL ] Network status " + e);
		document.getElementById("status").innerHTML = "ERROR";
	}
}

// IP

function checkIP() {
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
}

// Weather

async function updateMarsWeatherTable() {
	const res = await fetch("https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json");
	const data = await res.json();

	let sols = Object.values(data.soles)
		.filter(sol => sol && sol.max_temp !== null && sol.min_temp !== null && sol.sol && sol.terrestrial_date)
		.sort((a, b) => new Date(b.terrestrial_date) - new Date(a.terrestrial_date));

	try {
		const latest = sols[0];
		document.getElementById("high").innerHTML = `${latest.max_temp}°C`;
		document.getElementById("low").innerHTML = `${latest.min_temp}°C`;
		document.getElementById("sol").innerHTML = `${latest.sol}`;
		load(`[ OK ] Curiosity Rover REMS connected: ${latest.max_temp}°C - ${latest.min_temp}°C`);
	} catch (e) {
		load("[ FAIL ] Curiosity Rover REMS " + e);
	}
}

// World view

async function initMap() {
	let isGlobeInit = false;
	let root, chart, rotationAnimation;
	let initialLat, initialLon;
	let polygonTemplate, graticuleTemplate, circleTemplate;

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
		paddingBottom: 55
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
			coordinates: [initialLon, initialLat]
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
			to: -initialLon,
			duration: 1000,
			easing: am5.ease.out(am5.ease.cubic)
		});
		chart.animate({
			key: "rotationY",
			to: -initialLat,
			duration: 1000,
			easing: am5.ease.out(am5.ease.cubic)
		});
	};

	document.getElementById("spinBtn").onclick = toggleSpin;
	document.getElementById("homeBtn").onclick = goHome;

	chart.appear();

	if (!isGlobeInit) {
		load("[ OK ] Global Holographic Projection connected");
		isGlobeInit = true;
	}

	function refreshColors() {
		if (!root) return;

		const style = getComputedStyle(document.documentElement);
		const txtColor = am5.color(style.getPropertyValue("--txt").trim());
		const themeColor = am5.color(style.getPropertyValue("--theme").trim());

		if (graticuleTemplate) {
			graticuleTemplate.setAll({
				stroke: txtColor,
				strokeOpacity: 0.25
			});
		}

		if (polygonTemplate) {
			polygonTemplate.setAll({
				stroke: txtColor,
				strokeWidth: 1,
				fillOpacity: 0
			});
		}

		if (circleTemplate) {
			circleTemplate.set("fill", txtColor);
		}
	}

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
}

// Telescope

function setRandomBackground() {
	const imagePaths = ["potw1924a.jpg", "heic2007a.jpg", "heic1509a.jpg", "heic1501a.jpg", "potw2050a.jpg", "heic2018b.jpg", "heic0715a.jpg", "heic1608a.jpg", "potw1345a.jpg", "heic1307a.jpg", "heic0817a.jpg", "heic0406a.jpg", "potw2049a.jpg", "opo0328a.jpg", "heic0702a.jpg", "heic0515a.jpg", "heic1808a.jpg", "potw1811a.jpg", "heic0910h.jpg", "heic0601a.jpg", "heic0514a.jpg", "heic0506b.jpg", "heic0506a.jpg", "opo0511a.jpg", "heic0503a.jpg", "opo0501a.jpg", "heic0206c.jpg", "heic0206a.jpg", "heic0206b.jpg", "heic0109a.jpg", "opo0006a.jpg", "heic2105a.jpg", "heic1302a.jpg", "heic1105a.jpg", "heic1104a.jpg", "heic1007a.jpg", "heic0910s.jpg", "heic0910i.jpg", "heic0905a.jpg", "heic0719a.jpg", "heic0707a.jpg", "heic0706a.jpg", "opo0624a.jpg", "heic0604a.jpg", "heic0602a.jpg", "opo0028a.jpg", "opo9941a.jpg", "potw2114a.jpg", "potw2108a.jpg", "potw2036a.jpg", "heic1516a.jpg", "heic1310a.jpg", "heic0411a.jpg", "opo0123a.jpg", "potw2110a.jpg", "potw1441a.jpg", "heic1406a.jpg", "heic1305a.jpg", "heic1110a.jpg", "heic0814a.jpg", "opo0010a.jpg", "potw1933a.jpg", "potw1932a.jpg", "potw1847a.jpg", "potw1805a.jpg", "potw1542a.jpg", "potw2144a.jpg", "potw1921a.jpg", "heic1907a.jpg", "potw1850a.jpg", "potw1849a.jpg", "heic1811a.jpg", "potw1822a.jpg", "heic1806a.jpg", "potw1804a.jpg", "potw1751a.jpg", "heic1712a.jpg", "heic1520a.jpg", "heic1518a.jpg", "heic1503a.jpg", "heic1502a.jpg", "opo1438b.jpg", "heic1323a.jpg", "heic0910e.jpg", "heic0814b.jpg", "potw2044a.jpg", "potw2006a.jpg", "potw1940a.jpg", "potw1924a.jpg", "heic2017a.jpg"];

	const bg = document.getElementById("bg");

	const randomIndex = Math.floor(Math.random() * imagePaths.length);
	const selectedImagePath = imagePaths[randomIndex];
	bg.style.backgroundImage = `url("https://cdn.esahubble.org/archives/images/wallpaper2/${selectedImagePath}")`;

	load("[ OK ] GLAZ-1 Orbital Telescope connected");
}

function toggleBackground() {
	bg.classList.toggle("invisible");

	if (bg.classList.contains("invisible")) {
		document.getElementById("teleStatus").innerHTML = "> STATUS: Deactivated";
	} else {
		document.getElementById("teleStatus").innerHTML = "> STATUS: Activated";
	}
}

function initReactor() {
	var BAR = 100e3;
	var VAPOUR_ENERGY = 40e3 / 0.018; // 40 kJ/mol  converted to J/kg.
	var HEAT_CAPACITY = 4180; // J/kg     500e6 / 5000 = 1e5 'C / kg / s
	var HEAT_CAPACITY_STEAM = 27 / 0.018; // J/kg
	var ROD_INSERTION_TIME = 20; // seconds for complete
	var NEUTRON_DELAY_TIME = 15; // seconds relaxation time between prompt and delayed neutrons.
	var IODINE_RELAX_TIME = 3600 * 6.57; // 3600; // * 6.57 // seconds relaxation time between iodine levels and the neutron flux.
	var XENON_RELAX_TIME = 3600 * 9.2; //3600; // * 9.2
	var REACTOR_HEAT_CAPACITY = 10e6; // 500 MW per reactor level = 5'C / second // 4e3 * 1000 = 1m3 of water = 4e6. We've got 30 of them at least = 1e8
	var REACTOR_WATER_COUPLING = 1000;
	var PRESSURE_FLOW_RATIO = 2; // pressure difference required to cause flow of 1 kg/s.
	var tile = 15;

	var newRegion = function() {
		return {
			T: Math.random() * 100 + 30,
			volume: 4, // m3
			pressure: 1,
			water: 3700, // kg
			energy: 4000 * HEAT_CAPACITY * 800,
			steamFraction: 0,
			flowCount: 0,
			flowSum: 0,
			flowPhase: 0
		};
	}

	var regions = {
		'reactor1': newRegion(),
		'reactor2': newRegion(),
		'reactor3': newRegion(),
		'reactor4': newRegion(),
		'reactor5': newRegion(),
		'reactor6': newRegion(),
		'reactor7': newRegion(),
		'poolInjector': newRegion(),
		'pool': newRegion(),
		'preGenA': newRegion(),
		'preGenB': newRegion(),
		'postGen': newRegion(),
		'postColdA': newRegion(),
		'postColdB': newRegion(),
		'coolant': newRegion(),
		'injector': newRegion(),
		'eccsA': newRegion(),
		'eccsB': newRegion(),
		'eccsPool': newRegion()
	};
	regions['eccsPool'].volume *= 5000;
	regions['eccsPool'].water *= 4000;
	regions['eccsPool'].energy = regions['eccsPool'].water * HEAT_CAPACITY * 350;
	regions['pool'].volume *= 10;
	regions['pool'].water *= 10;
	regions['pool'].energy *= 10;

	var scaler = function(name, scale) {
		regions[name].volume *= scale;
		regions[name].water *= scale;
		regions[name].energy *= scale;

	}

	scaler('preGenA', 3);
	scaler('preGenB', 3);
	scaler('postGen', 3);

	regions['pool'].volume *= 10;
	regions['pool'].water *= 10;
	regions['pool'].energy *= 10;

	var connections = [];
	var freeFlow = function(a, b, hg) {
		connections.push({
			a: a,
			b: b,
			free: true,
			hg: hg
		});
	}
	var generator = function(a, b) {
		connections.push({
			a: a,
			b: b,
			generator: true,
			forward: true
		});
	}
	var preferSteam = function(a, b) {
		connections.push({
			a: a,
			b: b,
			steam: true
		});
	}
	var valve = function(a, b, name) {
		connections.push({
			a: a,
			b: b,
			valve: true,
			name: name
		});
	}
	var pump = function(a, b, name, hg, strength) {
		if (!strength) strength = 10 * BAR;
		connections.push({
			a: a,
			b: b,
			pump: true,
			name: name,
			hg: hg,
			strength: strength
		});
	}
	var preferWater = function(a, b, hg) {
		connections.push({
			a: a,
			b: b,
			water: true,
			hg: hg
		});
	}

	freeFlow('reactor1', 'reactor2', -20);
	freeFlow('reactor2', 'reactor3', -20);
	freeFlow('reactor3', 'reactor4', -20);
	freeFlow('reactor4', 'reactor5', -20);
	freeFlow('reactor5', 'reactor6', -20);
	freeFlow('reactor6', 'reactor7', -20);
	freeFlow('reactor7', 'poolInjector', -20);
	freeFlow('poolInjector', 'pool');

	if (true) {
		preferSteam('pool', 'preGenA');
		valve('preGenA', 'preGenB', 'gen');
		generator('preGenB', 'postGen');
		freeFlow('postGen', 'postColdA');
		pump('postColdA', 'postColdB', 'cold', 0, 20 * BAR);
		freeFlow('postColdB', 'pool');
	} else {
		preferSteam('pool', 'preGenA');
		valve('preGenA', 'preGenB', 'gen');
		generator('preGenB', 'postGen');
		freeFlow('postGen', 'postColdA');
		pump('postColdA', 'postColdB', 'cold', 0, 20 * BAR);
		freeFlow('postColdB', 'pool');
	}
	preferWater('pool', 'coolant', 60);
	pump('coolant', 'injector', 'cool', 100, 30 * BAR);
	freeFlow('injector', 'reactor1', -20);
	valve('eccsB', 'injector', 'eccs');
	pump('eccsA', 'eccsB', 'extra', 0, 78 * BAR);
	freeFlow('eccsPool', 'eccsA', .1);

	// These are elements that are part display, part interface, and part model: they sort of bridge all the control things.#
	var engine = {
		'target': {
			type: 'value',
			level: 1
		},
		'gen': {
			type: 'boolean',
			val: true
		},
		'eccs': {
			type: 'boolean',
			val: true
		},
		'cool': {
			type: 'value',
			angle: 1,
			level: 1
		},
		'cold': {
			type: 'value',
			angle: 1,
			level: 1
		},
		'extra': {
			type: 'value',
			angle: 1,
			level: 1
		},
		'rod': {
			type: 'value',
			levels: [0.95, 0.0, 0.95, 0.0, 0.95, 0.0, 0.95, 0.0]
		}
	};

	var newLevel = function() {
		return {
			'prompt': 0,
			'iodine': 300e6, // units are steady state power per reactor level
			'xenon': null, //300e6,  set in SetXenon
			'energy': REACTOR_HEAT_CAPACITY * 400
		}
	}

	var reactor = [];
	for (var i = 0; i < 7; i++) {
		reactor.push(newLevel());
	}

	/// Arena code:
	var arena = [];

	var move = function(x, y) {
		return {
			x: x * tile,
			y: y * tile,
			stroke: false
		};
	}
	var line = function(x, y) {
		return {
			x: x * tile,
			y: y * tile,
			stroke: true
		};
	}
	var flipH = function(lines) {
		var ret = [];
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			ret.push({
				stroke: l.stroke,
				x: tile - l.x,
				y: l.y
			});
		}
		return ret;
	}

	var flipV = function(lines) {
		var ret = [];
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			ret.push({
				stroke: l.stroke,
				x: l.x,
				y: tile - l.y
			});
		}
		return ret;
	}
	var flipXY = function(lines) {
		var ret = [];
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			ret.push({
				stroke: l.stroke,
				x: l.y,
				y: l.x
			});
		}
		return ret;
	}
	tiles = {}
	tiles.pipeH = [
		move(0, 0.3),
		line(1, 0.3),
		move(1, 0.7),
		line(0, 0.7)
	];

	tiles.pumpH = [
		move(0, 0.3),
		line(0.3, 0),
		line(0.7, 0),
		line(1, 0.3),
		move(1, 0.7),
		line(0.7, 1),
		line(0.3, 1),
		line(0, 0.7)
	];

	tiles.valveH = [
		move(0, 0.3),
		line(0.3, 0.4),
		line(0.7, 0.4),
		line(1, 0.3),
		move(1, 0.7),
		line(0.7, 0.6),
		line(0.3, 0.6),
		line(0, 0.7)
	];

	tiles.pumpV = flipXY(tiles.pumpH);
	tiles.valveV = flipXY(tiles.valveH);

	tiles.pipeV = [
		move(0.3, 0),
		line(0.3, 1),
		move(0.7, 1),
		line(0.7, 0)
	];

	tiles.pipeVR = [
		move(0.1, 0),
		line(0.1, 1),
		move(0.9, 1),
		line(0.9, 0),
		/*move(0.6, 0),
		line(0.6, 1),
		move(0.4, 1),
		line(0.4, 0)*/
	];

	tiles.pipeVREnd = [
		move(0.1, 0),
		line(0.3, 1),
		move(0.7, 1),
		line(0.9, 0),
		move(0.6, 0),
		line(0.6, 0.2),
		line(0.4, 0.2),
		line(0.4, 0)
	];

	tiles.pipeVREnd2 = flipV(tiles.pipeVREnd);


	tiles.pipe7 = [
		move(0.7, 0),
		line(0.7, 0.15),
		line(0.15, 0.7),
		line(0, 0.7),
		move(0, 0.3),
		line(0.3, 0)
	]
	tiles.pipe9 = flipH(tiles.pipe7);
	tiles.pipe3 = flipV(tiles.pipe9);
	tiles.pipe1 = flipH(tiles.pipe3);

	tiles.pipe2 = [
		move(0, 0.3),
		line(1, 0.3),
		move(1, 0.7),
		line(0.7, 1),
		move(0.3, 1),
		line(0, 0.7)
	]

	tiles.pipe8 = flipV(tiles.pipe2);
	tiles.pipe6 = flipXY(tiles.pipe2);
	tiles.pipe4 = flipH(tiles.pipe6);
	tiles.wall4 = [
		move(1, 0),
		move(1, 1),
		move(0.2, 1),
		line(0.2, 0.7),
		line(0, 0.7),
		move(0, 0.3),
		line(0.2, 0.3),
		line(0.2, 0)
	];

	tiles.wall8 = flipXY(tiles.wall4);
	tiles.wall6 = flipH(tiles.wall4);
	tiles.wall2 = flipV(tiles.wall8);
	tiles.wall7 = [
		move(0.2, 1),
		line(0.2, 0.7),
		line(0.7, 0.2),
		line(1, 0.2),
		move(1, 1)
	]
	tiles.wall9 = flipH(tiles.wall7);
	tiles.wall3 = flipV(tiles.wall9);
	tiles.wall1 = flipH(tiles.wall3);

	tiles.water = [
		move(0, 0), move(0, 1), move(1, 1), move(1, 0)
	];

	tiles.gen = [
		line(0, 0), line(0, 1), line(1, 1), line(1, 0)
	];

	tiles.cooler = [
		line(0, 0), line(0, 1), line(1, 1), line(1, 0)
	];

	arena = [];

	var px, py, pdir;

	var pleft = function(region) {
		var t = '';
		if (pdir == 0) t = 'pipe1';
		if (pdir == 1) t = '???';
		if (pdir == 2) t = 'pipe7';
		if (pdir == 3) t = 'pipeH';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [-1, 0]
		});
		px--;
		pdir = 3;
		return arena.length - 1;
	}

	var pup = function(region) {
		var t = '';
		if (pdir == 0) t = 'pipeV';
		if (pdir == 1) t = 'pipe7';
		if (pdir == 2) t = '???';
		if (pdir == 3) t = 'pipe9';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [0, -1]
		});
		py--;
		pdir = 0;
		return arena.length - 1;
	}

	var pright = function(region) {
		var t = '';
		if (pdir == 0) t = 'pipe3';
		if (pdir == 1) t = 'pipeH';
		if (pdir == 2) t = 'pipe9';
		if (pdir == 3) t = '???';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [1, 0]
		});
		px++;
		pdir = 1;
		return arena.length - 1;
	}

	var pdown = function(region) {
		var t = '';
		if (pdir == 0) t = '???';
		if (pdir == 1) t = 'pipe1';
		if (pdir == 2) t = 'pipeV';
		if (pdir == 3) t = 'pipe3';
		arena.push({
			tile: t,
			x: px,
			y: py,
			region: region,
			dir: [0, 1]
		});
		py++;
		pdir = 2;
		return arena.length - 1;
	}


	var line1 = function() {
		px = 10;
		py = 13;
		pdir = 3;
		pleft('injector');
		pleft('injector');

		var x0 = px;
		var y0 = py;

		arena.push({
			tile: 'pipe8',
			x: x0,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 1,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 2,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 3,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 4,
			y: y0,
			region: 'injector',
			dir: [-1, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 5,
			y: y0,
			region: 'injector',
			dir: [-0.7, -0.3]
		});
		arena.push({
			tile: 'pipe8',
			x: x0 - 6,
			y: y0,
			region: 'injector',
			dir: [-0.4, -0.3]
		});
		arena.push({
			tile: 'pipe9',
			x: x0 - 7,
			y: y0,
			region: 'injector',
			dir: [0, -0.3]
		});


		// reactor;
		for (var i = 0; i < 8; i++) {
			px = x0 - 7 + i;
			py = y0 - 1;
			pdir = 0;
			arena.push({
				tile: 'pipeVREnd',
				x: px,
				y: py,
				region: 'injector',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 1,
				region: 'reactor1',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 2,
				region: 'reactor2',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 3,
				region: 'reactor3',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 4,
				region: 'reactor4',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 5,
				region: 'reactor5',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 6,
				region: 'reactor6',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVR',
				x: px,
				y: py - 7,
				region: 'reactor7',
				dir: [0, -0.3]
			});
			arena.push({
				tile: 'pipeVREnd2',
				x: px,
				y: py - 8,
				region: 'poolInjector',
				dir: [0, -0.3]
			});
		}

		// collecting at top
		px = x0 - 6;
		py -= 2;
		arena.push({
			tile: 'pipe3',
			x: px - 1,
			y: py - 7,
			region: 'poolInjector',
			dir: [.3, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px,
			y: py - 7,
			region: 'poolInjector',
			dir: [.5, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 1,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 2,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 3,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 4,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 5,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		arena.push({
			tile: 'pipe2',
			x: px + 6,
			y: py - 7,
			region: 'poolInjector',
			dir: [1, 0]
		});
		px = px + 7;
		py = py - 7;
		pdir = 1;

		pright('poolInjector');
		pright('poolInjector');
		pright('poolInjector');

		x0 = px;
		y0 = py;

		// steam room
		arena.push({
			tile: 'wall4',
			x: px + 0,
			y: py + 0,
			region: 'pool',
			dir: [0, -1]
		});
		arena.push({
			tile: 'wall7',
			x: px + 0,
			y: py - 1,
			region: 'pool',
			dir: [0.7, -0.7]
		});
		arena.push({
			tile: 'wall8',
			x: px + 1,
			y: py - 1,
			region: 'pool',
			dir: [1, 0]
		});
		arena.push({
			tile: 'wall9',
			x: px + 2,
			y: py - 1,
			region: 'pool',
			dir: [0.7, 0.7]
		});
		arena.push({
			tile: 'wall6',
			x: px + 2,
			y: py,
			region: 'pool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'wall3',
			x: px + 2,
			y: py + 1,
			region: 'pool',
			dir: [-0.7, 0.7]
		});
		arena.push({
			tile: 'wall2',
			x: px + 1,
			y: py + 1,
			region: 'pool',
			dir: [-1, 0]
		});
		arena.push({
			tile: 'wall1',
			x: px,
			y: py + 1,
			region: 'pool',
			dir: [-0.7, -0.7]
		});
		arena.push({
			tile: 'water',
			x: px + 1,
			y: py,
			region: 'pool',
			dir: [0, -1]
		});

		// to generators and stuff
		px++;
		py -= 2;
		pdir = 0;
		pright('preGenA');
		pright('preGenA');
		arena.push({
			tile: 'valveH',
			x: px,
			y: py,
			name: 'gen',
			region: 'preGenA',
			dir: [1, 0]
		});
		px++;
		pright('preGenB');
		arena.push({
			tile: 'gen',
			x: px,
			y: py,
			region: 'preGenB',
			dir: [1, 0]
		});
		px++;
		pright('postGen');
		pdown('postGen');
		pdown('postGen');
		arena.push({
			tile: 'cooler',
			x: px,
			y: py,
			region: 'postColdA',
			dir: [0, 1]
		});
		py++;
		pdown('postColdA');
		pleft('postColdA');
		pleft('postColdA');
		arena.push({
			tile: 'pumpH',
			x: px,
			y: py,
			name: 'cold',
			region: 'postColdA',
			dir: [-1, 0]
		});
		px--;
		pleft('postColdB');
		pup('postColdB');
		pup('postColdB');
		pleft('postColdB');

		// now the drain again.
		px = x0 + 1;
		py = y0 + 2;
		pdir = 2;
		pdown('coolant');
		pdown('coolant');
		pdown('coolant');
		pdown('coolant');
		pleft('coolant');
		pleft('coolant');
		arena.push({
			tile: 'pumpH',
			x: px,
			y: py,
			name: 'cool',
			region: 'coolant',
			dir: [0, 1]
		});
		px--;
		pdown('injector');
		pdown('injector');
		pdown('injector');
		pdown('injector');
		x0 = px;
		y0 = py;
		arena.push({
			tile: 'pipe8',
			x: px,
			y: py,
			region: 'injector',
			dir: [-1, 0]
		});
		px--;
		pdir = 3;

		// ECCS:
		px = x0 + 1;
		py = y0;
		pdir = 1;
		var ind = pright('eccsB');
		arena[ind].dir = [-1, 0];
		arena.push({
			tile: 'valveH',
			x: px,
			y: py,
			name: 'eccs',
			region: 'eccsB',
			dir: [-1, 0]
		});
		px++;
		arena[pright('eccsB')].dir = [-1, 0];
		arena[pright('eccsB')].dir = [-1, 0];
		arena.push({
			tile: 'pumpH',
			x: px,
			y: py,
			name: 'extra',
			region: 'eccsA',
			dir: [-1, 0]
		});
		px++;
		arena[pright('eccsA')].dir = [-1, 0];
		arena[pright('eccsA')].dir = [-1, 0];
		arena[pup('eccsA')].dir = [0, 1];
		arena.push({
			tile: 'wall2',
			x: px,
			y: py,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'wall1',
			x: px - 1,
			y: py,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'wall3',
			x: px + 1,
			y: py,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'water',
			x: px - 1,
			y: py - 1,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'water',
			x: px,
			y: py - 1,
			region: 'eccsPool',
			dir: [0, 1]
		});
		arena.push({
			tile: 'water',
			x: px + 1,
			y: py - 1,
			region: 'eccsPool',
			dir: [0, 1]
		});
	}
	line1();

	var DrawAll = function() {
		var c = document.getElementById('chCanvas');
		var ctx = c.getContext('2d');
		ctx.clearRect(0, 0, c.width, c.height);
		for (var i = 0; i < arena.length; i++) {
			DrawTile(ctx, arena[i].x * tile, arena[i].y * tile, tiles[arena[i].tile], arena[i].name, regions[arena[i].region], arena[i].dir, arena[i].region);
		}
		for (var i = 0; i < arena.length; i++) {
			DrawTile2(ctx, arena[i].x * tile, arena[i].y * tile, arena[i].region);
		}
		for (var i = 0; i < 8; i++) {
			var x = (i + 1.5) * tile;
			var dist = 7.5 * tile;
			var y = 2.5 * tile - (1 - engine['rod'].levels[i]) * dist;
			ctx.strokeStyle = '#000';
			ctx.fillStyle = '#0F0';
			ctx.beginPath();
			ctx.moveTo(x - 1, y);
			ctx.lineTo(x - 1, y + 150);
			ctx.lineTo(x + 1, y + 150);
			ctx.lineTo(x + 1, y);
			ctx.stroke();
			ctx.fill();
		}
	}

	var DrawTile2 = function(ctx, x, y, regname) {
		if (regname && regname[0] == 'r' && regname[1] == 'e' && regname[2] == 'a') { // ctor
			var i = parseFloat(regname[7]);
			var r = reactor[i - 1];
			var a = r.prompt / 15e6;
			a = Math.sqrt(a);
			ctx.strokeStyle = '#0F0';
			ctx.beginPath();

			for (var j = 0; j < 30; j++) {
				a -= Math.random();
				if (a < 0) break;
				a -= 0.5;
				var x0 = x + tile * Math.random();
				var y0 = y + tile * Math.random();
				var x1 = x + tile * Math.random() + (tile * (Math.random() - 0.5)) * Math.random() * Math.random() * 8;
				var y1 = y + tile * Math.random() + (tile * (Math.random() - 0.5)) * Math.random() * Math.random() * 8;

				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
			}
			ctx.stroke();
		}
	}
	var DrawTile = function(ctx, x, y, lines, name, region, dir, regname) {
		if (lines == null) return;
		ctx.beginPath();
		var T = region.pressure * 10 / BAR;
		var gr = Math.atan((region.steamFraction - 0.05) / 0.05) / Math.PI + 0.5;
		ctx.fillStyle = 'rgb(' + 0 + ',' + Math.round(gr * 255) + ',' + 0 + ')';
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1;
		ctx.moveTo(x + lines[0].x, y + lines[0].y);

		for (var i = 1; i < lines.length; i++) {
			ctx.lineTo(x + lines[i].x, y + lines[i].y);
		}
		ctx.moveTo(x + lines[0].x, y + lines[0].y);
		ctx.fill();

		ctx.beginPath();

		ctx.moveTo(x + lines[0].x, y + lines[0].y);

		for (var i = 1; i < lines.length; i++) {
			if (lines[i].stroke)
				ctx.lineTo(x + lines[i].x, y + lines[i].y);
			else {
				ctx.moveTo(x + lines[i].x, y + lines[i].y);
			}
		}
		if (lines[0].stroke) ctx.lineTo(x + lines[0].x, y + lines[0].y);
		else ctx.moveTo(x + lines[0].x, y + lines[0].y);
		ctx.stroke();
		if (name) {
			ctx.font = '12pt Courier New';
			ctx.fillStyle = '#0F0';
			ctx.strokeStyle = '#000';
			ctx.textAlign = 'center';
			ctx.fillText(name, x + tile / 2, y - tile / 4);
			//ctx.strokeText(name, x + tile/2, y - tile/2);

			if (engine[name]) {
				var status = engine[name].val;
				var type = engine[name].type;
				if (type == 'boolean' && status) {
					ctx.beginPath();
					ctx.strokeStyle = '#0F0';
					ctx.arc(x + tile / 2, y + tile / 2, tile / 2, 0, 2 * Math.PI, false);
					ctx.stroke();
				}

				if (type == 'boolean' && !status) {
					ctx.beginPath();
					ctx.strokeStyle = '#0F0';
					ctx.moveTo(x, y);
					ctx.lineTo(x + tile, y + tile);
					ctx.moveTo(x + tile, y);
					ctx.lineTo(x, y + tile);
					ctx.stroke();
				}
				if (engine[name].angle) {
					var x2 = x + tile / 2;
					var y2 = y + tile / 2;
					var s = Math.sin(engine[name].angle) * tile / 2;
					var c = Math.cos(engine[name].angle) * tile / 2;
					ctx.beginPath();
					ctx.strokeStyle = '#000';
					ctx.moveTo(x2 + s, y2 + c);
					ctx.lineTo(x2 - s, y2 - c);
					ctx.moveTo(x2 + c, y2 - s);
					ctx.lineTo(x2 - c, y2 + s);
					ctx.stroke();
				}
			}
		}
		if (dir) {
			var phase = region.flowPhase * 0.000005;
			var a = [0.5, 0.25, 0.6];
			var b = [0.5, 0.6, 0.25];
			phase = phase;
			for (var i = 0; i < 1; i++) {
				var px = phase * dir[0];
				var py = phase * dir[1];
				px = px - Math.floor(px);
				py = py - Math.floor(py);

				var dx = (((px + a[i] + 100) % 1) - 0.5) * tile;
				var dy = (((py + b[i] + 100) % 1) - 0.5) * tile;
				ctx.beginPath();

				ctx.arc(x + tile / 2 + dx, y + tile / 2 + dy, 1, 0, 2 * Math.PI, false);
				ctx.stroke();
			}
		}

	} // end DrawTile

	var AddTable = function(name, displayName, i) {
		var ret = "<tr><td width='120px'>" + displayName + "</td>";
		var reg = regions[name];
		ret += "<td width='70px'>" + Math.round(reg.T - 273) + "</td>";
		ret += "<td width='70px'>" + Math.round(reg.pressure / BAR) + "</td>";
		//ret += "<td width='70px'>" + Math.round(reg.water / 1000) + " T</td>";
		ret += "<td width='70px'>" + Math.round(reg.steamFraction * 100) + "%</td>";

		if (i >= 0) {
			//ret += "<td width='100px'>" + Math.round(1000 * reactor[i].gain) + "</td>";
			//ret += "<td width='100px'>" + Math.round(1000 * reactor[i].dgain_dg) + "</td>";
			//ret += "<td width='100px'>" + Math.round(reactor[i].prompt / 1e6) + "</td>";
			ret += "<td width='70px'>" + Math.round(reactor[i].xenon / 1e6) + "</td>";
		} else {
			ret += "<td></td>";
		}
		ret += "</tr>";


		return ret;
	}
	$(DrawAll);

	var updateFlows = function(dt) {
		var e = Math.exp(-dt / 5.0);
		for (var i = 0; i < connections.length; i++) {
			var c = connections[i];
			var a = regions[c.a];
			var b = regions[c.b];
			var dp = a.pressure - b.pressure;
			if (c.valve) {
				if (c.name && !engine[c.name].val) {
					c.flow = 0;
					c.eFlow = 0;
					continue; // valves don't connect if off.
				}
			}
			if (c.pump) {
				if (!c.name || engine[c.name].level) dp += c.strength * Math.min(1, engine[c.name].level);
			}
			if (c.hg) {
				dp += c.hg * regions[c.a].water / regions[c.a].volume;
			}
			c.flow = c.flow * e + (1 - e) * dp / PRESSURE_FLOW_RATIO;
			if (c.pump) c.flow *= 0.8;
			if (c.a == 'eccsA') c.flow *= 1;
			if (c.forward) c.flow = Math.max(0, c.flow);
			var from = null;
			var dest = null;
			var sign = 1;
			if (c.flow > 0) {
				from = a;
				dest = b;
			} else {
				from = b;
				dest = a;
				sign = -1;
			}


			if (c.flow * sign > from.water * 0.2 / dt) c.flow = from.water * sign * 0.2 / dt;
			c.eFlow = c.flow / (from.water + 1e-10) * from.energy;

			if (c.water && c.flow > 0) {
				var vlmWater = c.flow;
				vlmWater *= sign; // making it absolute
				var vlmSteam = 0;
				var maxWater = from.water * (1 - from.steamFraction) * 0.5 / dt;
				if (maxWater < vlmWater) {
					var dw = vlmWater - maxWater;
					vlmWater -= dw;
					//vlmSteam += dw;
				}
				var e2 =
					from.T * HEAT_CAPACITY * vlmWater +
					from.T * HEAT_CAPACITY_STEAM * vlmSteam +
					vlmSteam * VAPOUR_ENERGY;
				c.eFlow = e2 * sign;
				c.flow = (vlmWater + vlmSteam) * sign;
			}

			if (c.steam && c.flow > 0) {
				var vlmWater = 0;
				var vlmSteam = c.flow;
				vlmSteam *= sign; // making it absolute
				var maxSteam = from.water * (from.steamFraction) * 0.2 / dt;
				if (maxSteam < vlmSteam) {
					var dw = vlmSteam - maxSteam;
					vlmSteam -= dw;
					//vlmWater += dw;
				}
				var e2 =
					from.T * HEAT_CAPACITY * vlmWater +
					from.T * HEAT_CAPACITY_STEAM * vlmSteam +
					vlmSteam * VAPOUR_ENERGY;
				c.flow = vlmSteam * sign;
				c.eFlow = e2 * sign;
			}

			if (!isFinite(c.flow + c.eFlow)) {
				c.flow = 0;
				c.eFlow = 0;
			}
			if (c.generator) {
				if (c.flow < 0) {
					c.flow = 0;
					c.eFlow = 0;
				}
			}
		}
	}

	var updateMasses = function(dt) {
		for (var i in regions) {
			regions[i].flowCount = 0;
			regions[i].flowSum = 0;
		}

		for (var i = 0; i < connections.length; i++) {
			var c = connections[i];
			var a = regions[c.a];
			var b = regions[c.b];
			var flow = c.flow * dt;
			if (flow > 0 && flow > a.water)
				flow = a.water;
			if (flow < 0 && flow < -b.water)
				flow = -b.water;

			var sfa = a.steamFraction;
			var sfb = b.steamFraction;
			if (c.flow > 0 && !c.steam && !c.water) {
				var wa = flow;
				var wb = b.water;
				b.steamFraction = (a.steamFraction * wa + b.steamFraction * wb) / (wa + wb + 1e-10);
			}
			if (c.flow < 0 && !c.steam && !c.water) {
				var wb = -flow;
				var wa = a.water;
				a.steamFraction = (a.steamFraction * wa + b.steamFraction * wb) / (wa + wb + 1e-10);
			}
			if (c.flow > 0 && c.water) {
				b.steamFraction = (a.steamFraction * wa * 0 + b.steamFraction * wb) / (wa + wb + 1e-10);
			}
			a.water -= flow;
			b.water += flow;
			if (a.water < 0)
				console.log("a.water<0");
			if (b.water < 0)
				console.log("a.water<0");
			a.energy -= c.eFlow * dt;
			b.energy += c.eFlow * dt;
			a.flowSum += c.flow;
			a.flowCount += 1;
			b.flowSum += c.flow;
			b.flowCount += 1;
		}

		for (var i in regions) {
			regions[i].flowPhase += regions[i].flowSum / (regions[i].flowCount + 0.01);
		}
	}


	var getVapP = function(T) {
		if (T < 270) T = 270;
		if (T < 333) {
			return Math.pow(10, 7.2326 - 1750.286 / (T - 38.1)) * 1000;
		} else {
			return Math.pow(10, 7.0917 - 1668.21 / (T - 45.1)) * 1000;
		}
	}

	var DP_DVOLUME = 300 * BAR; // The pressure needed to double the pipes' volume

	var getPressure2 = function(mass, energy, volume, steamFraction) {
		var e = energy - mass * steamFraction * VAPOUR_ENERGY;
		var heatCapacity = HEAT_CAPACITY * (1 - steamFraction) + steamFraction * HEAT_CAPACITY_STEAM;
		T = e / (heatCapacity * mass); // J/kg/K    
		vapP = getVapP(T);
		// 2 estimates of pressure: vapP and volume thing. Score = |discrepancy|
		var vlmWater = 0.001 + mass * (1 - steamFraction) * 0.001; // volume of water
		vlmWater = -Math.log(Math.exp(-vlmWater * 10) + Math.exp(-volume * 10)) * 0.1;
		var vlmRemaining = volume - vlmWater + 0.001;
		if (T < 100) T = 100; // K
		var extraP = ((mass * 0.001 / volume) - 1) * BAR * 50 + BAR;
		if (extraP < 0) extraP = 0;
		// P(water, steam, T) 
		// Here's the problem. At pressure P, volume = waterMass*1e-3 + steamMass * (T/370) / (pressure/1Bar)
		// Also, at pressure P, volume = vol0 * (1 + P/k)
		// v = vol0
		// w = waterMass
		// s = steamMass
		// P in bars
		// k in bars
		// w*1e-3 + s*(T/370)/P = v + vP/k
		// w*1e-3*P + sT/370 = vP + vP2/k
		// v/k P^2 + (v-w*1e-3)P - sT/370 = 0
		// A = v/k
		// B = (v-w*1e-3)
		// C = -sT/370
		// P = {w*1e-3-v +- sqrt( (v-w*1e-3)^2 + 4*v/k * sT/370 )} / 2(v/k)
		var w = mass * (1 - steamFraction);
		var s = mass * steamFraction;
		var a = volume / (DP_DVOLUME / BAR); // expansion of the ubiquitous elastic pipes.
		var b = volume - w * 1e-3;
		var c = -s * T / 370;
		var P_volume = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // mass * steamFraction * (T / 370) / vlmRemaining*100e3 + extraP;
		if (P_volume < 0) P_volume = 0;
		P_volume *= BAR;
		if (!isFinite(P_volume)) P_volume = 0;
		if (!isFinite(steamFraction)) steamFraction = 0;
		return {
			T: T,
			steamFraction: steamFraction,
			pVap: vapP,
			pVlm: P_volume,
			score: Math.abs(P_volume - vapP)
		};

	}
	var getPressure = function(mass, energy, volume, steamFraction, dt) {
		var epsilon = 0.00001;
		var previous = getPressure2(mass, energy, volume, steamFraction);

		for (var i = 0; i < 20; i++) {
			var dp = previous.pVap - previous.pVlm;
			var upper = getPressure2(mass, energy, volume, steamFraction + epsilon);
			var dpds = Math.abs((upper.pVap - upper.pVlm - dp) / epsilon);

			var ds1 = 0.2 / dpds;
			if (!isFinite(ds1)) ds1 = 1e-10;
			var ds2 = dt * 1 * .1 / BAR;
			var ds = dp * Math.min(ds1, ds2) * 0.05;

			if (ds > 0.02) ds = 0.02;
			if (ds < -0.02) ds = -0.02;
			steamFraction += ds;
			if (steamFraction > 1) steamFraction = 1;
			if (steamFraction < 0) steamFraction = 0;
			previous = getPressure2(mass, energy, volume, steamFraction)
		}

		return previous;
	}

	var updatePressures = function(dt) {
		for (var i in regions) {
			var r = regions[i];
			pressureFraction = getPressure(r.water, r.energy, r.volume, r.steamFraction, dt);
			r.pressure = pressureFraction.pVlm;
			r.steamFraction = pressureFraction.steamFraction;
			r.T = pressureFraction.T;
		}
	}

	var doFlows = function(dt) {
		updateFlows(dt);
		updateMasses(dt);
		updatePressures(dt);
	}

	/// Interface code:

	var isOn = function(part) {
		if (part.val) return true;
		return false;
	}

	var doFirstTime = function() {
		for (var i = 0; i < connections.length; i++) {
			var c = connections[i];
			c.flow = 0; // from a to b.
		}
	}

	var lastCool = 0;

	var coolingTower = function(r, dt) {

		r.steamFraction = 0;

		pressureFraction = getPressure(r.water, r.energy, r.volume, r.steamFraction, dt);
		r.pressure = pressureFraction.pVlm;
		r.steamFraction = pressureFraction.steamFraction;
		r.T = pressureFraction.T;


		var TC = 370;
		if (r.T < TC) return;
		var minE = HEAT_CAPACITY * TC * r.water;
		var de = minE + (r.energy - minE) * Math.exp(-dt / 0.2);
		lastCool = (r.energy - de) / dt / 1e6;
		r.energy = de;
	}
	var reactorHeating = function(r, dt, layer) {
		var T = reactor[layer].energy / REACTOR_HEAT_CAPACITY;
		var flow = (T - r.T) * r.water * REACTOR_WATER_COUPLING;

		r.energy += flow * dt; // 500 MW per layer. 7 layers.
		reactor[layer].energy -= flow * dt;
	}

	var getEnergy = function() {
		var ret = 0;
		for (var i in regions) {
			ret += regions[i].energy;
		}
		return ret / 1e9;
	}

	var getWaterGain = function(i, rodFraction) {
		var reg = regions['reactor' + (i + 1)];
		var ret = -0.5 + (reg.steamFraction * 100 * (1.1 - rodFraction));
		return ret;
	}

	var GAIN_R = 3;
	var GAIN_W = .07;
	var GAIN_T = .5;
	var flowNeutron = function(dt) {
		var a = [];
		for (var i = 0; i < reactor.length - 1; i++) {
			a.push((reactor[i].prompt - reactor[i + 1].prompt) * dt * 0.3);
		}
		for (var i = 0; i < reactor.length - 1; i++) {
			reactor[i].prompt -= a[i];
			reactor[i + 1].prompt += a[i];
		}
	}

	var waitReactor = function(dt) {
		for (var i = 0; i < reactor.length; i++) {
			var a = Math.exp(-dt / IODINE_RELAX_TIME);
			reactor[i].iodine = reactor[i].prompt * (1 - a) + reactor[i].iodine * a;
			reactor[i].xenon = reactor[i].iodine * (1 - a) + reactor[i].xenon * a;
		}
	}

	var BACKGROUND_HEAT = 10e6;
	var reactorTimestep = function(dt) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].prompt += dt * 16e4; // define neutron flow in terms of joules per second of heating.

			var di = (reactor[i].prompt - reactor[i].iodine) * dt / IODINE_RELAX_TIME;
			reactor[i].iodine += di;

			var dx = (reactor[i].iodine - reactor[i].xenon) * dt / XENON_RELAX_TIME;
			reactor[i].xenon += dx;

			var poisoning = (reactor[i].prompt * reactor[i].xenon) * dt * 1e-10;
			if (poisoning > reactor[i].xenon) poisoning = reactor[i].xenon;
			var PL = 13000;
			if (poisoning > reactor[i].prompt / PL) poisoning = reactor[i].prompt / PL;
			reactor[i].xenon -= poisoning * 0.8;

			var gainSum = 0;
			var gainCount = 0;
			var insideSum = 0;
			for (var j = 0; j < engine['rod'].levels.length; j++) {
				var dl = ((1 - engine['rod'].levels[j]) - 0.15) - i / (reactor.length - 1);
				var dl2 = dl - 0.1;
				if (dl < 0) insideSum++;
				var gainR = 1.0 / (1.0 + Math.exp(-dl * 30)) + Math.exp(-dl2 * dl2 * 100) * 0.1 - 0.5;
				gainSum += gainR;
				gainCount++;
			}

			var gainR = gainSum / gainCount;

			var gainW = getWaterGain(i, insideSum / gainCount);

			var gainT = -(reactor[i].energy / REACTOR_HEAT_CAPACITY - 500) / 100.0;
			if (gainT < -3) gainT = -3 - Math.pow(-3 - gainT, 0.15);
			var gain = -1.20 + gainR * GAIN_R + gainW * GAIN_W + gainT * GAIN_T;
			gain -= reactor[i].xenon * 0.20e-7;
			// Now correct for delayed:

			// propagator P = (gain, coupling; coupling, b)
			gain += 0.15;

			gain *= 40;

			var b = -0.6; // 3 seconds for delayed neutron feedback const
			var coupling = 20;
			var ba = b + gain;
			var dg_dg = 0.5 * (1 + 1 / Math.sqrt((gain - b) * (gain - b) + 4 * coupling) * (gain - b));
			gain = (ba + Math.sqrt((gain - b) * (gain - b) + 4 * coupling)) * 0.5;

			reactor[i].dgain_dg = dg_dg;
			reactor[i].gain = gain;
			reactor[i].prompt *= Math.exp(dt * gain);

			reactor[i].energy += (reactor[i].prompt + BACKGROUND_HEAT) * dt;


		}
		flowNeutron(dt);

	}

	var timestep = function() {
		for (var i = 0; i < 3; i++) timestep2();
		var s = "<table border='1' style='cellpadding:10px;width:500px;'><tr><th>Region</th><th>Temperature (°C)</th><th>Pressure (Bar)</th><th>Steam Fraction</th><th>Xenon (U)</th>";
		s += AddTable('injector', 'Entering reactor', -1);
		s += AddTable('reactor1', 'Reactor bottom', 0);
		s += AddTable('reactor2', 'Reactor mid', 1);
		s += AddTable('reactor3', 'Reactor mid', 2);
		s += AddTable('reactor4', 'Reactor mid', 3);
		s += AddTable('reactor5', 'Reactor mid', 4);
		s += AddTable('reactor6', 'Reactor mid', 5);
		s += AddTable('reactor7', 'Reactor top', 6);
		s += AddTable('poolInjector', 'Leaving reactor', -1);
		s += AddTable('pool', 'Steam separator', -1);
		s += "</table>";
		$('#DEBUG').html(s);

	}
	var firstTime = true;
	var GLOBAL_DT = 0.01;
	var lastPower = 0;
	var lastFlowSum = 0;
	var lastFlowCount = 0;
	var aimProcessing = function(dt) {}
	var timestep2 = function(nodraw) {
		var dt = GLOBAL_DT;
		aimProcessing(dt);
		if (connections[0].flow) {
			var c = connections[0].flow;
			lastFlowCount++;
			lastFlowSum += c;
			lastFlowCount *= 0.95;
			lastFlowSum *= 0.95;
			$('#status2').html(
				'Flow: ' + Math.round(lastFlowSum / lastFlowCount) + ' l/s' +
				"<br>Total power: " + Math.round(GetPower() / 1e6)) + ' MW';
		}
		if (firstTime) {
			doFirstTime();
			firstTime = false;
		}
		var parts = Object.keys(engine);
		var messages = [];
		// sort out target
		var p = GetPower();
		var dp = p - lastPower;
		lastPower = p;
		if (true) {
			var dir = 0;

			if (p > engine.target.target * 1e6 && dp / dt > -100e6) dir = 1;
			if (p < engine.target.target * 1e6 && dp / dt < 100e6) dir = -1;

			engine.rod.levels[1] += dir * dt / ROD_INSERTION_TIME;
			engine.rod.levels[1] = Math.max(0, Math.min(1, engine.rod.levels[1]));

			engine.rod.levels[4] += dir * dt / ROD_INSERTION_TIME;
			engine.rod.levels[4] = Math.max(0, Math.min(1, engine.rod.levels[4]));

			engine.rod.levels[7] += dir * dt / ROD_INSERTION_TIME;
			engine.rod.levels[7] = Math.max(0, Math.min(1, engine.rod.levels[7]));

		}
		for (var i = 0; i < parts.length; i++) {
			var part = engine[parts[i]];
			if (part.target !== undefined) {
				if (part.type == 'value') {
					if (part.levels) {
						for (var j = 0; j < part.levels.length; j++) {
							if (j == 1 || j == 4 || j == 7) {
								continue;
							}
							part.levels[j] += Math.sign(part.target - part.levels[j]) * dt / ROD_INSERTION_TIME;
							if (part.levels[j] > 1) part.levels[j] = 1;
							if (part.levels[j] < 0) part.levels[j] = 0;

						}
					} else {
						part.level += Math.sign(part.target - part.level) * dt / ROD_INSERTION_TIME;
					}
				} else {
					if (part.target > 0.5) {
						part.val = true;
						messages.push('switched on');
					}
					if (part.target < 0.5) {
						part.val = false;
						messages.push('switched off');
					}
				}
			}
		}
		for (var i = 0; i < parts.length; i++) {
			if (engine[parts[i]].angle) {
				engine[parts[i]].angle += 0.1 * Math.min(1, engine[parts[i]].level);
			}
		}
		doFlows(dt);
		coolingTower(regions['postColdA'], dt)
		reactorHeating(regions['reactor1'], dt, 0)
		reactorHeating(regions['reactor2'], dt, 1)
		reactorHeating(regions['reactor3'], dt, 2)
		reactorHeating(regions['reactor4'], dt, 3)
		reactorHeating(regions['reactor5'], dt, 4)
		reactorHeating(regions['reactor6'], dt, 5)
		reactorHeating(regions['reactor7'], dt, 6)

		reactorTimestep(dt);
		engine['gen'].val = (regions['pool'].steamFraction > 0.03);
		if (!nodraw) DrawAll();
	}

	$(function() {
		window.setInterval(timestep, 30);
	});

	var findNoun = function(a) {

		for (var i = 0; i < a.length; i++) {
			if (engine[a[i]]) {
				var ret = a[i];
				a[i] = null;
				return ret;
			}
		}
		return null;
	}
	var verbs = {
		'set': true,
		'x': true,
		'on': true,
		'off': true,
		'wait': true
	};
	var findVerb = function(a) {
		for (var i = 0; i < a.length; i++)
			if (verbs[a[i]]) {
				var ret = a[i];
				a[i] = null;

				return ret;
			}
		return null;
	}

	var findQty = function(a) {
		for (var i = 0; i < a.length; i++) {
			var d = parseFloat(a[i]);
			if (isFinite(d)) {
				a[i] = null;
				return d;
			}
		}
		return 0 / 0;
	}

	var setEngine = function(e, qty) {
		if (qty < 0) qty = 0;
		//if (qty > 1) qty = 1;
		e.target = qty;
		return "done";
	}
	var sendCommand = function(text) {
		var a = text.split(' ');
		var noun = findNoun(a);
		var verb = findVerb(a);
		var qty = findQty(a);
		for (var i = 0; i < a.length; i++) {
			if (a[i]) return 'unknown word:' + a[i];
		}
		if (!noun) {
			return 'You need a named thing in each sentence. For instance "eccs on"';
		}
		if (!isFinite(qty) && !verb) {
			return "I'm not sure what to do with " + noun;
		}
		e = engine[noun];
		if (!e) return "internal error";
		if (isFinite(qty)) {
			var s = setEngine(e, qty);
			return "Set " + noun + " to " + qty + " : " + s;
		}
		if (verb == 'on') {
			var s = setEngine(e, 1);
			return "Set " + noun + " to " + 1 + " : " + s;
		}
		if (verb == 'off') {
			var s = setEngine(e, 0);
			return "Set " + noun + " to " + 0 + " : " + s;
		}
		if (verb == 'wait') {
			for (var i = 0; i < 20; i++) {
				waitReactor(3600 / 20.0);
				timestep();
			}
		}
	}

	var SetXenon = function(level) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].xenon = level / reactor.length;
			//    reactor[i].xenon *= (1.0 - Math.exp(-(i+4)*0.2))*1.2;
		}
	}

	var SetSteam = function(level) {
		for (var i in regions) {
			regions[i].steamFraction = level;
		}
	}

	var SetRods = function(level) {
		for (var i = 0; i < engine.rod.levels.length; i++) {
			engine.rod.levels[i] = level;
		}
	}
	var SetT = function(level) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].energy = REACTOR_HEAT_CAPACITY * level;
		}
	}

	var CheckExplodes = function(name) {
		reactorTimestep(GLOBAL_DT);
		var gainSum = 0;
		var gainCount = 0;
		var success = true;
		for (var i = 0; i < reactor.length; i++) {
			/*if (reactor[i].gain < 0.2) {
			    console.log("TEST FAIL:" + name + ", " + i + " : GAIN = " + reactor[i].gain);
			    success = false;
			}*/
			gainSum += reactor[i].gain;
			gainCount++;
		}
		var gain = gainSum / gainCount;
		if (gain > 0.2) {
			console.log("pass: " + name + " gain=" + gainSum / gainCount);
		} else {
			console.log("FAIL: " + name + " gain=" + gainSum / gainCount + " should be > 0.2");
		}
	}

	var SetPrompt = function(l) {
		for (var i = 0; i < reactor.length; i++) {
			reactor[i].prompt = l;
		}
	}

	var GetPower = function() {
		var ret = 0;
		for (var i = 0; i < reactor.length; i++) {
			ret += reactor[i].prompt + BACKGROUND_HEAT;
		}
		return ret;
	}

	var CheckNoExplodes = function(name) {
		SetPrompt(0);
		var t = reactor[0].energy / REACTOR_HEAT_CAPACITY;
		for (var i = 0; i < 400; i++) {
			reactorTimestep(GLOBAL_DT);
			SetT(t);
		}
		var E = GetPower();
		var success = true;
		if (E > 3500e6) {
			console.log("TEST FAIL:" + name + " power after 8 seconds = " + E);
		}
		console.log("pass:" + name + " power after 8 seconds = " + E);
		var gainSum = 0;
		var gainCount = 0;

		for (var i = 0; i < reactor.length; i++) {
			if (reactor[i].gain > 0.7) {
				console.log("TEST FAIL:" + name + ", " + i + " : GAIN = " + reactor[i].gain);
				success = false;
			}
			gainSum += reactor[i].gain;
			gainCount++;
		}
		console.log("pass: " + name + " gain=" + gainSum / gainCount);
	}

	var INITIAL_XENON = 600e6;

	var Test = function() {
		// Tests:
		// 1) If no xenon, no steam, rod all the way out, should explode.

		// 2) If xenon everywhere, water, 100MW, stable
		// 3) If xenon everywhere, steam, growing fast enough, 

		SetXenon(0);
		SetSteam(0);
		SetRods(0.1);
		SetT(276 + 550);
		CheckExplodes("X0S0R0");

		SetSteam(0.99);
		SetRods(0.9);
		CheckNoExplodes("X0S0R.8");

		SetT(276 + 250);
		SetSteam(0);
		SetRods(0);
		SetXenon(INITIAL_XENON); // not fully saturated.
		CheckNoExplodes("X1S0R0 - N");

		SetT(276 + 250);
		SetSteam(0.2);
		SetRods(0);
		SetXenon(INITIAL_XENON); // not fully saturated.
		CheckExplodes("X1S.4R0 - E");


	}

	Test();

	SetSteam(0);
	SetRods(0.95);
	SetXenon(INITIAL_XENON); // not fully saturated.
	for (var i = 0; i < 3000; i++) {
		var T = 276 + 315
		SetT(T);
		for (var i in regions) {
			if (regions[i].steamFraction > 0.01) regions[i].energy *= 0.8;
			regions[i].energy = regions[i].water * HEAT_CAPACITY * (T);
		}
		regions.eccsPool.energy = regions.eccsPool.water * HEAT_CAPACITY * 300;

		for (var j = 0; j < 5; j++) timestep2(true);
	}


	$(function() {
		$("#chStdin").keypress(function(e) {
			if (e.which == 13) {
				e.preventDefault();
				consoleSubmit();
			}
		});
	});

	var consoleSubmit = function() {
		var k = $('#chStdin').val();
		var response = sendCommand(k);
		document.getElementById("chStdout").innerHTML += `<b><span class="user">guest</span>@terminal:~$</b> ${k}<br>${response}<br>`;
		$('#chStdin').val("");
	}

	var alerter = function(ev) {}
}

// Loading helper

function load(msg) {
	const newItem = document.createElement("li");
	newItem.classList.add("stdout");
	newItem.textContent = msg;
	const out = document.getElementById("outputList");
	if (out) out.appendChild(newItem);

	window.addEventListener("load", (event) => {
		setTimeout(showSplash, 1000)
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
