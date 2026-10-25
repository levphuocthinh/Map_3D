import { WeatherConditionType } from '../types';

class UrbanSoundEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private trafficGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private chimeTimer: number | null = null;
  private currentWeather: WeatherConditionType = 'clear';
  private isNight = false;

  public toggle(
    enable: boolean,
    weather: WeatherConditionType,
    isNight: boolean
  ) {
    this.currentWeather = weather;
    this.isNight = isNight;

    if (enable) {
      this.start();
    } else {
      this.stop();
    }
  }

  public updateEnvironment(weather: WeatherConditionType, isNight: boolean) {
    this.currentWeather = weather;
    this.isNight = isNight;
    if (!this.ctx || !this.isPlaying || !this.rainGain || !this.trafficGain)
      return;

    const now = this.ctx.currentTime;
    const targetRain = weather === 'rain' ? 0.28 : 0.0;
    const targetTraffic = weather === 'rain' ? 0.12 : 0.18;

    this.rainGain.gain.setTargetAtTime(targetRain, now, 0.4);
    this.trafficGain.gain.setTargetAtTime(targetTraffic, now, 0.4);
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(
        weather === 'fog' ? 180 : isNight ? 210 : 290,
        now,
        0.5
      );
    }
  }

  private start() {
    if (this.isPlaying) {
      this.updateEnvironment(this.currentWeather, this.isNight);
      return;
    }

    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;
    this.isPlaying = true;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.01, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.65, ctx.currentTime + 0.6);
    master.connect(ctx.destination);
    this.masterGain = master;

    // 1. Pink/Brown Noise Buffer for Urban Traffic Hum & Rain
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    // Traffic Hum Source
    const trafficSource = ctx.createBufferSource();
    trafficSource.buffer = noiseBuffer;
    trafficSource.loop = true;

    const trafficFilter = ctx.createBiquadFilter();
    trafficFilter.type = 'lowpass';
    trafficFilter.frequency.value = 260;
    this.windFilter = trafficFilter;

    const trafficGain = ctx.createGain();
    trafficGain.gain.value = 0.18;
    this.trafficGain = trafficGain;

    trafficSource.connect(trafficFilter);
    trafficFilter.connect(trafficGain);
    trafficGain.connect(master);
    trafficSource.start();

    // 2. Rain Shower Source (Bandpass + Highpass noise)
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1850;
    rainFilter.Q.value = 0.7;

    const rainGain = ctx.createGain();
    rainGain.gain.value = this.currentWeather === 'rain' ? 0.28 : 0.0;
    this.rainGain = rainGain;

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSource.start();

    // 3. Periodic Ambient City Sounds (distant horns, bird chirps in day, crickets at night)
    this.chimeTimer = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying || !this.masterGain) return;
      const now = this.ctx.currentTime;

      if (Math.random() < 0.45) {
        // Subtle distant car/bus horn or metro bell
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        const baseFreq = Math.random() < 0.5 ? 310 : 392;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 1.25, now + 0.12);

        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.025, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.45);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.48);
      } else if (!this.isNight && this.currentWeather !== 'rain') {
        // Gentle daytime bird chirp
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.16);

        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.018, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.18);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    }, 2800);
  }

  private stop() {
    this.isPlaying = false;
    if (this.chimeTimer) {
      clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new UrbanSoundEngine();
