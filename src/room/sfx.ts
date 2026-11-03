// Sound effects for twists and offerings, plus background music. Sources: public/sfx/SOURCES.txt,
// public/chanh-dien/SOURCES.txt.

/** Sound key → file: every twist kind in BE twist.go, plus "offering" (paid cúng dường). */
const SOUNDS: Readonly<Record<string, string>> = {
  lightning: '/sfx/set.mp3',
  chicken: '/sfx/ga.mp3',
  belly: '/sfx/occ.mp3',
  stove: '/sfx/bep.mp3',
  slip: '/sfx/truot.mp3',
  scripture: '/sfx/bikip.mp3',
  overbow: '/sfx/lonnhao.mp3',
  parrot: '/sfx/vet.mp3',
  misname: '/sfx/daingoc.mp3',
  offering: '/sfx/chieng.mp3',
};

/** "Nhạc động phủ" loops played back-to-back while sound is on (built by scripts/build_art.sh). */
const MUSIC = ['/chanh-dien/dong-phu-1.mp3', '/chanh-dien/dong-phu-2.mp3'] as const;
// Files are normalised to about -15 LUFS; 0.45 keeps the music ~7 dB under the sound effects.
const MUSIC_VOLUME = 0.45;

const MUTE_KEY = 'dt:sound';

export class Sfx {
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  // Streamed (not decoded up front) and routed through a gain node: iOS ignores <audio>.volume.
  private music: HTMLAudioElement | null = null;
  private track = Math.floor(Math.random() * MUSIC.length);
  private wantMusic = false;
  muted = localStorage.getItem(MUTE_KEY) === 'off';

  /** Browsers only allow audio after a user gesture, so call this from a click handler. */
  unlock(): void {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    this.loading ??= this.load(this.ctx);
  }

  /** Background music for a session in the room; `stopMusic` when leaving it. */
  startMusic(): void {
    this.wantMusic = true;
    this.syncMusic();
  }

  stopMusic(): void {
    this.wantMusic = false;
    this.syncMusic();
  }

  private syncMusic(): void {
    const ctx = this.ctx;
    if (!this.wantMusic || this.muted || !ctx) {
      this.music?.pause();
      return;
    }
    if (!this.music) {
      const el = new Audio(MUSIC[this.track]);
      el.preload = 'auto';
      el.addEventListener('ended', () => {
        this.track = (this.track + 1) % MUSIC.length;
        el.src = MUSIC[this.track];
        void el.play().catch(() => undefined);
      });
      const gain = ctx.createGain();
      gain.gain.value = MUSIC_VOLUME;
      ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
      this.music = el;
    }
    void this.music.play().catch(error => console.warn('Không phát được nhạc nền', error));
  }

  private async load(ctx: AudioContext): Promise<void> {
    await Promise.all(Object.entries(SOUNDS).map(async ([kind, url]) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.buffers.set(kind, await ctx.decodeAudioData(await res.arrayBuffer()));
      } catch (error) {
        console.warn(`Không tải được âm thanh ${url}`, error);
      }
    }));
  }

  /** Plays the sound for a key in SOUNDS (twist kind or "offering"); `volume` 0..1. */
  play(kind: string, volume: number): void {
    const ctx = this.ctx;
    const buffer = this.buffers.get(kind);
    if (this.muted || !ctx || !buffer || document.hidden) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on');
    this.syncMusic();
  }

  close(): void {
    this.music?.pause();
    this.music?.removeAttribute('src');
    this.music = null;
    void this.ctx?.close();
    this.ctx = null;
    this.loading = null;
    this.buffers.clear();
  }
}
