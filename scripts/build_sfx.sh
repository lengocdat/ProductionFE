#!/usr/bin/env bash
# Builds the Thiên Cơ twist sound effects into public/sfx/.
#
# Sources are Freesound recordings released under CC0 1.0 (public domain: commercial use,
# no attribution required). The licence was checked on each sound's page; see
# public/sfx/SOURCES.txt. The comic "stingers" (coin ting, spring boing) are synthesised
# here from formulas, so they have no third-party rights at all.
#
# Requires ffmpeg with libmp3lame. Re-run after changing any cut; outputs are overwritten.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
out="$here/public/sfx"
work="${SFX_WORK_DIR:-$here/../.runtime/sfx-src}"
mkdir -p "$out" "$work"

fetch() { # id path-on-cdn
  local file="$work/$1.mp3"
  [[ -s "$file" ]] || curl -sfL -o "$file" "https://cdn.freesound.org/previews/$2-hq.mp3"
  echo "$file"
}

thunder=$(fetch 243614 243/243614_260969)   # foad — "Thunderstorm lightning strike", CC0
chicken=$(fetch 316920 316/316920_4921277)  # Rudmer_Rotteveel — "Chicken Single Alarm Call", CC0
belly=$(fetch 52293 52/52293_627019)        # XxBirdoxX — "stomach growl-PiSh_01", CC0
kettle=$(fetch 59571 59/59571_571436)       # 3bagbrew — "whistling_kettle1.mp3", CC0
macaw=$(fetch 504988 504/504988_1661766)    # felix.blume — "Macaw Parrot screaming in a park", CC0

enc=(-ac 1 -ar 44100 -c:a libmp3lame -b:a 96k -map_metadata -1)
# Loud but not clipping, consistent between the three (EBU R128 integrated loudness).
norm="loudnorm=I=-15:TP=-1.5:LRA=11"

# Sét: the close strike (crack at 7.45 s) plus 1.6 s of rumble, then a "ting~" once the
# dust settles — Thiên Đạo paying 88 tu vi of compensation.
ffmpeg -y -hide_banner -loglevel error \
  -ss 7.35 -t 2.3 -i "$thunder" \
  -f lavfi -t 0.9 -i "aevalsrc=1.4*(sin(2*PI*1319*t)*exp(-6*t)+0.7*gt(t\,0.09)*sin(2*PI*1976*t)*exp(-5*(t-0.09))):s=44100" \
  -filter_complex "[0:a]aformat=channel_layouts=mono,afade=t=out:st=1.5:d=0.8[boom];[1:a]adelay=2250[ting];[boom][ting]amix=inputs=2:duration=longest:normalize=0,$norm" \
  "${enc[@]}" "$out/set.mp3"

# Gà: one startled cackle, cut where the bird draws breath, then a cartoon spring "boing"
# as the cultivator shoots off the cushion.
ffmpeg -y -hide_banner -loglevel error \
  -ss 0.12 -t 0.62 -i "$chicken" \
  -f lavfi -t 0.55 -i "aevalsrc=0.28*sin(2*PI*t*(260+170*sin(2*PI*13*t)*exp(-3.5*t)))*exp(-6*t):s=44100" \
  -filter_complex "[0:a]aformat=channel_layouts=mono,volume=2.2,afade=t=in:d=0.02,afade=t=out:st=0.5:d=0.12[bawk];[1:a]adelay=470[boing];[bawk][boing]amix=inputs=2:duration=longest:normalize=0,$norm" \
  "${enc[@]}" "$out/ga.mp3"

# Ọc ọc: the two rumbles of the growl (1.55–3.45 s), pitched down a fifth-ish so it
# sounds like a cultivator's bottomless dantian, slightly slowed for comic timing.
ffmpeg -y -hide_banner -loglevel error \
  -ss 1.55 -t 1.9 -i "$belly" \
  -af "aformat=channel_layouts=mono,asetrate=44100*0.78,aresample=44100,lowpass=f=2200,afade=t=in:d=0.05,afade=t=out:st=2.2:d=0.2,$norm,volume=4.5dB,alimiter=limit=0.85:level=false" \
  "${enc[@]}" "$out/occ.mp3"

# Trượt vỏ Linh Quả: cartoon slide whistle falling 1600 → 350 Hz with a little vibrato,
# then a body "bịch" (low thump + a puff of pink noise). Fully synthesised.
slide='(2*PI*1600*(1-exp(-2.76*t))/2.76+2*sin(2*PI*7*t))'
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -t 0.6 -i "aevalsrc=0.45*min(1\,t/0.03)*(sin($slide)+0.3*sin(2*$slide)):s=44100" \
  -f lavfi -t 0.45 -i "aevalsrc=0.9*sin(2*PI*62*t)*exp(-12*t)+0.4*sin(2*PI*124*t)*exp(-22*t):s=44100" \
  -f lavfi -t 0.25 -i "anoisesrc=c=pink:r=44100:a=0.5" \
  -filter_complex "[0:a]afade=t=out:st=0.5:d=0.1[whistle];[2:a]lowpass=f=450,afade=t=out:st=0:d=0.25[puff];[1:a][puff]amix=inputs=2:duration=longest:normalize=0,adelay=620[thud];[whistle][thud]amix=inputs=2:duration=longest:normalize=0,$norm" \
  "${enc[@]}" "$out/truot.mp3"

