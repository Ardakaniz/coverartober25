import matplotlib.pyplot as plt
import json

cm_name = "Greys"
cmap = plt.get_cmap(cm_name, 256)
colors = [
    [int(cmap(i)[0] * 255), int(cmap(i)[1] * 255), int(cmap(i)[2] * 255)]
    for i in range(256)
]

# Save as JSON
with open(f"colormaps/{cm_name}.json", "w") as f:
    json.dump(colors, f)
