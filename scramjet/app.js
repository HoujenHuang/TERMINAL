const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	prefix: "/scramjet/",
	codec: {
		encode: (url) => encodeURIComponent(url),
		decode: (url) => decodeURIComponent(url)
	},
	flags: {
		captureErrors: true,
		strictRewrites: true
	}
});

async function init() {
	if ("serviceWorker" in navigator) {
		await navigator.serviceWorker.register("/sw.js", {
			scope: "/"
		});

		await navigator.serviceWorker.ready;
	}

	await scramjet.init();

	const frame = scramjet.createFrame();
	document.getElementById("container").appendChild(frame.frame);

	frame.go("https://example.com");
}

init();
