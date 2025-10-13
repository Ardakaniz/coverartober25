const width = 128, height = 128, sample_count = 66; // match Python
const CURRENT_JOUR = 13;
const MAX_SIMULTANEOUS_SAMPLE = 8;
const JOUR_LABELS = [
	"digital playground",
	"Calin",
	"blue lightning",
	"SUNKISSED",
	"azerty vitamin",
	"UnisOn",
	"NeonBloodRace",
	"ALL star",
	"Pommefreche",
	"Xoxo Baby Velour",
	"lunes furiosoooOO",
	"Purple Ash",
	"うずまき ⁠๑",
	"Aurore",
	"ENOCHIAN",
	"one percent",
	"Kernel panic",
	"DCIM",
	"six nine kelvin",
	"Baby steps",
	"sang brulure sel",
	"angel edge",
	"dress to depress",
	"today is for me",
	"Chii elixir",
	"threesix gambling sq",
	"RERERE",
	"где Надежда",
	"DSM said ; ASD cues",
	"crackheart",
	"i still love u"
]

let colormaps = ["RdPu","Pastel2","hot","Spectral","magma","twilight_shifted","hsv","Purples","Purples_r","Greens","Blues","Blues_r","Greys","cividis","copper","viridis","winter","summer"];
let jour_configs;
let jours = [];
let anim_frame = 0;
let started = false;
let playing_idxs = [];

function setup_dom() {
	const grid = document.querySelector(".grid-container");
	for (let i = 0; i < JOUR_LABELS.length; i++) {
		const node = document.createElement("div")
		node.id = `J${i+1}`;
		node.classList.add("grid-item");

		const label = document.createElement("span");
		label.classList.add("label");
		label.innerText = JOUR_LABELS[i];
		node.appendChild(label);

		const preview = document.createElement("img");
		preview.classList.add("preview");
		if (i+1 > CURRENT_JOUR) {
			preview.src = "appIcon.png";
			preview.style.opacity = "20%";
		}
		else preview.src = `covers/J${i+1}.png`;
		preview.style.display = "block";
		node.appendChild(preview);

		const cnv = document.createElement("canvas");
		cnv.style.display = "none";
		node.appendChild(cnv);

		grid.appendChild(node);
	}

	fetch("covers/configs.json")
		.then(response => response.json())
		.then(confs => {
			jour_configs = confs;
			for (let i = 1; i < JOUR_LABELS.length + 1; i++) {
				if ("pixelated" in jour_configs[i] && jour_configs[i]["pixelated"])
					document.getElementById(`J${i}`).classList.add("pixelated");
			}
		});
}

