// Звуковой движок браузера (docs/AUDIO.md §7–8): шины master/voice/sfx на Web Audio API.
// Ограничения браузера и беззвучный режим устройства не обходятся: звук стартует только после жеста пользователя.
import type { VoiceHandle, VoicePlayer } from './voiceChannel';

export interface VoiceManifest {
  /** id реплики → имена файлов по форматам; отсутствующая реплика просто не звучит. */
  readonly lines: Readonly<Record<string, { readonly opus?: string; readonly m4a?: string }>>;
}

export interface Volumes {
  master: number;
  voice: number;
  sfx: number;
  muted: boolean;
}

export type SfxName = 'deal' | 'place' | 'slap' | 'take' | 'bito' | 'click' | 'win' | 'lose' | 'knock' | 'clack' | 'shuffle';

export class AudioEngine implements VoicePlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer | null>();
  /** Реплики всех загруженных персонажей: id → файлы с путём от корня голосов (<персонаж>/<файл>). */
  private manifest: VoiceManifest = { lines: {} };
  private readonly loadedVoices = new Set<string>();
  private volumes: Volumes = { master: 1, voice: 1, sfx: 1, muted: false };
  private format: 'opus' | 'm4a' = 'opus';
  private userPaused = false;
  private readonly levelData = new Uint8Array(256);
  lastError: string | null = null;

  /** baseUrl — корень голосов (audio/ru/); голос персонажа — в <baseUrl><id>/manifest.json. */
  constructor(private readonly baseUrl: string) {}

  /** Создаётся по первому жесту пользователя (кнопка «Играть»). */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      this.lastError = 'audio-unsupported';
      return;
    }
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.voiceBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.voiceBus.connect(this.analyser);
      this.voiceBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      const probe = document.createElement('audio');
      this.format = probe.canPlayType('audio/ogg; codecs="opus"') || probe.canPlayType('audio/webm; codecs="opus"') ? 'opus' : 'm4a';
      this.applyVolumes();
    } catch (err) {
      this.lastError = 'audio-init-failed';
      console.warn('Звук недоступен', err);
      this.ctx = null;
    }
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  setVolumes(v: Volumes): void {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.voiceBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.muted ? 0 : this.volumes.master, t, 0.02);
    this.voiceBus.gain.setTargetAtTime(this.volumes.voice, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.02);
  }

  /** Пауза при скрытой вкладке, рекламе, событиях платформы; возобновление — только если звук не выключен. */
  setPaused(paused: boolean): void {
    this.userPaused = paused;
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** Манифест голоса персонажа. Повторная загрузка того же персонажа ничего не делает. */
  async loadVoice(character: string): Promise<void> {
    if (this.loadedVoices.has(character)) return;
    this.loadedVoices.add(character);
    try {
      const res = await fetch(`${this.baseUrl}${character}/manifest.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const m = (await res.json()) as VoiceManifest;
      const lines = { ...this.manifest.lines };
      const prefixed = (f?: string) => (f ? `${character}/${f}` : undefined);
      for (const [id, e] of Object.entries(m.lines)) lines[id] = { ...(e.opus ? { opus: prefixed(e.opus) } : {}), ...(e.m4a ? { m4a: prefixed(e.m4a) } : {}) };
      this.manifest = { lines };
    } catch (err) {
      this.lastError = 'manifest-failed';
      console.warn(`Манифест реплик ${character} не загружен`, err);
    }
  }

  /** Есть ли настоящий файл реплики в манифесте. */
  hasLine(id: string): boolean {
    const e = this.manifest.lines[id];
    return !!e && !!(e.opus || e.m4a) && this.buffers.get(id) !== null;
  }

  /** Сколько реплик из списка есть в голосе. */
  availableCount(ids: readonly string[]): number {
    return ids.filter((id) => this.hasLine(id)).length;
  }

  /**
   * Предзагрузка реплик выбранного персонажа; повреждённые файлы помечаются недоступными. Декодированные реплики
   * других персонажей освобождаются: голос в памяти — несжатый (Харитон ≈ 90 МБ), и «Игротека» не копит голоса
   * всех столов, за которыми игрок уже сидел. При возврате к столу файлы берутся из кэша браузера.
   */
  async preload(ids: readonly string[]): Promise<void> {
    const keep = new Set(ids);
    for (const id of [...this.buffers.keys()]) if (!keep.has(id)) this.buffers.delete(id);
    await Promise.all(ids.filter((id) => this.manifest.lines[id]).map((id) => this.load(id)));
  }

  private async load(id: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(id)) return this.buffers.get(id) ?? null;
    const entry = this.manifest.lines[id];
    const file = entry?.[this.format] ?? entry?.opus ?? entry?.m4a;
    if (!this.ctx || !file) return null;
    try {
      const res = await fetch(`${this.baseUrl}${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(id, buf);
      return buf;
    } catch (err) {
      console.warn(`Реплика ${id} недоступна`, err);
      this.buffers.set(id, null);
      return null;
    }
  }

  play(id: string, onEnd: () => void): VoiceHandle | null {
    const buf = this.buffers.get(id);
    if (!this.ctx || !this.voiceBus || !buf) return null;
    // Звук на паузе (вкладка скрыта или без фокуса): реплика пропускается, но остаётся доступной —
    // null означал бы «файла нет», и канал больше никогда бы её не выбрал.
    if (this.userPaused) {
      onEnd();
      return { stop: () => {} };
    }
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.connect(gain).connect(this.voiceBus);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onEnd();
    };
    src.onended = finish;
    src.start();
    return {
      stop: (fadeMs) => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        gain.gain.setTargetAtTime(0, t, fadeMs / 3000);
        src.stop(t + fadeMs / 1000);
      },
    };
  }

  /** Отладка и e2e: сколько реплик сейчас декодировано в памяти. */
  get decodedCount(): number {
    let n = 0;
    for (const b of this.buffers.values()) if (b) n++;
    return n;
  }

  /** Громкость голоса 0…1 — для открытия рта, когда нет готовой разметки фонем. */
  voiceLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.levelData);
    let sum = 0;
    for (const v of this.levelData) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.levelData.length) * 4);
  }

  /** Короткие процедурные эффекты карт (не голос): шум и тон с огибающей. */
  sfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.userPaused) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(this.sfxBus);
    const noise = (dur: number, freq: number, q: number, peak: number) => {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = b.getChannelData(0);
      // Детерминированный шум: эффект одинаков при каждом воспроизведении.
      let x = 22222;
      for (let i = 0; i < len; i++) {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        data[i] = ((x / 0x7fffffff) * 2 - 1) * (1 - i / len) ** 2;
      }
      const s = ctx.createBufferSource();
      s.buffer = b;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = peak;
      s.connect(f).connect(g).connect(out);
      s.start(t);
    };
    const tone = (freq: number, dur: number, peak: number, delay = 0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(peak, t + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g).connect(out);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.05);
    };
    switch (name) {
      case 'deal': return noise(0.06, 2400, 1.2, 0.5);
      case 'place': return noise(0.08, 1800, 1, 0.7);
      case 'slap': return noise(0.12, 900, 0.8, 1);
      case 'take': return noise(0.25, 1400, 0.7, 0.6);
      case 'bito': noise(0.18, 1100, 0.7, 0.5); return tone(520, 0.18, 0.12, 0.05);
      case 'click': return tone(880, 0.05, 0.08);
      case 'win': [523, 659, 784].forEach((f, i) => tone(f, 0.3, 0.16, i * 0.12)); return;
      case 'lose': [392, 330].forEach((f, i) => tone(f, 0.35, 0.14, i * 0.16)); return;
      // Домино: стук костяшкой о стол, сухой щелчок кости о кость, перемешивание базара.
      case 'knock': noise(0.09, 420, 1.4, 1); return tone(140, 0.12, 0.22);
      case 'clack': noise(0.05, 3200, 2.2, 0.8); return tone(1900, 0.04, 0.06);
      case 'shuffle': for (let i = 0; i < 5; i++) noise(0.05, 2600 + i * 120, 1.6, 0.35); return;
    }
  }
}
