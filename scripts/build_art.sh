#!/usr/bin/env bash
# Builds the room's decorative art and background music into public/chanh-dien/.
#
# Sources: "Chánh Điện Tịnh Tâm" by Kent Juno, MIT licence (public/chanh-dien/LICENSE must
# ship with these files), fetched from the pinned commit below. Each file is re-coloured or
# re-arranged here to fit Đạo Tràng's tu tiên look; see public/chanh-dien/SOURCES.txt.
#
# Requires ImageMagick 7 (`magick`) and ffmpeg with libmp3lame. Outputs are overwritten.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
out="$here/public/chanh-dien"
work="${ART_WORK_DIR:-$here/../.runtime/art-src}"
mkdir -p "$out" "$work"

commit=bee578d267c52940da08bc16171cfe8392b69d17
fetch() { # path-in-repo
  local file="$work/$(basename "$1")"
  [[ -s "$file" ]] || curl -sfL -o "$file" "https://raw.githubusercontent.com/kentjuno/chanh-dien-online/$commit/$1"
  echo "$file"
}

# Re-hues only the pixels whose hue lies within `width` (0..1 of the colour wheel) of `centre`,
# so e.g. a red banner turns violet while its gold trim stays gold. Greys are left alone.
# recolor in out centre width modulate-hue [saturation%] [brightness%]   (modulate: 100 = no change)
recolor() {
  local in=$1 dst=$2 c=$3 w=$4 h=$5 s=${6:-100} b=${7:-100}
  magick "$in" \( +clone -modulate "$b,$s,$h" \) \
    \( "$in" -alpha off -fx "hd=abs(u.hue-$c); hd=min(hd,1-hd); clamp(($w-hd)/0.03)*clamp((u.saturation-0.08)/0.1)" \) \
    -compose over -composite -strip "$dst"
}

# Tử khí đông lai: the red banner becomes imperial violet, gold trim kept.
recolor "$(fetch assets/fx_banner.png)" "$out/bang-ron-tu-khi.png" 0.0 0.07 55 85 92
# Linh liên: the pink lotus becomes an ice-blue spirit lotus with its golden heart.
recolor "$(fetch assets/fx_lotus.png)" "$out/linh-lien.png" 0.92 0.12 16
# Lá ngọc: the gold petal becomes a jade leaf, mirrored.
recolor "$(fetch assets/fx_petal.png)" "$out/la-ngoc.png" 0.12 0.1 160 90
magick "$out/la-ngoc.png" -flop "$out/la-ngoc.png"
# Nhang linh khí: lilac smoke turns to pale jade spirit-qi. The source has a stray 1–5 px
# strip of a neighbouring sprite at its left edge; chop it off.
recolor "$(fetch assets/fx_incense.png)" "$out/nhang-linh-khi.png" 0.85 0.15 26
magick "$out/nhang-linh-khi.png" -gravity West -chop 6x0 -trim +repage "$out/nhang-linh-khi.png"
# Cuộn sổ: the scroll's red ribbon matches the violet banner, mirrored (stray 14 px strip chopped first).
recolor "$(fetch assets/fx_scroll.png)" "$out/cuon-so.png" 0.0 0.07 55 85 92
magick "$out/cuon-so.png" -gravity West -chop 14x0 -trim +repage -flop "$out/cuon-so.png"

# Nhạc động phủ: each track slowed 6 % (≈1 semitone lower, like a slower tape), given a cave
# echo, softened, and laid over a quiet synthesised wind; loudness-normalised for the
# background (the client plays it at MUSIC_VOLUME on top).
music() { # src dst
  local dur
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
  dur=$(awk -v d="$dur" 'BEGIN { printf "%.2f", d / 0.94 }')
  ffmpeg -y -hide_banner -loglevel error -i "$1" \
    -f lavfi -t "$dur" -i "anoisesrc=c=brown:a=0.5:r=44100:seed=7" \
    -filter_complex "[0:a]asetrate=44100*0.94,aresample=44100,aecho=0.8:0.55:90|170:0.22|0.12,lowpass=f=8500[m];\
[1:a]lowpass=f=500,highpass=f=80,tremolo=f=0.1:d=0.7,aformat=channel_layouts=stereo[w];\
[m][w]amix=inputs=2:weights=1 0.6:normalize=0:duration=first,afade=t=in:d=2,afade=t=out:st=$(awk -v d="$dur" 'BEGIN { print d - 3 }'):d=3,loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k -map_metadata -1 "$2"
}
music "$(fetch assets/music/music1.mp3)" "$out/dong-phu-1.mp3"
music "$(fetch assets/music/music2.mp3)" "$out/dong-phu-2.mp3"

for f in bang-ron-tu-khi.png linh-lien.png la-ngoc.png nhang-linh-khi.png cuon-so.png dong-phu-1.mp3 dong-phu-2.mp3; do
  printf '%-20s %8s bytes\n' "$f" "$(wc -c < "$out/$f" | tr -d ' ')"
done
