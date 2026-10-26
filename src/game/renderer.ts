import {
  Biome,
  Building,
  Creature,
  MAP_SIZE,
  TILE_PIXEL_SIZE,
  WorldState,
} from '../types/game';
import { particlePool } from './particlePool';

const BIOME_BASE_COLORS: Record<Biome, [string, string]> = {
  [Biome.DEEP_WATER]: ['#0D2B45', '#113452'],
  [Biome.SHALLOW_WATER]: ['#1D5B79', '#246A8C'],
  [Biome.SAND]: ['#E2C779', '#D6B969'],
  [Biome.GRASS]: ['#468942', '#3D7B3A'],
  [Biome.FOREST]: ['#265C2E', '#1F4D26'],
  [Biome.MOUNTAIN]: ['#646973', '#555A63'],
  [Biome.SNOW]: ['#EBF2F7', '#D8E4EE'],
  [Biome.LAVA]: ['#EA580C', '#DC2626'],
  [Biome.SCORCHED]: ['#332924', '#271F1B'],
};

const RACE_COLORS: Record<string, { body: string; head: string; accent: string }> = {
  humano: { body: '#3B82F6', head: '#FDBA74', accent: '#93C5FD' },
  elfo: { body: '#10B981', head: '#FDE68A', accent: '#A7F3D0' },
  enano: { body: '#D97706', head: '#FDBA74', accent: '#FEF08A' },
  orco: { body: '#B91C1C', head: '#65A30D', accent: '#FCA5A5' },
  lobo: { body: '#64748B', head: '#94A3B8', accent: '#E2E8F0' },
  oveja: { body: '#F8FAFC', head: '#334155', accent: '#FFFFFF' },
  dragon: { body: '#DC2626', head: '#F97316', accent: '#FDE047' },
};

export interface CameraState {
  x: number; // world pixel X (0..1024)
  y: number; // world pixel Y (0..1024)
  zoom: number; // 0.6 to 4.5
}

export class WorldRenderer {
  private terrainCanvas: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;
  private fullBuilt: boolean = false;

  constructor() {
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = MAP_SIZE * TILE_PIXEL_SIZE;
    this.terrainCanvas.height = MAP_SIZE * TILE_PIXEL_SIZE;
    const ctx = this.terrainCanvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.terrainCtx = ctx;
  }

  public forceFullTerrainRebuild() {
    this.fullBuilt = false;
  }

  private drawSingleTile(world: WorldState, idx: number) {
    const x = idx % world.width;
    const y = Math.floor(idx / world.width);
    const px = x * TILE_PIXEL_SIZE;
    const py = y * TILE_PIXEL_SIZE;
    const biome = world.biomes[idx];
    const [c1, c2] = BIOME_BASE_COLORS[biome] || BIOME_BASE_COLORS[Biome.GRASS];

    // Checkerboard dither pattern for crisp pixel-art texture
    const isAlt = (x + y) % 2 === 0;
    this.terrainCtx.fillStyle = isAlt ? c1 : c2;
    this.terrainCtx.fillRect(px, py, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE);

    // Sub-tile pixel details
    if (biome === Biome.SAND && (x * 7 + y * 13) % 5 === 0) {
      this.terrainCtx.fillStyle = '#C5A659';
      this.terrainCtx.fillRect(px + 2, py + 4, 2, 2);
    } else if (biome === Biome.GRASS && (x * 11 + y * 3) % 4 === 0) {
      this.terrainCtx.fillStyle = '#56A050';
      this.terrainCtx.fillRect(px + 3, py + 2, 2, 3);
    } else if (biome === Biome.MOUNTAIN) {
      this.terrainCtx.fillStyle = '#7D8490';
      this.terrainCtx.fillRect(px + 1, py + 1, 5, 3);
      this.terrainCtx.fillStyle = '#434750';
      this.terrainCtx.fillRect(px + 2, py + 5, 4, 2);
    } else if (biome === Biome.SNOW) {
      this.terrainCtx.fillStyle = '#FFFFFF';
      this.terrainCtx.fillRect(px + 1, py + 1, 4, 4);
    } else if (biome === Biome.LAVA) {
      this.terrainCtx.fillStyle = '#FDE047';
      this.terrainCtx.fillRect(px + 2, py + 2, 3, 3);
    }

    // Draw pixel-art trees on forest or wooded grass
    const trees = world.treeDensity[idx];
    if (trees > 0 && (biome === Biome.FOREST || biome === Biome.GRASS)) {
      // Trunk
      this.terrainCtx.fillStyle = '#4A2E1B';
      this.terrainCtx.fillRect(px + 3, py + 5, 2, 3);
      // Canopy
      this.terrainCtx.fillStyle = biome === Biome.FOREST ? '#163D1C' : '#2E6F34';
      this.terrainCtx.fillRect(px + 1, py + 1, 6, 5);
      this.terrainCtx.fillStyle = '#3B8A42';
      this.terrainCtx.fillRect(px + 2, py + 1, 3, 3);
    }
  }