# Lộn nhào: one big "vụttt" of band-passed wind, then a "póc" as the cultivator lands.
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -t 0.55 -i "anoisesrc=c=pink:r=44100:a=0.9" \
  -f lavfi -t 0.3 -i "aevalsrc=0.6*sin(2*PI*(220*t+680*(1-exp(-35*t))/35))*exp(-18*t):s=44100" \
  -filter_complex "[0:a]bandpass=f=900:width_type=q:w=0.8,afade=t=in:d=0.27,afade=t=out:st=0.27:d=0.28,volume=3[whoosh];[1:a]adelay=580[pop];[whoosh][pop]amix=inputs=2:duration=longest:normalize=0,$norm" \
  "${enc[@]}" "$out/lonnhao.mp3"

# Bí kíp: pages fluttering open, then a sparkling arpeggio (C6 E6 G6 C7) for the
# "secret" — which turns out to be one line. Fully synthesised.
sparkle=""
for note in "1047 0" "1319 0.08" "1568 0.16" "2093 0.24"; do
  set -- $note
  sparkle+="+gt(t\,$2)*sin(2*PI*$1*t)*exp(-4*(t-$2))"
done
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -t 0.35 -i "anoisesrc=c=white:r=44100:a=0.5" \
  -f lavfi -t 1.3 -i "aevalsrc=0.25*(0${sparkle}):s=44100" \
  -filter_complex "[0:a]highpass=f=1800,tremolo=f=22:d=0.9,afade=t=in:d=0.02,afade=t=out:st=0.2:d=0.15[pages];[1:a]adelay=300[magic];[pages][magic]amix=inputs=2:duration=longest:normalize=0,$norm" \
  "${enc[@]}" "$out/bikip.mp3"

# Phong nhầm "Đại Ngốc": the stock "sad trombone" gag — four falling brass notes, the
# last one wobbling. Fully synthesised from a five-harmonic brass tone.
brass() { # frequency-expression duration
  local p="$1" d="$2"
  echo "aevalsrc=0.3*(sin($p)+0.5*sin(2*$p)+0.33*sin(3*$p)+0.25*sin(4*$p)+0.2*sin(5*$p))*min(1\,t/0.04)*min(1\,($d-t)/0.07):s=44100"
}
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -t 0.34 -i "$(brass '(2*PI*196*t)' 0.34)" \
  -f lavfi -t 0.34 -i "$(brass '(2*PI*185*t)' 0.34)" \
  -f lavfi -t 0.34 -i "$(brass '(2*PI*175*t)' 0.34)" \
  -f lavfi -t 1.1 -i "$(brass '(2*PI*165*t+2.2*sin(2*PI*5.5*t))' 1.1)" \
  -filter_complex "[0:a][1:a][2:a][3:a]concat=n=4:v=0:a=1,lowpass=f=1800,$norm" \
  "${enc[@]}" "$out/daingoc.mp3"

# Quên tắt bếp: a "ding!" of sudden enlightenment, then the kettle at home starts
# screaming — the rising part of the whistle (26.0–28.6 s), which climbs ~2.9 → 3.4 kHz.
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -t 0.9 -i "aevalsrc=0.5*(sin(2*PI*2093*t)+0.35*sin(2*PI*5230*t)*exp(-6*t))*exp(-5*t):s=44100" \
  -ss 26.0 -t 2.6 -i "$kettle" \
  -filter_complex "[1:a]aformat=channel_layouts=mono,highpass=f=1000,volume=3,afade=t=in:d=0.25,afade=t=out:st=2.1:d=0.5,adelay=350[kettle];[0:a][kettle]amix=inputs=2:duration=longest:normalize=0,$norm" \
  "${enc[@]}" "$out/bep.mp3"

# Vẹt của Trưởng lão: two macaw screams cut back to back, "KÉÉ… KÉÉÉ!", like a parrot
# mangling "dừng… bước!".
ffmpeg -y -hide_banner -loglevel error \
  -ss 8.55 -t 0.42 -i "$macaw" \
  -ss 12.06 -t 0.48 -i "$macaw" \
  -filter_complex "[0:a]aformat=channel_layouts=mono,afade=t=in:d=0.01,afade=t=out:st=0.35:d=0.07,apad=pad_dur=0.12[a];[1:a]aformat=channel_layouts=mono,afade=t=in:d=0.01,afade=t=out:st=0.4:d=0.08[b];[a][b]concat=n=2:v=0:a=1,$norm" \
  "${enc[@]}" "$out/vet.mp3"

# Chiêng: two strikes of a temple gong ("boong… BOONG~") for a paid offering. Fully
# synthesised: inharmonic partials over 196 Hz, with a 199 Hz twin for the gong's wobble.
gong='(sin(2*PI*196*t)+0.2*sin(2*PI*199*t)+0.6*sin(2*PI*395.9*t)*exp(-0.8*t)+0.45*sin(2*PI*541*t)*exp(-1.5*t)+0.3*sin(2*PI*797.7*t)*exp(-2.5*t))*exp(-1.3*t)'
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -t 3.2 -i "aevalsrc=0.25*$gong:s=44100" \
  -f lavfi -t 3.2 -i "aevalsrc=0.4*$gong:s=44100" \
  -filter_complex "[1:a]adelay=420[second];[0:a][second]amix=inputs=2:duration=longest:normalize=0,afade=t=out:st=3.0:d=0.6,$norm" \
  "${enc[@]}" "$out/chieng.mp3"

for f in set ga occ truot lonnhao bikip daingoc bep vet chieng; do
  printf '%s.mp3  %ss  %s bytes\n' "$f" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/$f.mp3")" \
    "$(wc -c < "$out/$f.mp3" | tr -d ' ')"
done
