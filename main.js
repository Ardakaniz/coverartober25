const width = 128, height = 128, sample_count = 66; // match Python
const CURRENT_JOUR = 1;

let colormaps = {};
let jour_configs;
let jours = [];
let anim_frame = 0;
let started = false;
let playing_idxs = [];
let synced_audio = {
	handles: [],
	num_ended: 0,
	pending: 0
};

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
		let cnv = document.getElementById(jour_name);
		cnv.width = width;
		cnv.height = height;

		//// AUDIO SETUP ////
		let audio;
		if (jour_idx === 0) {
			const audio_j0_bloburl = 
				await fetch("samples/J0.mp3")
					.then(response => response.blob())
					.then(URL.createObjectURL);

			audio = [];
			for (let i = 0; i < CURRENT_JOUR+1; i++) {
				let cur_audio = new Audio(audio_j0_bloburl);
				cur_audio.loop = true;
				audio.push(cur_audio);
			}
		}
		else {
			audio = new Audio(`samples/${jour_name}.mp3`);

			if (jour_configs[jour_idx].sync !== true) {
				audio.loop = true;
			}
			else {
				audio.addEventListener("ended", () => {
					this.currentTime = 0;

					synced_audio.num_ended++;

					if (synced_audio.num_ended >= synced_audio.handles.length - synced_audio.pending) {
						synced_audio.handles.forEach(x => x.play());
						synced_audio.num_ended = 0;
						synced_audio.pending = 0;
					}
				});
			}
		}
		////  ////

		jours.push({
			ctx: cnv.getContext("2d"),
			px_data: [],
			audio: audio,
			frame: 0
		});

		//// COVER SETUP ////
		if (jour_idx === 0) {
			drawFrame(0,0);
			const play_el = document.getElementById("play");

			const play_cb = () => {
				jours[0].audio[0].play();
				play_el.style.color = "white";

				started = true;

				for (let i = 1; i < CURRENT_JOUR + 1; i++) {
					document.getElementById(`J${i}`).classList.add("hoverable")
				}

				play_el.removeEventListener("click", play_cb)
			}
			play_el.addEventListener("click", play_cb);
		}
		else {
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

							if (jour_configs[jour_idx].sync) {
								synced_audio.handles.push(jours[jour_idx].audio);

								// If no sound is waiting to be played, play this one
								if (synced_audio.pending === 0)
									jours[jour_idx].audio.play();

								synced_audio.pending++;
							}
							else {
								jours[jour_idx].audio.play();
							}

							cnv.classList.remove("hoverable")
							cnv.removeEventListener("click", click_cb);
						}
					};
					cnv.addEventListener("click", click_cb);
				})
				.catch(() => {});
		}
		//// ////
	}

	animate();
}

function drawFrame(jour_idx, frame_idx) {
	if (jour_idx == 0) {
		jours[0].ctx.fillStyle = "#8661C1";
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

setup();