async function setup() {
	colormaps = Object.fromEntries(
		await Promise.all(
			colormaps.map(async (x) => [
				x,
				await fetch(`colormaps/${x}.json`).then((r) => r.json())
			])
		)
	);

	for (let jour_idx = 0; jour_idx < CURRENT_JOUR+1; jour_idx++) {
		const jour_name = `J${jour_idx}`;
		
		if (jour_idx === 0) {
			jours.push({
				ctx: null,
				px_data: [],
				audio: [],
			});

			fetch("samples/J0.mp3")
				.then(response => response.blob())
				.then(URL.createObjectURL)
				.then(audio_bloburl => {
					for (let i = 0; i < CURRENT_JOUR+1; i++) {
						let cur_audio = new Audio(audio_bloburl);
						cur_audio.loop = true;
						cur_audio.volume = 0.8;
						jours[0].audio.push(cur_audio);
					}

					const play_el = document.getElementById("play");

					const play_cb = () => {
						jours[0].audio[0].play();

						started = true;

						if ("mediaSession" in navigator) 
							navigator.mediaSession.playbackState = "playing";

						for (let i = 1; i < CURRENT_JOUR + 1; i++) {
							document.getElementById(`J${i}`).classList.add("activable");
						}

						play_el.removeEventListener("click", play_cb)
					}
					play_el.addEventListener("click", play_cb);
				});
		}
		else {
			let cnv = document.querySelector("#" + jour_name + ">canvas");
			cnv.width = width;
			cnv.height = height;
			cnv.parentNode.classList.add("enabled");

			let audio = new Audio(`samples/${jour_name}.mp3`);
			audio.loop = true;
			audio.volume = 0;

			let audio_start = null;
			if ("has_start" in jour_configs[jour_idx] && jour_configs[jour_idx]["has_start"]) {
				audio_start = new Audio(`samples/${jour_name}_start.mp3`);
				audio_start.addEventListener("ended", () => audio.play());
			}

			const ctx = cnv.getContext("2d");
			let img_data = ctx.createImageData(width, height);
			for (let i = 3; i < img_data.data.length; i += 4)
				img_data.data[i] = 255;

			jours.push({
				ctx: ctx,
				img_data: img_data,
				px_data: [],
				audio: audio,
				target_volume: 0.,
			});

			fetch(`covers/${jour_name}.bin`)
				.then(response => response.arrayBuffer())
				.then(buffer => {
					const data = new Uint8Array(buffer);
					let idx = 0;
					let px_data = jours[jour_idx].px_data;

					for(let x = 0; x < width; x++) {
						px_data.push([]);
						for(let y = 0; y < height; y++) {
							px_data[x].push([]);
							for(let f = 0; f < sample_count; f++) {
								const px = data[idx++];
								if (!jour_configs[jour_idx].force_cycle) {
									px_data[x][y].push(px);
								}
								else if (px >= 128) {
									px_data[x][y].push(2*(256 - px)-1);
								}
								else {
									px_data[x][y].push(2*px);
								}
							}
						}
					}

					drawFrame(jour_idx, jour_configs[jour_idx].base_frame);

					document.querySelector("#" + jour_name + ">img").style.display = "none";
					cnv.style.display = "block";

					const click_cb = () => {
						if (started) {
							if (playing_idxs.length === 0)
								anim_frame = 0;

							if (playing_idxs.length === MAX_SIMULTANEOUS_SAMPLE)
								jours[playing_idxs.splice(0, 1)[0]].target_volume = 0;

							playing_idxs.push(jour_idx);

							jours[0].audio.forEach(audio => audio.volume = 0.8*Math.pow(1.0/playing_idxs.length, 1/2.5));
							jours[0].audio[jour_idx].play();
							jours[jour_idx].target_volume = 1;

							if (audio_start !== null) audio_start.play();
							else audio.play();

							if ("mediaSession" in navigator) {
								const mdata = navigator.mediaSession.metadata;
								navigator.mediaSession.metadata = new MediaMetadata({
									title: parseInt(playing_idxs.join("")).toString(16),
									album: mdata.album,
									artist: mdata.artist,
									artwork: [{"src": `covers/${jour_name}.png`, sizes: "128x128", type:"images/png"}]
								});
							}

							cnv.parentNode.classList.remove("activable")
							cnv.parentNode.classList.add("activated")
							cnv.removeEventListener("click", click_cb);
							cnv.previousSibling.removeEventListener("click", click_cb);
						}
					};
					cnv.addEventListener("click", click_cb);
					document.querySelector("#" + jour_name + ">span").addEventListener("click", click_cb);
				})
				.catch(() => {});
		}
		//// ////
	}

	animate();

	if ("mediaSession" in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: " - ",
			artist: "Irrational",
			album: "Coverartober 2025",
			artwork: [{"src": "appIcon.png", sizes: "128x128", type:"images/png"}]
		});

		navigator.mediaSession.setActionHandler("play", () => {
			navigator.mediaSession.playbackState = "playing";

			jours[0].audio[0].play();
			playing_idxs.forEach(x => {
				jours[0].audio[x].play();
				jours[x].audio.play();
			});
		});
		navigator.mediaSession.setActionHandler("pause", () => {
			navigator.mediaSession.playbackState = "paused";

			jours[0].audio[0].pause();
			playing_idxs.forEach(x => {
				jours[0].audio[x].pause();
				jours[x].audio.pause();
			});
		});
	}
}

function drawFrame(jour_idx, frame_idx) {
	const jour = jours[jour_idx];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = jour.px_data[y][x][frame_idx];
			const [r,g,b] = colormaps[jour_configs[jour_idx].cm][px];
			const index = (y*width + x)*4;
			jour.img_data.data[index+0] = r;
			jour.img_data.data[index+1] = g;
			jour.img_data.data[index+2] = b;
		}
	}

	jour.ctx.putImageData(jour.img_data, 0, 0);
}

function animate() {
	let img_idx = (anim_frame >= sample_count) ? 2 * sample_count - 2 - anim_frame : anim_frame;

	playing_idxs.forEach(x => drawFrame(x, img_idx));
	
	for (let i = 1; i < CURRENT_JOUR + 1; i++) {
		const tar_vol = jours[i].target_volume;
		const cur_vol = jours[i].audio.volume;

		jours[i].audio.volume += (tar_vol - cur_vol) * 0.05;

		if (tar_vol == 0 && cur_vol < 0.1)
			jours[i].audio.pause();
	}

	anim_frame = (anim_frame + 1) % (2*sample_count - 1);
	setTimeout(() => animate(), 1/15*1000);
}

setup_dom();
setup();