  private syncTerrainBuffer(world: WorldState) {
    if (!this.fullBuilt) {
      const total = world.width * world.height;
      for (let i = 0; i < total; i++) {
        this.drawSingleTile(world, i);
      }
      this.fullBuilt = true;
      world.dirtyTerrain = false;
      world.dirtyTiles.length = 0;
      return;
    }

    if (world.dirtyTerrain) {
      if (world.dirtyTiles.length > 0 && world.dirtyTiles.length < 2500) {
        for (let i = 0; i < world.dirtyTiles.length; i++) {
          this.drawSingleTile(world, world.dirtyTiles[i]);
        }
      } else {
        const total = world.width * world.height;
        for (let i = 0; i < total; i++) {
          this.drawSingleTile(world, i);
        }
      }
      world.dirtyTerrain = false;
      world.dirtyTiles.length = 0;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
    world: WorldState,
    camera: CameraState,
    selectedCreatureId: string | null,
    hoverTile: { x: number; y: number } | null,
    brushRadius: number,
    timeSec: number
  ) {
    this.syncTerrainBuffer(world);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Deep abyss background
    ctx.fillStyle = '#071422';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    // Apply decaying trauma camera shake
    let shakeX = 0;
    let shakeY = 0;
    if (world.screenShake > 0.01) {
      const mag = world.screenShake * world.screenShake * 14;
      shakeX = (Math.random() - 0.5) * mag;
      shakeY = (Math.random() - 0.5) * mag;
    }

    ctx.translate(viewportWidth / 2 + shakeX, viewportHeight / 2 + shakeY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Draw cached terrain map
    ctx.drawImage(this.terrainCanvas, 0, 0);

    // 2. Animated water shimmer & active tile fires
    const shimmerPhase = Math.floor(timeSec * 3);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.18)';
    for (let y = 0; y < world.height; y += 3) {
      for (let x = 0; x < world.width; x += 3) {
        const idx = y * world.width + x;
        const b = world.biomes[idx];
        if ((b === Biome.SHALLOW_WATER || b === Biome.DEEP_WATER) && (x + y + shimmerPhase) % 7 === 0) {
          ctx.fillRect(x * TILE_PIXEL_SIZE + 1, y * TILE_PIXEL_SIZE + 3, 4, 1);
        }
        if (world.fireTimers[idx] > 0) {
          ctx.fillStyle = (x + y + shimmerPhase) % 2 === 0 ? '#F97316' : '#FDE047';
          ctx.fillRect(x * TILE_PIXEL_SIZE + 2, y * TILE_PIXEL_SIZE + 1, 4, 5);
          ctx.fillStyle = 'rgba(186, 230, 253, 0.18)';
        }
      }
    }

    // 3. Draw Kingdom Village Territory Borders
    const kingdomMap = new Map(world.kingdoms.map((k) => [k.id, k]));
    for (const v of world.villages) {
      const k = kingdomMap.get(v.kingdomId);
      if (!k) continue;
      const cx = v.centerX * TILE_PIXEL_SIZE + 4;
      const cy = v.centerY * TILE_PIXEL_SIZE + 4;
      const rPx = v.radius * TILE_PIXEL_SIZE;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      ctx.fillStyle = `${k.color}18`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `${k.color}AA`;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Buildings
    for (const b of world.buildings) {
      const k = kingdomMap.get(b.kingdomId);
      this.drawBuilding(ctx, b, k?.color || '#3B82F6');
    }

    // 5. Draw Creatures
    for (const c of world.creatures) {
      const k = c.kingdomId ? kingdomMap.get(c.kingdomId) : undefined;
      this.drawCreature(ctx, c, k?.color, c.id === selectedCreatureId, timeSec, camera.zoom);
    }

    // 6. Draw Pooled Particles
    for (let i = 0; i < particlePool.particles.length; i++) {
      const p = particlePool.particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(
        p.x * TILE_PIXEL_SIZE - p.size / 2,
        p.y * TILE_PIXEL_SIZE - p.size / 2,
        p.size,
        p.size
      );
    }
    ctx.globalAlpha = 1;

    // 7. Draw Village / Kingdom Floating Banners
    for (const v of world.villages) {
      const k = kingdomMap.get(v.kingdomId);
      if (!k) continue;
      const vx = v.centerX * TILE_PIXEL_SIZE + 4;
      const vy = (v.centerY - v.radius * 0.65) * TILE_PIXEL_SIZE;

      ctx.save();
      const fontSize = Math.max(7, Math.min(11, 10 / Math.sqrt(camera.zoom)));
      ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      const label = `${v.name} (${v.population})`;
      const textWidth = ctx.measureText(label).width;
      const padX = 5;
      const boxW = textWidth + padX * 2 + 6;
      const boxH = fontSize + 5;

      ctx.fillStyle = 'rgba(11, 16, 27, 0.85)';
      ctx.strokeStyle = k.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(vx - boxW / 2, vy - boxH / 2, boxW, boxH, 3);
      ctx.fill();
      ctx.stroke();

      // Kingdom color emblem square
      ctx.fillStyle = k.color;
      ctx.fillRect(vx - boxW / 2 + 3, vy - 2.5, 4, 5);

      ctx.fillStyle = '#F4EFE6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, vx + 2, vy + 0.5);
      ctx.restore();
    }

    // 8. Draw Brush Preview Ring
    if (hoverTile && hoverTile.x >= 0 && hoverTile.x < world.width && hoverTile.y >= 0 && hoverTile.y < world.height) {
      const hx = (hoverTile.x + 0.5) * TILE_PIXEL_SIZE;
      const hy = (hoverTile.y + 0.5) * TILE_PIXEL_SIZE;
      const radPx = (brushRadius + 0.5) * TILE_PIXEL_SIZE;

      ctx.save();
      ctx.beginPath();
      ctx.arc(hx, hy, radPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.stroke();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.10)';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, b: Building, kingdomColor: string) {
    const px = Math.round(b.x * TILE_PIXEL_SIZE);
    const py = Math.round(b.y * TILE_PIXEL_SIZE);

    if (b.type === 'castillo') {
      // Stone fortress with kingdom roof & banner
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(px - 5, py - 5, 16, 14);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(px - 4, py - 4, 14, 12);
      // Battlements
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(px - 4, py - 6, 3, 2);
      ctx.fillRect(px + 1, py - 6, 4, 2);
      ctx.fillRect(px + 7, py - 6, 3, 2);
      // Kingdom Roof Banner
      ctx.fillStyle = kingdomColor;
      ctx.fillRect(px - 1, py - 3, 8, 5);
      // Door
      ctx.fillStyle = '#334155';
      ctx.fillRect(px + 1, py + 3, 4, 5);
    } else if (b.type === 'templo') {
      // Sacred Golden Sanctuary
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(px - 3, py - 2, 12, 9);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(px - 4, py - 5, 14, 3);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(px + 1, py - 8, 4, 3);
    } else if (b.type === 'torre') {
      ctx.fillStyle = '#64748B';
      ctx.fillRect(px, py - 4, 7, 11);
      ctx.fillStyle = kingdomColor;
      ctx.fillRect(px - 1, py - 6, 9, 3);
    } else {
      // House / Granary
      ctx.fillStyle = '#78350F';
      ctx.fillRect(px - 1, py + 1, 8, 6);
      ctx.fillStyle = kingdomColor;
      ctx.fillRect(px - 2, py - 2, 10, 4);
    }
  }

  private drawCreature(
    ctx: CanvasRenderingContext2D,
    c: Creature,
    kingdomColor: string | undefined,
    isSelected: boolean,
    timeSec: number,
    zoom: number
  ) {
    const px = c.x * TILE_PIXEL_SIZE;
    const py = c.y * TILE_PIXEL_SIZE;
    const bob = Math.abs(Math.sin(timeSec * 6 + c.x * 2)) * 1.4;
    const palette = RACE_COLORS[c.race] || RACE_COLORS.humano;

    ctx.save();
    ctx.translate(px, py - bob);
    ctx.scale(c.scaleX, c.scaleY);

    // Selection ring or special role aura
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 1, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (c.blessed) {
      ctx.beginPath();
      ctx.arc(0, 1, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
      ctx.fill();
    } else if (c.infected) {
      ctx.beginPath();
      ctx.arc(0, 1, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.28)';
      ctx.fill();
    }

    if (c.race === 'dragon') {
      // Winged Dragon Pixel Sprite
      const wingFlap = Math.sin(timeSec * 10) > 0 ? -3 : 1;
      ctx.fillStyle = c.hitFlash > 0 ? '#FFFFFF' : '#991B1B';
      ctx.fillRect(-9, wingFlap - 4, 18, 5);
      ctx.fillStyle = c.hitFlash > 0 ? '#FFFFFF' : '#DC2626';
      ctx.fillRect(-4, -5, 8, 10);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(-2, -7, 4, 3);
      ctx.restore();
      return;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-2.5, 3, 5, 1.5);

    // Body (colored by kingdom if belongs to one)
    ctx.fillStyle = c.hitFlash > 0 ? '#FFFFFF' : kingdomColor || palette.body;
    ctx.fillRect(-2.5, -1, 5, 4.5);

    // Head
    ctx.fillStyle = c.hitFlash > 0 ? '#FFFFFF' : palette.head;
    ctx.fillRect(-2, -4, 4, 3.2);

    // Crown for Kings, Halo for Prophets, Plume for Heroes
    if (c.role === 'rey') {
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(-2.5, -6.2, 5, 2.2);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-0.8, -5.8, 1.6, 1.4);
    } else if (c.role === 'heroe') {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-1.5, -6, 3, 2);
      // Sword
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(2.5, -3, 1.5, 5);
    } else if (c.role === 'profeta') {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(-2, -6, 4, 1.5);
    }

    // Combat indicator
    if (c.state === 'combatiendo') {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(2.5, -5, 2, 2);
    }

    // Nameplate for Kings, Heroes, Prophets or Selected Creature when zoomed in
    if ((c.role !== 'ciudadano' && zoom >= 1.15) || isSelected) {
      ctx.font = '600 5.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(11, 16, 27, 0.78)';
      const w = ctx.measureText(c.name).width + 4;
      ctx.fillRect(-w / 2, -12, w, 5.5);
      ctx.fillStyle = c.role === 'rey' ? '#FDE047' : c.role === 'profeta' ? '#38BDF8' : '#F8FAFC';
      ctx.fillText(c.name, 0, -7.8);
    }

    ctx.restore();
  }
}
