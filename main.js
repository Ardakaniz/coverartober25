const width = 128, height = 128, sample_count = 66; // match Python
const CURRENT_JOUR = 2;
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
	"...",
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
	"...",
	"DSM said ; ASD cues",
	"crackheart",
	"i still love u"
]

let colormaps = {};
let jour_configs;
let jours = [];
let anim_frame = 0;
let started = false;
let playing_idxs = [];

function setup_dom() {
	const grid = document.querySelector(".grid-container");
	for (let i = 0; i < JOUR_LABELS.length; i++) {
		const node = document.createElement("div")
		node.classList.add("grid-item");

		const label = document.createElement("span");
		label.classList.add("label");
		label.innerText = JOUR_LABELS[i];
		node.appendChild(label);

		const cnv = document.createElement("canvas");
		cnv.id = `J${i+1}`;
		node.appendChild(cnv);

		grid.appendChild(node);
	}
}

async function setup() {
	colormaps["magma"] = await fetch("colormaps/magma.json").then(response => response.json());
	colormaps["twilight_shifted"] = await fetch("colormaps/twilight_shifted.json").then(response => response.json());
	colormaps["hsv"] = await fetch("colormaps/hsv.json").then(response => response.json());
	colormaps["Purples"] = await fetch("colormaps/Purples.json").then(response => response.json());
	colormaps["Blues"] = await fetch("colormaps/Blues.json").then(response => response.json());
	colormaps["Blues_r"] = await fetch("colormaps/Blues_r.json").then(response => response.json());
	colormaps["Greys"] = await fetch("colormaps/Greys.json").then(response => response.json());
	colormaps["cividis"] = await fetch("colormaps/cividis.json").then(response => response.json());
	colormaps["copper"] = await fetch("colormaps/copper.json").then(response => response.json());
	colormaps["viridis"] = await fetch("colormaps/viridis.json").then(response => response.json());
	jour_configs = await fetch("covers/configs.json").then(response => response.json());

	for (let jour_idx = 0; jour_idx < CURRENT_JOUR+1; jour_idx++) {
		const jour_name = `J${jour_idx}`;
		
		if (jour_idx === 0) {
			const audio_j0_bloburl = 
				await fetch("samples/J0.mp3")
					.then(response => response.blob())
					.then(URL.createObjectURL);

			let audio = [];
			for (let i = 0; i < CURRENT_JOUR+1; i++) {
				let cur_audio = new Audio(audio_j0_bloburl);
				cur_audio.loop = true;
				audio.push(cur_audio);
			}

			const play_el = document.getElementById("play");

			const play_cb = () => {
				jours[0].audio[0].play();

				started = true;

				if ("mediaSession" in navigator) 
					navigator.mediaSession.playbackState = "playing";

				for (let i = 1; i < CURRENT_JOUR + 1; i++) {
					document.getElementById(`J${i}`).parentNode.classList.add("activable");
				}

				play_el.removeEventListener("click", play_cb)
			}
			play_el.addEventListener("click", play_cb);

			jours.push({
				ctx: null,
				px_data: [],
				audio: audio,
			});
		}
		else {
			let cnv = document.getElementById(jour_name);
			cnv.width = width;
			cnv.height = height;
			cnv.parentNode.classList.add("enabled");

			if ("pixelated" in jour_configs[jour_idx] && jour_configs[jour_idx]["pixelated"])
				cnv.classList.add("pixelated");

			let audio = new Audio(`samples/${jour_name}.mp3`);
			audio.loop = true;

			jours.push({
				ctx: cnv.getContext("2d"),
				px_data: [],
				audio: audio,
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

					const click_cb = () => {
						if (started) {
							if (playing_idxs.length === 0)
								anim_frame = 0;

							playing_idxs.push(jour_idx);

							jours[0].audio.forEach(audio => audio.volume = Math.sqrt(1.0/playing_idxs.length));
							jours[0].audio[jour_idx].play();
							jours[jour_idx].audio.play();

							if ("mediaSession" in navigator) {
								const mdata = navigator.mediaSession.metadata;
								navigator.mediaSession.metadata = new MediaMetadata({
									title: playing_idxs.map(i => JOUR_LABELS[i-1]).join(" | "),
									album: mdata.album,
									artist: mdata.artist,
									artwork: mdata.artwork,
								});
							}

							cnv.parentNode.classList.remove("activable")
							cnv.parentNode.classList.add("activated")
							cnv.removeEventListener("click", click_cb);
							cnv.previousSibling.removeEventListener("click", click_cb);
						}
					};
					cnv.addEventListener("click", click_cb);
					cnv.previousSibling.addEventListener("click", click_cb);
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
	if (jour_idx == 0) {
		jours[0].ctx.fillStyle = "#433160";
		jours[0].ctx.fillRect(0,0,width,height);
		return;
	}

	const image_data = jours[jour_idx].ctx.createImageData(width, height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = jours[jour_idx].px_data[y][x][frame_idx];
			const [r,g,b] = colormaps[jour_configs[jour_idx].cm][px];
			const index = (y*width + x)*4;
			image_data.data[index+0] = r;
			image_data.data[index+1] = g;
			image_data.data[index+2] = b;
			image_data.data[index+3] = 255;
		}
	}

	jours[jour_idx].ctx.putImageData(image_data, 0, 0);
}

function animate() {
	let img_idx = (anim_frame >= sample_count) ? 2 * sample_count - 2 - anim_frame : anim_frame;

	playing_idxs.forEach(x => drawFrame(x, img_idx));

	anim_frame = (anim_frame + 1) % (2*sample_count - 1);
	setTimeout(() => animate(), 1/15*1000);
}

function toggle_audio(audio) {
	console.log(audio);
	if (audio.paused) audio.play();
	else audio.pause();
};

setup_dom();
setup();