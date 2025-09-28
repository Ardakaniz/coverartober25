const width = 128, height = 128, sample_count = 66; // match Python
const CURRENT_JOUR = 0;

let colormap = [];
fetch("colormaps/twilight_shifted.json")
	.then(response => response.json())
	.then(data => {
		colormap = data;
	});

let jours = [];
for (let jour_idx = 0; jour_idx < CURRENT_JOUR+1; jour_idx++) {
	const jour_name = `J${jour_idx}`;
	cnv = document.getElementById(jour_name);
	cnv.width = width;
	cnv.height = height;

	let audio = new Audio(`samples/${jour_name}.mp3`);
	audio.loop = true;

	jours.push({
		ctx: cnv.getContext("2d"),
		px_data: [],
		audio: audio,
		frame: 0
	});

	if (jour_name !== 0) {
		fetch(`covers/${jour_name}.bin`)
		.then(response => response.arrayBuffer())
		.then(buffer => {
			const data = new Uint8Array(buffer);
			let idx = 0;
			let px_data = jours[jour_idx].px_data;

			for(let x = 0; x < width; x++){
				px_data.push([]);
				for(let y = 0; y < height; y++){
					px_data[x].push([]);
					for(let f = 0; f < sample_count; f++){
						px_data[x][y].push(data[idx++]);
					}
				}
			}

			drawFrame(jour_idx, 10);
		})
		.catch(() => {});
	}
	else drawFrame(0,0);

	cnv.addEventListener("click", () => {
		jours[jour_idx].audio.play();
		animate(jour_idx);
	});
}

function drawFrame(jour_idx, frame_idx) {
	if (jour_idx == 0) {
		jours[0].ctx.fillStyle = "black";
		jours[0].ctx.fillRect(0,0,width,height);
		return;
	}

	const image_data = jours[jour_idx].ctx.createImageData(width, height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = jours[jour_idx].px_data[y][x][frame_idx];
			const [r,g,b] = colormap[px];
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
	drawFrame(jour_idx, frame);
	jours[jour_idx].frame = (frame + 1) % sample_count;
	setTimeout(() => animate(jour_idx), 1/15*1000);
}