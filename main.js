const width = 128, height = 128, sample_count = 66; // match Python
const CURRENT_JOUR = 0;

let colormaps = {};
let jour_configs;
let jours = [];
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

		if (jour_idx !== 0) {
			cnv.classList.add("hoverable") // jour 0 is never hoverable
		}

		let audio = new Audio(`samples/${jour_name}.mp3`);
		audio.loop = true;

		jours.push({
			ctx: cnv.getContext("2d"),
			px_data: [],
			audio: audio,
			frame: 0
		});

		if (jour_idx !== 0) {
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

					cnv.addEventListener("click", () => {
						jours[jour_idx].audio.play();
						animate(jour_idx);
					});
				})
				.catch(() => {});
		}
		else {
			drawFrame(0,0);
			document.getElementById("play").addEventListener("click", () => {
				jours[0].audio.play();
			});
		}
	}
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

function animate(jour_idx) {
	const frame = jours[jour_idx].frame;
	if (frame >= sample_count) {
		drawFrame(jour_idx, 2 * sample_count - 2 - frame);
	}
	else {
		drawFrame(jour_idx, frame);
	}
	jours[jour_idx].frame = (frame + 1) % (2*sample_count - 1);
	setTimeout(() => animate(jour_idx), 1/15*1000);
}

setup();