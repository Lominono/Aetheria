// Zero-GC Fixed-Capacity Ring Buffer Particle System

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

const MAX_PARTICLES = 700;

export class ParticlePool {
  public particles: Particle[];
  private cursor: number = 0;

  constructor() {
    this.particles = new Array<Particle>(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#ffffff',
        gravity: 0,
      };
    }
  }

  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number = 2,
    maxLife: number = 0.6,
    gravity: number = 0
  ) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.size = size;
    p.color = color;
    p.gravity = gravity;
  }

  public burst(
    tileX: number,
    tileY: number,
    count: number,
    colors: string[],
    speed: number = 14,
    size: number = 2.5,
    maxLife: number = 0.65,
    gravity: number = 0
  ) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const mag = (0.25 + Math.random() * 0.75) * speed;
      const color = colors[i % colors.length];
      this.spawn(
        tileX + (Math.random() - 0.5) * 0.6,
        tileY + (Math.random() - 0.5) * 0.6,
        Math.cos(angle) * mag,
        Math.sin(angle) * mag,
        color,
        size * (0.7 + Math.random() * 0.6),
        maxLife * (0.7 + Math.random() * 0.5),
        gravity
      );
    }
  }

  public update(dt: number) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  public clear() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
    }
  }
}

export const particlePool = new ParticlePool();
