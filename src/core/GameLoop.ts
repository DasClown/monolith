import { clamp } from './math';

export interface GameLoopOptions {
  update: (fixedDelta: number, tick: number) => void;
  render: (alpha: number, realDelta: number) => void;
  fixedStep?: number;
  maxSubSteps?: number;
}

/**
 * Fixed-timestep loop: 60 simulation ticks per second regardless of display
 * refresh rate. Rendering receives an interpolation alpha between ticks.
 */
export class GameLoop {
  private readonly updateFn: (fixedDelta: number, tick: number) => void;
  private readonly renderFn: (alpha: number, realDelta: number) => void;
  private readonly fixedStep: number;
  private readonly maxSubSteps: number;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private tick = 0;
  private running = false;
  private paused = false;
  private speed = 1;
  private fpsAccumulator = 0;
  private fpsFrames = 0;
  private measuredFps = 60;

  constructor(options: GameLoopOptions) {
    this.updateFn = options.update;
    this.renderFn = options.render;
    this.fixedStep = options.fixedStep ?? 1 / 60;
    this.maxSubSteps = options.maxSubSteps ?? 6;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.accumulator = 0;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  togglePause(): boolean {
    if (this.paused) this.resume();
    else this.pause();
    return this.paused;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get timeScale(): number {
    return this.speed;
  }

  setTimeScale(scale: number): void {
    this.speed = clamp(scale, 0.25, 3);
  }

  get measuredFramesPerSecond(): number {
    return this.measuredFps;
  }

  get currentTick(): number {
    return this.tick;
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;

    const realDelta = clamp((now - this.lastTime) / 1000, 0, 0.1);
    this.lastTime = now;

    if (realDelta > 0) {
      this.fpsAccumulator += realDelta;
      this.fpsFrames += 1;
      if (this.fpsAccumulator >= 0.5) {
        this.measuredFps = this.fpsFrames / this.fpsAccumulator;
        this.fpsAccumulator = 0;
        this.fpsFrames = 0;
      }
    }

    if (!this.paused) {
      this.accumulator += realDelta * this.speed;
      let steps = 0;
      while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps) {
        this.updateFn(this.fixedStep, this.tick);
        this.accumulator -= this.fixedStep;
        this.tick += 1;
        steps += 1;
      }
      // Drop the backlog after a long stall instead of running a spiral.
      if (steps === this.maxSubSteps) this.accumulator = 0;
    }

    const alpha = this.paused ? 1 : clamp(this.accumulator / this.fixedStep, 0, 1);
    this.renderFn(alpha, realDelta);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
