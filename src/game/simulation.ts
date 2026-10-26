import {
  Biome,
  ChronicleEntry,
  ChronicleEventType,
  Creature,
  DivineChoiceEvent,
  Kingdom,
  MAP_SIZE,
  NarratorTone,
  NPCDecisionAction,
  NPCDecisionPayload,
  NPCRole,
  Race,
  ToolId,
  Village,
  WorldState,
} from '../types/game';
import { particlePool } from './particlePool';
import {
  computeBiomeFromHeightMoisture,
  createCreature,
  getTilesInBrush,
  isCivilizedRace,
  isWalkableBiome,
  KINGDOM_PALETTES,
  nextEntityId,
} from './worldGen';

export function addChronicle(
  world: WorldState,
  title: string,
  text: string,
  type: ChronicleEventType,
  tone: NarratorTone = 'epico',
  isAI: boolean = false,
  importance: 1 | 2 | 3 = 2
): ChronicleEntry {
  const entry: ChronicleEntry = {
    id: nextEntityId('chron'),
    year: world.year,
    title,
    text,
    tone,
    type,
    isAI,
    importance,
  };
  world.chronicles.unshift(entry);
  if (world.chronicles.length > 60) {
    world.chronicles.length = 60;
  }
  if (importance >= 2 && !isAI) {
    world.pendingImportantEvents.push(`Año ${world.year} [${title}]: ${text}`);
    if (world.pendingImportantEvents.length > 20) {
      world.pendingImportantEvents.shift();
    }
  }
  return entry;
}

export function validateNPCDecision(raw: unknown): NPCDecisionPayload {
  const validActions: NPCDecisionAction[] = [
    'declarar_guerra',
    'alianza',
    'migrar',
    'rezar',
    'rebelarse',
    'construir_templo',
    'ninguna',
  ];
  if (!raw || typeof raw !== 'object') {
    return { accion: 'ninguna', motivo: 'Sin acción determinada.' };
  }
  const obj = raw as Record<string, unknown>;
  const accionRaw = typeof obj.accion === 'string' ? (obj.accion.toLowerCase().trim() as NPCDecisionAction) : 'ninguna';
  const accion: NPCDecisionAction = validActions.includes(accionRaw) ? accionRaw : 'ninguna';
  const objetivo = typeof obj.objetivo === 'string' ? obj.objetivo.trim() : undefined;
  const motivo =
    typeof obj.motivo === 'string' && obj.motivo.trim().length > 0
      ? obj.motivo.trim()
      : 'Decisión tomada por voluntad propia.';
  return { accion, objetivo, motivo };
}

export function executeNPCDecision(
  world: WorldState,
  npcId: string,
  rawDecision: unknown,
  tone: NarratorTone = 'epico'
): { executed: boolean; summary: string; decision: NPCDecisionPayload } {
  const decision = validateNPCDecision(rawDecision);
  const npc = world.creatures.find((c) => c.id === npcId);
  if (!npc || decision.accion === 'ninguna') {
    return { executed: false, summary: 'El personaje medita en silencio.', decision };
  }

  const myKingdom = world.kingdoms.find((k) => k.id === npc.kingdomId);

  if (decision.accion === 'declarar_guerra') {
    const targetKingdom =
      world.kingdoms.find(
        (k) =>
          k.id !== npc.kingdomId &&
          (k.id === decision.objetivo ||
            (decision.objetivo && k.name.toLowerCase().includes(decision.objetivo.toLowerCase())))
      ) || world.kingdoms.find((k) => k.id !== npc.kingdomId && myKingdom?.diplomacy[k.id] !== 'guerra');

    if (myKingdom && targetKingdom) {
      myKingdom.diplomacy[targetKingdom.id] = 'guerra';
      targetKingdom.diplomacy[myKingdom.id] = 'guerra';
      world.peaceYears = 0;
      world.stats.warsDeclared += 1;
      const summary = `${npc.name} (${myKingdom.name}) declaró la guerra a ${targetKingdom.name}: "${decision.motivo}"`;
      npc.memory.push(`Año ${world.year}: Declaró la guerra a ${targetKingdom.name}.`);
      addChronicle(world, `¡Guerra Declarada!`, summary, 'guerra', tone, true, 3);
      particlePool.burst(npc.x, npc.y, 20, ['#EF4444', '#F97316', '#FDE047'], 16, 3, 0.8);
      return { executed: true, summary, decision };
    }
  }

  if (decision.accion === 'alianza') {
    const targetKingdom =
      world.kingdoms.find(
        (k) =>
          k.id !== npc.kingdomId &&
          (k.id === decision.objetivo ||
            (decision.objetivo && k.name.toLowerCase().includes(decision.objetivo.toLowerCase())))
      ) || world.kingdoms.find((k) => k.id !== npc.kingdomId && myKingdom?.diplomacy[k.id] !== 'alianza');

    if (myKingdom && targetKingdom) {
      myKingdom.diplomacy[targetKingdom.id] = 'alianza';
      targetKingdom.diplomacy[myKingdom.id] = 'alianza';
      world.stats.alliancesFormed += 1;
      const summary = `${npc.name} selló un pacto de alianza entre ${myKingdom.name} y ${targetKingdom.name}: "${decision.motivo}"`;
      npc.memory.push(`Año ${world.year}: Forjó una alianza con ${targetKingdom.name}.`);
      addChronicle(world, `Pacto de Alianza`, summary, 'paz', tone, true, 2);
      particlePool.burst(npc.x, npc.y, 18, ['#38BDF8', '#FDE047', '#A7F3D0'], 14, 2.5, 0.7);
      return { executed: true, summary, decision };
    }
  }

  if (decision.accion === 'rezar') {
    npc.state = 'rezando';
    npc.blessed = true;
    npc.hp = npc.maxHp;
    if (myKingdom) myKingdom.faith = Math.min(100, myKingdom.faith + 15);
    const summary = `${npc.name} elevó una plegaria ferviente a los cielos: "${decision.motivo}"`;
    npc.memory.push(`Año ${world.year}: Rezó a la divinidad y recibió gracia celestial.`);
    addChronicle(world, `Plegaria de ${npc.name}`, summary, 'milagro', tone, true, 2);
    particlePool.burst(npc.x, npc.y, 22, ['#FDE047', '#FEF08A', '#38BDF8'], 12, 2.5, 0.8);
    return { executed: true, summary, decision };
  }

  if (decision.accion === 'construir_templo') {
    const village = world.villages.find((v) => v.id === npc.villageId) || world.villages[0];
    if (village && myKingdom) {
      const tx = Math.min(world.width - 3, Math.max(2, Math.round(npc.x + (Math.random() - 0.5) * 4)));
      const ty = Math.min(world.height - 3, Math.max(2, Math.round(npc.y + (Math.random() - 0.5) * 4)));
      world.buildings.push({
        id: nextEntityId('bld'),
        type: 'templo',
        x: tx,
        y: ty,
        villageId: village.id,
        kingdomId: myKingdom.id,
        hp: 300,
        maxHp: 300,
        level: 1,
      });
      myKingdom.faith = Math.min(100, myKingdom.faith + 20);
      const summary = `${npc.name} ordenó erigir un Gran Templo en honor a tu divinidad: "${decision.motivo}"`;
      npc.memory.push(`Año ${world.year}: Erigió un Templo Sagrado.`);
      addChronicle(world, `Nuevo Templo Sagrado`, summary, 'milagro', tone, true, 2);
      particlePool.burst(tx, ty, 24, ['#FDE047', '#F59E0B', '#FFFBEB'], 15, 3, 0.85);
      return { executed: true, summary, decision };
    }
  }

  if (decision.accion === 'migrar') {
    npc.state = 'migrando';
    npc.targetX = Math.min(world.width - 10, Math.max(10, npc.x + (Math.random() > 0.5 ? 24 : -24)));
    npc.targetY = Math.min(world.height - 10, Math.max(10, npc.y + (Math.random() > 0.5 ? 24 : -24)));
    const summary = `${npc.name} emprendió una gran expedición hacia tierras lejanas: "${decision.motivo}"`;
    npc.memory.push(`Año ${world.year}: Emigró hacia horizontes desconocidos.`);
    addChronicle(world, `La Marcha de ${npc.name}`, summary, 'fundacion', tone, true, 2);
    return { executed: true, summary, decision };
  }

  if (decision.accion === 'rebelarse') {
    const newKId = nextEntityId('reino');
    const newVId = nextEntityId('aldea');
    const palettes = KINGDOM_PALETTES[npc.race] || KINGDOM_PALETTES.humano;
    const palette = palettes[world.kingdoms.length % palettes.length];
    const newKingdomName = `Orden Libre de ${npc.name}`;

    const newKingdom: Kingdom = {
      id: newKId,
      name: newKingdomName,
      race: npc.race,
      color: palette.color,
      bannerBorder: palette.border,
      motto: 'Libertad o Ceniza',
      kingId: npc.id,
      capitalVillageId: newVId,
      diplomacy: {},
      foundedYear: world.year,
      warsWon: 0,
      totalKills: 0,
      faith: 75,
    };

    for (const k of world.kingdoms) {
      k.diplomacy[newKId] = k.id === myKingdom?.id ? 'guerra' : 'paz';
      newKingdom.diplomacy[k.id] = k.id === myKingdom?.id ? 'guerra' : 'paz';
    }

    world.kingdoms.push(newKingdom);
    world.villages.push({
      id: newVId,
      name: `Bastión de ${npc.name}`,
      kingdomId: newKId,
      race: npc.race,
      centerX: Math.round(npc.x),
      centerY: Math.round(npc.y),
      radius: 10,
      wood: 30,
      stone: 20,
      food: 45,
      gold: 15,
      population: 1,
      foundedYear: world.year,
    });

    npc.role = 'rey';
    npc.title = 'Rey Rebelde';
    npc.kingdomId = newKId;
    npc.villageId = newVId;

    const summary = `${npc.name} se rebeló y fundó ${newKingdomName}: "${decision.motivo}"`;
    npc.memory.push(`Año ${world.year}: Se rebeló y fundó ${newKingdomName}.`);
    addChronicle(world, `¡Rebelión en Aetheria!`, summary, 'guerra', tone, true, 3);
    particlePool.burst(npc.x, npc.y, 26, ['#EF4444', '#F59E0B', '#FDE047'], 18, 3, 0.9);
    return { executed: true, summary, decision };
  }

  return { executed: false, summary: 'Sin cambios diplomáticos.', decision };
}

export function applyGodTool(
  world: WorldState,
  toolId: ToolId,
  tileX: number,
  tileY: number,
  brushRadius: number,
  tone: NarratorTone = 'epico'
): { spawnedCreature?: Creature; inspectedCreature?: Creature } {
  const cx = Math.max(0, Math.min(world.width - 1, Math.floor(tileX)));
  const cy = Math.max(0, Math.min(world.height - 1, Math.floor(tileY)));

  if (toolId === 'inspeccionar') {
    let closest: Creature | undefined;
    let bestDist = 6.5;
    for (const c of world.creatures) {
      const d = Math.hypot(c.x - tileX, c.y - tileY);
      // Prioritize Kings/Heroes/Prophets if close
      const weight = c.role !== 'ciudadano' ? d * 0.7 : d;
      if (weight < bestDist) {
        bestDist = weight;
        closest = c;
      }
    }
    return { inspectedCreature: closest };
  }

  // Creature Spawning Tools
  const creatureRaces: ToolId[] = ['humano', 'elfo', 'enano', 'orco', 'lobo', 'oveja', 'dragon'];
  if (creatureRaces.includes(toolId)) {
    const race = toolId as Race;
    const count = Math.max(1, Math.min(5, Math.floor(brushRadius / 2) + 1));
    let lastSpawned: Creature | undefined;

    for (let i = 0; i < count; i++) {
      const ox = count === 1 ? 0 : (Math.random() - 0.5) * brushRadius * 1.2;
      const oy = count === 1 ? 0 : (Math.random() - 0.5) * brushRadius * 1.2;
      const sx = Math.max(1, Math.min(world.width - 2, cx + ox));
      const sy = Math.max(1, Math.min(world.height - 2, cy + oy));

      // Check if there is a kingdom/village of the same race nearby
      let kId: string | null = null;
      let vId: string | null = null;
      if (isCivilizedRace(race)) {
        const existingVillage = world.villages.find(
          (v) => v.race === race && Math.hypot(v.centerX - sx, v.centerY - sy) < 28
        );
        if (existingVillage) {
          kId = existingVillage.kingdomId;
          vId = existingVillage.id;
          existingVillage.population += 1;
        } else {
          const existingKingdom = world.kingdoms.find((k) => k.race === race);
          if (existingKingdom) {
            kId = existingKingdom.id;
            vId = existingKingdom.capitalVillageId;
          }
        }
      }

      const hasKing = kId ? world.creatures.some((c) => c.kingdomId === kId && c.role === 'rey') : true;
      const role: NPCRole = isCivilizedRace(race) && !hasKing ? 'rey' : Math.random() < 0.12 && isCivilizedRace(race) ? 'heroe' : 'ciudadano';

      const creature = createCreature(race, sx, sy, role, kId, vId);
      world.creatures.push(creature);
      world.stats.totalBirths += 1;
      lastSpawned = creature;

      if (role !== 'ciudadano' || race === 'dragon') {
        const kObj = world.kingdoms.find((k) => k.id === kId);
        world.dynastyRecords[creature.id] = {
          id: creature.id,
          name: creature.name,
          title: creature.title || (race === 'dragon' ? 'Terror Alado' : 'Campeón'),
          race: creature.race,
          role: creature.role,
          dynastyName: creature.dynastyName,
          generation: 1,
          kingdomName: kObj?.name || 'Tierras Salvajes',
          kingdomColor: kObj?.color || '#F97316',
          birthYear: world.year,
          deathYear: null,
          kills: 0,
          parentIds: [],
        };
      }
    }

    particlePool.burst(cx, cy, 14, ['#FDE047', '#38BDF8', '#FFFFFF'], 10, 2.2, 0.55);
    if (race === 'dragon') {
      addChronicle(
        world,
        '¡Un Dragón Desciende!',
        `El dragón ${lastSpawned?.name} ha descendido de los cielos envuelto en llamas sobre (${cx}, ${cy}).`,
        'desastre',
        tone,
        false,
        3
      );
    }
    evaluateAchievementsAndObjectives(world);
    return { spawnedCreature: lastSpawned };
  }

  // Terrain Modification Tools
  const tiles = getTilesInBrush(cx, cy, brushRadius, world.width, world.height);

  if (
    toolId === 'subir_terreno' ||
    toolId === 'bajar_terreno' ||
    toolId === 'agua' ||
    toolId === 'arena' ||
    toolId === 'hierba' ||
    toolId === 'bosque' ||
    toolId === 'montana' ||
    toolId === 'nieve' ||
    toolId === 'lava'
  ) {
    for (const t of tiles) {
      const idx = t.idx;
      if (toolId === 'subir_terreno') {
        world.elevation[idx] = Math.min(1, world.elevation[idx] + 0.14);
        world.biomes[idx] = computeBiomeFromHeightMoisture(world.elevation[idx], world.moisture[idx]);
      } else if (toolId === 'bajar_terreno') {
        world.elevation[idx] = Math.max(0, world.elevation[idx] - 0.14);
        world.biomes[idx] = computeBiomeFromHeightMoisture(world.elevation[idx], world.moisture[idx]);
      } else if (toolId === 'agua') {
        world.elevation[idx] = 0.22;
        world.biomes[idx] = Biome.DEEP_WATER;
        world.treeDensity[idx] = 0;
        world.fireTimers[idx] = 0;
      } else if (toolId === 'arena') {
        world.elevation[idx] = 0.39;
        world.biomes[idx] = Biome.SAND;
        world.treeDensity[idx] = 0;
      } else if (toolId === 'hierba') {
        world.elevation[idx] = 0.52;
        world.moisture[idx] = 0.45;
        world.biomes[idx] = Biome.GRASS;
        world.treeDensity[idx] = Math.random() < 0.15 ? 1 : 0;
      } else if (toolId === 'bosque') {
        world.elevation[idx] = 0.56;
        world.moisture[idx] = 0.78;
        world.biomes[idx] = Biome.FOREST;
        world.treeDensity[idx] = 2 + (t.idx % 2);
      } else if (toolId === 'montana') {
        world.elevation[idx] = 0.78;
        world.biomes[idx] = Biome.MOUNTAIN;
        world.treeDensity[idx] = 0;
      } else if (toolId === 'nieve') {
        world.elevation[idx] = 0.92;
        world.biomes[idx] = Biome.SNOW;
        world.treeDensity[idx] = 0;
      } else if (toolId === 'lava') {
        world.elevation[idx] = 0.65;
        world.biomes[idx] = Biome.LAVA;
        world.treeDensity[idx] = 0;
        world.fireTimers[idx] = 8;
      }
      world.dirtyTiles.push(idx);
    }
    world.dirtyTerrain = true;
    particlePool.burst(cx, cy, 8, ['#A7F3D0', '#FDE68A', '#CBD5E1'], 8, 2, 0.35);
    return {};
  }

  // Divine Powers
  if (toolId === 'rayo') {
    world.stats.lightningsCast += 1;
    world.screenShake = Math.max(world.screenShake, 0.45);
    world.hitstopTimer = 0.04;
    for (const t of tiles) {
      if (world.biomes[t.idx] === Biome.FOREST || world.treeDensity[t.idx] > 0) {
        world.fireTimers[t.idx] = 6;
        world.treeDensity[t.idx] = 0;
        world.biomes[t.idx] = Biome.SCORCHED;
        world.dirtyTiles.push(t.idx);
      }
    }
    world.dirtyTerrain = true;

    let casualties = 0;
    for (const c of world.creatures) {
      const dist = Math.hypot(c.x - cx, c.y - cy);
      if (dist <= brushRadius + 2.5) {
        c.hp -= 65;
        c.hitFlash = 0.25;
        if (c.hp <= 0) casualties += 1;
      }
    }

    particlePool.burst(cx, cy, 28, ['#FEF08A', '#38BDF8', '#FFFFFF', '#F59E0B'], 22, 3, 0.65);
    if (casualties > 0 || world.stats.lightningsCast % 3 === 1) {
      addChronicle(
        world,
        'Ira del Trueno',
        `Un rayo celestial golpeó (${cx}, ${cy}), estremeciendo la tierra${casualties > 0 ? ` y fulminando a ${casualties} mortales` : ''}.`,
        'desastre',
        tone,
        false,
        2
      );
    }
    evaluateAchievementsAndObjectives(world);
    return {};
  }

  if (toolId === 'meteorito') {
    world.stats.meteorsDropped += 1;
    world.screenShake = Math.max(world.screenShake, 0.85);
    world.hitstopTimer = 0.07;

    for (const t of tiles) {
      world.biomes[t.idx] = t.dist <= brushRadius * 0.55 ? Biome.LAVA : Biome.SCORCHED;
      world.treeDensity[t.idx] = 0;
      world.fireTimers[t.idx] = 10;
      world.dirtyTiles.push(t.idx);
    }
    world.dirtyTerrain = true;

    let killed = 0;
    for (const c of world.creatures) {
      const dist = Math.hypot(c.x - cx, c.y - cy);
      if (dist <= brushRadius + 3.5) {
        c.hp -= 140;
        c.hitFlash = 0.3;
        if (c.hp <= 0) killed += 1;
      }
    }

    // Damage buildings in blast radius
    world.buildings = world.buildings.filter((b) => {
      const dist = Math.hypot(b.x - cx, b.y - cy);
      if (dist <= brushRadius + 2.5) {
        b.hp -= 200;
      }
      return b.hp > 0;
    });

    particlePool.burst(cx, cy, 42, ['#EF4444', '#F97316', '#FDE047', '#451A03'], 26, 3.8, 0.95);
    addChronicle(
      world,
      'Cataclismo Estelar',
      `Un meteorito ardiente impactó en (${cx}, ${cy}), abriendo un cráter de magma${killed > 0 ? ` y cobrándose ${killed} vidas` : ''}.`,
      'desastre',
      tone,
      false,
      3
    );
    evaluateAchievementsAndObjectives(world);
    return {};
  }

  if (toolId === 'lluvia') {
    for (const t of tiles) {
      world.fireTimers[t.idx] = 0;
      world.moisture[t.idx] = Math.min(1, world.moisture[t.idx] + 0.35);
      if (world.biomes[t.idx] === Biome.SCORCHED || world.biomes[t.idx] === Biome.LAVA) {
        world.biomes[t.idx] = Biome.GRASS;
      } else if (world.biomes[t.idx] === Biome.GRASS && Math.random() < 0.4) {
        world.biomes[t.idx] = Biome.FOREST;
        world.treeDensity[t.idx] = 2;
      }
      world.dirtyTiles.push(t.idx);
    }
    world.dirtyTerrain = true;
    for (const c of world.creatures) {
      if (Math.hypot(c.x - cx, c.y - cy) <= brushRadius + 2) {
        c.hunger = Math.min(100, c.hunger + 25);
        c.hp = Math.min(c.maxHp, c.hp + 15);
      }
    }
    particlePool.burst(cx, cy, 24, ['#38BDF8', '#60A5FA', '#BAE6FD'], 12, 2.2, 0.6, 8);
    return {};
  }

  if (toolId === 'terremoto') {
    world.screenShake = Math.max(world.screenShake, 0.7);
    for (const t of tiles) {
      const shift = (Math.random() - 0.48) * 0.45;
      world.elevation[t.idx] = Math.max(0.15, Math.min(0.95, world.elevation[t.idx] + shift));
      world.biomes[t.idx] = computeBiomeFromHeightMoisture(world.elevation[t.idx], world.moisture[t.idx]);
      world.dirtyTiles.push(t.idx);
    }
    world.dirtyTerrain = true;
    particlePool.burst(cx, cy, 26, ['#A8A29E', '#78716C', '#D6D3D1'], 18, 3, 0.75);
    addChronicle(
      world,
      'Falla Tectónica',
      `La tierra se quebró en (${cx}, ${cy}) bajo un poderoso terremoto que alzó nuevas cumbres.`,
      'desastre',
      tone,
      false,
      2
    );
    return {};
  }

  if (toolId === 'bendicion') {
    world.stats.blessingsCast += 1;
    let blessedCount = 0;
    for (const c of world.creatures) {
      if (Math.hypot(c.x - cx, c.y - cy) <= brushRadius + 3.5) {
        c.blessed = true;
        c.infected = false;
        c.maxHp = Math.round(c.maxHp * 1.25);
        c.hp = c.maxHp;
        c.attack = Math.round(c.attack * 1.25);
        c.hunger = 100;
        c.memory.push(`Año ${world.year}: Fue bendecido por la luz divina.`);
        blessedCount += 1;
      }
    }
    particlePool.burst(cx, cy, 28, ['#FDE047', '#FEF08A', '#34D399', '#FFFFFF'], 15, 2.8, 0.8);
    if (blessedCount > 0) {
      addChronicle(
        world,
        'Gracia Celestial',
        `Una lluvia de luz dorada bendijo a ${blessedCount} seres en (${cx}, ${cy}), curando sus males y fortaleciendo su espíritu.`,
        'milagro',
        tone,
        false,
        2
      );
    }
    evaluateAchievementsAndObjectives(world);
    return {};
  }

  if (toolId === 'plaga') {
    world.stats.plaguesCast += 1;
    let infectedCount = 0;
    for (const c of world.creatures) {
      if (Math.hypot(c.x - cx, c.y - cy) <= brushRadius + 3) {
        c.infected = true;
        c.blessed = false;
        c.memory.push(`Año ${world.year}: Contrajo la Plaga Sombria.`);
        infectedCount += 1;
      }
    }
    particlePool.burst(cx, cy, 26, ['#A855F7', '#84CC16', '#4C1D95'], 12, 2.8, 0.85);
    if (infectedCount > 0) {
      addChronicle(
        world,
        'Miasma Púrpura',
        `Una plaga misteriosa brotó en (${cx}, ${cy}), infectando a ${infectedCount} criaturas.`,
        'desastre',
        tone,
        false,
        3
      );
    }
    return {};
  }

  if (toolId === 'inspirar_profeta') {
    let target = world.creatures.find(
      (c) => isCivilizedRace(c.race) && Math.hypot(c.x - cx, c.y - cy) <= brushRadius + 5
    );
    if (!target) {
      target = createCreature('humano', cx, cy, 'profeta', world.kingdoms[0]?.id || null, world.villages[0]?.id || null);
      world.creatures.push(target);
    } else {
      target.role = 'profeta';
      target.title = 'Vidente del Cosmos';
      target.blessed = true;
      target.hp = target.maxHp;
    }
    target.memory.push(`Año ${world.year}: Recibió la revelación divina como Profeta.`);
    const kObj = world.kingdoms.find((k) => k.id === target!.kingdomId);
    world.dynastyRecords[target.id] = {
      id: target.id,
      name: target.name,
      title: 'Vidente del Cosmos',
      race: target.race,
      role: 'profeta',
      dynastyName: target.dynastyName,
      generation: target.generation,
      kingdomName: kObj?.name || 'Peregrino Sagrado',
      kingdomColor: kObj?.color || '#38BDF8',
      birthYear: Math.max(1, world.year - Math.floor(target.age)),
      deathYear: null,
      kills: target.kills,
      parentIds: target.parentIds,
    };

    particlePool.burst(target.x, target.y, 26, ['#38BDF8', '#FDE047', '#FFFFFF'], 14, 3, 0.85);
    addChronicle(
      world,
      'Revelación Profética',
      `${target.name} ha sido tocado por tu sabiduría divina y ahora predica tu palabra como Profeta.`,
      'profecia',
      tone,
      false,
      2
    );
    return { inspectedCreature: target };
  }

  return {};
}

export function evaluateAchievementsAndObjectives(world: WorldState) {
  const pop = world.creatures.length;
  const totalBuildings = world.buildings.length;

  // Update Objectives
  for (const obj of world.objectives) {
    if (obj.id === 'obj_poblacion') {
      obj.current = pop;
      if (pop >= obj.target && !obj.completed) {
        obj.completed = true;
        addChronicle(world, `Objetivo Divino Cumplido: ${obj.title}`, obj.rewardText, 'milagro', 'epico', false, 2);
      }
    } else if (obj.id === 'obj_ciudades') {
      obj.current = totalBuildings;
      if (totalBuildings >= obj.target && !obj.completed) {
        obj.completed = true;
        addChronicle(world, `Objetivo Divino Cumplido: ${obj.title}`, obj.rewardText, 'milagro', 'epico', false, 2);
      }
    }
  }

  // Update Achievements
  for (const ach of world.achievements) {
    if (ach.unlocked) continue;
    if (ach.id === 'primer_rey' && world.creatures.some((c) => c.role === 'rey')) {
      ach.unlocked = true;
      ach.unlockedYear = world.year;
    } else if (ach.id === 'apocalipsis' && (world.stats.meteorsDropped >= 3 || world.stats.lightningsCast >= 5)) {
      ach.unlocked = true;
      ach.unlockedYear = world.year;
    } else if (ach.id === 'edad_dorada' && pop >= 65) {
      ach.unlocked = true;
      ach.unlockedYear = world.year;
    } else if (ach.id === 'paz_100' && world.peaceYears >= 25) {
      ach.unlocked = true;
      ach.unlockedYear = world.year;
    } else if (ach.id === 'dinastia_eterna' && world.creatures.some((c) => c.generation >= 3)) {
      ach.unlocked = true;
      ach.unlockedYear = world.year;
    }
  }
}

export function stepSimulation(world: WorldState, simDt: number, tone: NarratorTone = 'epico') {
  if (simDt <= 0) return;

  // Advance year every 8 seconds of simulation time
  world.yearProgress += simDt / 8.0;
  let newYearTick = false;
  if (world.yearProgress >= 1) {
    world.yearProgress -= 1;
    world.year += 1;
    newYearTick = true;

    // Check if any kingdoms are at war
    const anyWar = world.kingdoms.some((k) => Object.values(k.diplomacy).includes('guerra'));
    if (!anyWar) {
      world.peaceYears += 1;
    } else {
      world.peaceYears = 0;
    }
  }

  // Update tile fire timers
  if (newYearTick) {
    for (let i = 0; i < world.fireTimers.length; i++) {
      if (world.fireTimers[i] > 0) {
        world.fireTimers[i] = Math.max(0, world.fireTimers[i] - 1);
      }
    }
  }

  // Pre-index kingdoms for fast lookup
  const kingdomMap = new Map<string, Kingdom>();
  for (const k of world.kingdoms) kingdomMap.set(k.id, k);

  const villageMap = new Map<string, Village>();
  for (const v of world.villages) {
    v.population = 0;
    villageMap.set(v.id, v);
  }

  const newlyBorn: Creature[] = [];
  const deadIds = new Set<string>();

  for (let i = 0; i < world.creatures.length; i++) {
    const c = world.creatures[i];
    if (c.hp <= 0) {
      deadIds.add(c.id);
      continue;
    }

    if (c.villageId && villageMap.has(c.villageId)) {
      villageMap.get(c.villageId)!.population += 1;
    }

    // Decay hitFlash & squash/stretch
    if (c.hitFlash > 0) c.hitFlash = Math.max(0, c.hitFlash - simDt);
    c.scaleX += (1 - c.scaleX) * Math.min(1, simDt * 8);
    c.scaleY += (1 - c.scaleY) * Math.min(1, simDt * 8);

    // Yearly aging, hunger, plague, romance, and building
    if (newYearTick) {
      c.age += 1;
      c.hunger = Math.max(0, c.hunger - (c.blessed ? 2.5 : 5));
      if (c.reproductionCooldown > 0) c.reproductionCooldown = Math.max(0, c.reproductionCooldown - 1);

      if (c.infected) {
        c.hp -= 12;
        c.hitFlash = 0.15;
        // Spread plague to nearby units
        for (const other of world.creatures) {
          if (other.id !== c.id && !other.infected && !other.blessed && Math.hypot(other.x - c.x, other.y - c.y) < 3.2) {
            if (Math.random() < 0.25) other.infected = true;
          }
        }
      }

      if (c.hunger <= 0) {
        c.hp -= 10;
      } else if (c.hunger > 55 && c.hp < c.maxHp) {
        c.hp = Math.min(c.maxHp, c.hp + (c.blessed ? 12 : 6));
      }

      // Old age death check
      if (c.age >= c.maxAge) {
        c.hp = 0;
        deadIds.add(c.id);
        continue;
      }

      // Reproduction & Romance
      if (
        c.age >= 18 &&
        c.hunger >= 55 &&
        c.reproductionCooldown <= 0 &&
        world.creatures.length + newlyBorn.length < 180
      ) {
        // Find partner or reproduce
        const partner = world.creatures.find(
          (other) =>
            other.id !== c.id &&
            other.race === c.race &&
            other.age >= 18 &&
            Math.hypot(other.x - c.x, other.y - c.y) < 8
        );

        if (partner && Math.random() < 0.28) {
          c.reproductionCooldown = 14;
          if (!c.spouseId && !partner.spouseId && isCivilizedRace(c.race)) {
            c.spouseId = partner.id;
            partner.spouseId = c.id;
            if (c.role !== 'ciudadano' || partner.role !== 'ciudadano') {
              c.memory.push(`Año ${world.year}: Se unió en matrimonio con ${partner.name}.`);
              partner.memory.push(`Año ${world.year}: Se unió en matrimonio con ${c.name}.`);
              if (world.dynastyRecords[c.id]) world.dynastyRecords[c.id].spouseName = partner.name;
              if (world.dynastyRecords[partner.id]) world.dynastyRecords[partner.id].spouseName = c.name;
              addChronicle(
                world,
                'Romance Real',
                `${c.name} y ${partner.name} (${c.dynastyName}) unieron sus destinos en matrimonio.`,
                'romance',
                tone,
                false,
                1
              );
            }
          }

          const childGen = Math.max(c.generation, partner.generation) + 1;
          const childRole: NPCRole =
            (c.role === 'rey' || partner.role === 'rey') && Math.random() < 0.35 ? 'heroe' : 'ciudadano';
          const child = createCreature(
            c.race,
            c.x + (Math.random() - 0.5) * 1.5,
            c.y + (Math.random() - 0.5) * 1.5,
            childRole,
            c.kingdomId,
            c.villageId,
            undefined,
            c.dynastyName,
            childGen
          );
          child.age = 1;
          child.parentIds = [c.id, partner.id];
          child.memory = [`Nació en el Año ${world.year}, descendiente de ${c.name} y ${partner.name}.`];
          c.childrenIds.push(child.id);
          partner.childrenIds.push(child.id);
          newlyBorn.push(child);
          world.stats.totalBirths += 1;

          if (childRole !== 'ciudadano' || c.role === 'rey' || partner.role === 'rey') {
            const kObj = c.kingdomId ? kingdomMap.get(c.kingdomId) : undefined;
            world.dynastyRecords[child.id] = {
              id: child.id,
              name: child.name,
              title: child.title || 'Príncipe Heredero',
              race: child.race,
              role: child.role,
              dynastyName: child.dynastyName,
              generation: childGen,
              kingdomName: kObj?.name || 'Reino Libre',
              kingdomColor: kObj?.color || '#3B82F6',
              birthYear: world.year,
              deathYear: null,
              kills: 0,
              parentIds: [c.id, partner.id],
            };
          }
        }
      }

      // Civilized creatures gather resources & build houses
      if (isCivilizedRace(c.race) && c.villageId && villageMap.has(c.villageId)) {
        const v = villageMap.get(c.villageId)!;
        v.food = Math.min(500, v.food + 4);
        v.wood = Math.min(500, v.wood + 3);
        v.stone = Math.min(500, v.stone + 2);
        if (c.hunger < 70 && v.food >= 5) {
          v.food -= 5;
          c.hunger = Math.min(100, c.hunger + 35);
        }

        // Build new house or watchtower if village has enough wood
        if (v.wood >= 30 && world.buildings.length < 95 && Math.random() < 0.18) {
          v.wood -= 30;
          const angle = Math.random() * Math.PI * 2;
          const dist = 2 + Math.random() * (v.radius - 2);
          const bx = Math.min(world.width - 3, Math.max(2, Math.round(v.centerX + Math.cos(angle) * dist)));
          const by = Math.min(world.height - 3, Math.max(2, Math.round(v.centerY + Math.sin(angle) * dist)));
          const bBiome = world.biomes[by * world.width + bx];
          if (isWalkableBiome(bBiome)) {
            c.state = 'construyendo';
            world.buildings.push({
              id: nextEntityId('bld'),
              type: Math.random() < 0.2 ? 'torre' : Math.random() < 0.15 ? 'granero' : 'casa',
              x: bx,
              y: by,
              villageId: v.id,
              kingdomId: v.kingdomId,
              hp: 180,
              maxHp: 180,
              level: 1,
            });
            particlePool.burst(bx, by, 8, ['#FDE68A', '#D97706'], 7, 2, 0.4);
          }
        }
      }
    }

    // AI Decision & Movement tick
    c.actionTimer -= simDt;
    if (c.actionTimer <= 0) {
      c.actionTimer = 1.2 + Math.random() * 1.8;

      // Look for nearby enemies (if at war, or if wolf/dragon/orc)
      let enemyTarget: Creature | null = null;
      let bestEnemyDist = c.race === 'dragon' ? 18 : 11;

      for (const other of world.creatures) {
        if (other.id === c.id || other.hp <= 0) continue;
        const d = Math.hypot(other.x - c.x, other.y - c.y);
        if (d > bestEnemyDist) continue;

        let isHostile = false;
        if (c.race === 'dragon' && other.race !== 'dragon') {
          isHostile = true;
        } else if (c.race === 'lobo' && other.race !== 'lobo') {
          isHostile = true;
        } else if (c.rivalId === other.id) {
          isHostile = true;
        } else if (c.kingdomId && other.kingdomId && c.kingdomId !== other.kingdomId) {
          const myK = kingdomMap.get(c.kingdomId);
          if (myK && myK.diplomacy[other.kingdomId] === 'guerra') {
            isHostile = true;
          }
        }

        if (isHostile) {
          bestEnemyDist = d;
          enemyTarget = other;
        }
      }

      if (enemyTarget) {
        c.state = 'combatiendo';
        c.targetX = enemyTarget.x;
        c.targetY = enemyTarget.y;

        if (bestEnemyDist <= 2.2) {
          // Attack hit!
          enemyTarget.hp -= c.attack;
          enemyTarget.hitFlash = 0.2;
          c.scaleX = 1.22;
          c.scaleY = 0.82;
          particlePool.burst(enemyTarget.x, enemyTarget.y, 6, ['#EF4444', '#FCA5A5', '#FDE047'], 10, 2, 0.35);

          // Establish rivalry if both survive and are important NPCs
          if (
            enemyTarget.hp > 0 &&
            !c.rivalId &&
            isCivilizedRace(c.race) &&
            isCivilizedRace(enemyTarget.race) &&
            (c.role !== 'ciudadano' || enemyTarget.role !== 'ciudadano')
          ) {
            c.rivalId = enemyTarget.id;
            enemyTarget.rivalId = c.id;
            c.memory.push(`Año ${world.year}: Juró rivalidad eterna contra ${enemyTarget.name}.`);
            if (world.dynastyRecords[c.id]) world.dynastyRecords[c.id].rivalName = enemyTarget.name;
            if (world.dynastyRecords[enemyTarget.id]) world.dynastyRecords[enemyTarget.id].rivalName = c.name;
          }

          if (enemyTarget.hp <= 0) {
            c.kills += 1;
            c.level = Math.min(10, c.level + 1);
            c.maxHp += 10;
            c.hp = Math.min(c.maxHp, c.hp + 20);
            if (world.dynastyRecords[c.id]) {
              world.dynastyRecords[c.id].kills = c.kills;
            }
            if (c.kingdomId && kingdomMap.has(c.kingdomId)) {
              kingdomMap.get(c.kingdomId)!.totalKills += 1;
            }
            // Promote warrior/citizen who slays 3 enemies into Hero
            if (c.kills >= 3 && c.role === 'ciudadano' && isCivilizedRace(c.race)) {
              c.role = 'heroe';
              c.title = 'Campeón Forjado en Batalla';
              c.memory.push(`Año ${world.year}: Ascendió a Héroe tras vencer en combate.`);
            }
          }
        }
      } else {
        // Wander around village or explore
        c.state = c.hunger < 40 ? 'buscando_comida' : 'explorando';
        const homeV = c.villageId ? villageMap.get(c.villageId) : undefined;
        if (homeV && Math.random() < 0.7) {
          c.targetX = homeV.centerX + (Math.random() - 0.5) * homeV.radius * 1.8;
          c.targetY = homeV.centerY + (Math.random() - 0.5) * homeV.radius * 1.8;
        } else {
          c.targetX = c.x + (Math.random() - 0.5) * 14;
          c.targetY = c.y + (Math.random() - 0.5) * 14;
        }
        c.targetX = Math.max(2, Math.min(world.width - 3, c.targetX));
        c.targetY = Math.max(2, Math.min(world.height - 3, c.targetY));
      }
    }

    // Move smoothly toward targetX, targetY
    const dx = c.targetX - c.x;
    const dy = c.targetY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.25) {
      const speed = c.race === 'dragon' ? 6.5 : c.race === 'elfo' || c.race === 'lobo' ? 4.2 : 3.4;
      const step = Math.min(dist, speed * simDt);
      const nx = c.x + (dx / dist) * step;
      const ny = c.y + (dy / dist) * step;
      const tileIdx = Math.floor(ny) * world.width + Math.floor(nx);
      const targetBiome = world.biomes[tileIdx];

      if (isWalkableBiome(targetBiome, c.race)) {
        c.x = nx;
        c.y = ny;
      } else {
        // Pick a new direction away from water/lava
        c.targetX = world.width / 2 + (Math.random() - 0.5) * 30;
        c.targetY = world.height / 2 + (Math.random() - 0.5) * 30;
      }
    }
  }

  // Process Deaths & Royal Succession
  if (deadIds.size > 0) {
    for (const deadId of deadIds) {
      const deadCreature = world.creatures.find((c) => c.id === deadId);
      if (!deadCreature) continue;
      world.stats.totalDeaths += 1;

      if (world.dynastyRecords[deadId]) {
        world.dynastyRecords[deadId].deathYear = world.year;
        world.dynastyRecords[deadId].epitaph = `Cayó en el Año ${world.year} a los ${deadCreature.age} años.`;
      }

      if (deadCreature.role === 'rey' && deadCreature.kingdomId) {
        const k = kingdomMap.get(deadCreature.kingdomId);
        if (k) {
          // Find heir (child or citizen of same kingdom)
          const heir =
            world.creatures.find(
              (c) => !deadIds.has(c.id) && c.hp > 0 && deadCreature.childrenIds.includes(c.id)
            ) ||
            world.creatures.find(
              (c) => !deadIds.has(c.id) && c.hp > 0 && c.kingdomId === k.id && c.id !== deadId
            );

          if (heir) {
            heir.role = 'rey';
            heir.title = 'Monarca Heredero';
            k.kingId = heir.id;
            heir.memory.push(`Año ${world.year}: Heredó la corona de ${k.name} tras la muerte de ${deadCreature.name}.`);
            world.dynastyRecords[heir.id] = {
              id: heir.id,
              name: heir.name,
              title: 'Monarca Heredero',
              race: heir.race,
              role: 'rey',
              dynastyName: heir.dynastyName,
              generation: heir.generation,
              kingdomName: k.name,
              kingdomColor: k.color,
              birthYear: Math.max(1, world.year - heir.age),
              deathYear: null,
              kills: heir.kills,
              parentIds: heir.parentIds,
            };
            addChronicle(
              world,
              `Sucesión en ${k.name}`,
              `El Rey ${deadCreature.name} ha muerto. ¡Larga vida a ${heir.name} de la ${heir.dynastyName}!`,
              'muerte_rey',
              tone,
              false,
              3
            );
          } else {
            k.kingId = null;
            addChronicle(
              world,
              `Trono Vacío en ${k.name}`,
              `El monarca ${deadCreature.name} ha caído sin dejar herederos directos.`,
              'muerte_rey',
              tone,
              false,
              3
            );
          }
        }
      }
    }

    world.creatures = world.creatures.filter((c) => !deadIds.has(c.id) && c.hp > 0);
  }

  if (newlyBorn.length > 0) {
    world.creatures.push(...newlyBorn);
  }

  // Spontaneous diplomacy shift occasionally on new year
  if (newYearTick && world.year % 9 === 0 && world.kingdoms.length >= 2) {
    const k1 = world.kingdoms[Math.floor(Math.random() * world.kingdoms.length)];
    const k2 = world.kingdoms.find((k) => k.id !== k1.id);
    if (k1 && k2) {
      const current = k1.diplomacy[k2.id] || 'paz';
      if (current === 'paz' && Math.random() < 0.45) {
        k1.diplomacy[k2.id] = 'guerra';
        k2.diplomacy[k1.id] = 'guerra';
        world.peaceYears = 0;
        world.stats.warsDeclared += 1;
        addChronicle(
          world,
          `Tambores de Guerra`,
          `Las tensiones fronterizas estallan: ${k1.name} y ${k2.name} entran en guerra abierta.`,
          'guerra',
          tone,
          false,
          3
        );
      } else if (current === 'guerra' && Math.random() < 0.5) {
        k1.diplomacy[k2.id] = 'paz';
        k2.diplomacy[k1.id] = 'paz';
        addChronicle(
          world,
          `Tratado de Paz`,
          `Exhaustos por la contienda, ${k1.name} y ${k2.name} firman un armisticio.`,
          'paz',
          tone,
          false,
          2
        );
      }
    }
  }

  if (newYearTick) {
    evaluateAchievementsAndObjectives(world);
  }
}

export function applyDivineEventOption(
  world: WorldState,
  event: DivineChoiceEvent,
  optionIndex: number,
  tone: NarratorTone = 'epico'
): string {
  const opt = event.options[optionIndex];
  if (!opt) return 'El destino sigue su curso.';

  const targetK =
    world.kingdoms.find((k) => k.id === opt.targetKingdomId || k.name === event.kingdomName) || world.kingdoms[0];

  let outcomeText = '';

  if (opt.effectType === 'bendecir_reino') {
    for (const c of world.creatures) {
      if (!targetK || c.kingdomId === targetK.id) {
        c.blessed = true;
        c.hp = c.maxHp;
        c.hunger = 100;
      }
    }
    if (targetK) targetK.faith = Math.min(100, targetK.faith + 25);
    outcomeText = `Bendijiste a ${targetK?.name || 'los mortales'}: sus guerreros brillan con vigor celestial.`;
  } else if (opt.effectType === 'castigar_reino') {
    const center = world.villages.find((v) => v.kingdomId === targetK?.id) || world.villages[0];
    if (center) {
      applyGodTool(world, 'rayo', center.centerX, center.centerY, 4, tone);
    }
    outcomeText = `Desataste tu juicio sobre ${targetK?.name || 'la tierra'}, recordándoles quién gobierna el cosmos.`;
  } else if (opt.effectType === 'forzar_paz') {
    for (const k1 of world.kingdoms) {
      for (const k2 of world.kingdoms) {
        if (k1.id !== k2.id) k1.diplomacy[k2.id] = 'alianza';
      }
    }
    world.stats.alliancesFormed += 1;
    outcomeText = `Por decreto divino, todos los reinos depusieron las armas y sellaron una Paz Sagrada.`;
  } else if (opt.effectType === 'desatar_guerra') {
    for (const k1 of world.kingdoms) {
      for (const k2 of world.kingdoms) {
        if (k1.id !== k2.id) k1.diplomacy[k2.id] = 'guerra';
      }
    }
    world.peaceYears = 0;
    world.stats.warsDeclared += 1;
    outcomeText = `El caos se apoderó de los tronos: todos los reinos marchan ahora hacia la Guerra Total.`;
  } else if (opt.effectType === 'invocar_heroe') {
    const center = world.villages.find((v) => v.kingdomId === targetK?.id) || world.villages[0];
    const hx = center ? center.centerX : 64;
    const hy = center ? center.centerY : 64;
    const hero = createCreature(
      targetK?.race || 'humano',
      hx,
      hy,
      'heroe',
      targetK?.id || null,
      center?.id || null
    );
    hero.blessed = true;
    hero.title = 'Avatar del Cielo';
    world.creatures.push(hero);
    outcomeText = `El campeón ${hero.name} descendió en ${targetK?.name || 'Aetheria'} como Avatar del Cielo.`;
  } else {
    // edad_oro
    for (const v of world.villages) {
      v.food += 100;
      v.wood += 80;
      v.gold += 50;
    }
    outcomeText = `Una Edad de Oro y cosechas abundantes floreció en todas las aldeas del mundo.`;
  }

  // Mark dialogue/event objective complete
  const dialogueObj = world.objectives.find((o) => o.id === 'obj_dialogo');
  if (dialogueObj && !dialogueObj.completed) {
    dialogueObj.current = 1;
    dialogueObj.completed = true;
  }

  addChronicle(world, `Decisión Divina: ${opt.label}`, outcomeText, 'milagro', tone, true, 3);
  world.activeDivineEvent = null;
  return outcomeText;
}

// ============================================================================
// LOCAL FALLBACK NARRATIVE ENGINE (Used when offline or rate-limited)
// ============================================================================

export function generateFallbackChronicle(world: WorldState, tone: NarratorTone): { title: string; text: string } {
  const pop = world.creatures.length;
  const kNames = world.kingdoms.map((k) => k.name).join(', ');
  const recent = world.pendingImportantEvents[world.pendingImportantEvents.length - 1] || `El mundo cuenta con ${pop} almas.`;

  if (tone === 'comico') {
    return {
      title: `Año ${world.year}: Crónicas conAlgo de Humor`,
      text: `En el año ${world.year}, mientras ${pop} mortales corretean tratando de no ser aplastados por un meteorito casual, ${recent} Los bardos locales aseguran que el dios del cielo probablemente estaba tomando café mientras miraba a ${kNames}.`,
    };
  }
  if (tone === 'oscuro') {
    return {
      title: `Año ${world.year}: Presagios de Ceniza`,
      text: `Bajo un cielo impasible en el año ${world.year}, ${pop} almas luchan por sobrevivir un día más. ${recent} En los salones de ${kNames}, los susurros advierten que toda gloria mortal es efímera.`,
    };
  }
  if (tone === 'infantil') {
    return {
      title: `Año ${world.year}: El Cuento de los Pequeños Reinos`,
      text: `¡Había una vez en el año ${world.year} un mundo mágico con ${pop} amiguitos viviendo aventuras! ${recent} Todos en ${kNames} miraron a las nubes esperando una estrellita brillante.`,
    };
  }
  return {
    title: `Anales del Año ${world.year}`,
    text: `Corría el Año ${world.year} de la Creación cuando los vientos del destino soplaron sobre ${kNames}. Con ${pop} habitantes poblando la faz de Aetheria, ${recent} Las eras avanzan bajo tu mirada eterna.`,
  };
}

export function generateFallbackNPCReply(
  npc: Creature,
  playerMessage: string,
  world: WorldState
): { reply: string; decision: NPCDecisionPayload } {
  const myK = world.kingdoms.find((k) => k.id === npc.kingdomId);
  const otherK = world.kingdoms.find((k) => k.id !== npc.kingdomId);
  const msgLower = playerMessage.toLowerCase();

  if (msgLower.includes('guerra') || msgLower.includes('ataca') || msgLower.includes('destruye')) {
    return {
      reply: `¡Escucho tu mandato, oh Todopoderoso! Como ${npc.role} de ${myK?.name || 'mi pueblo'} y guiado por mi espíritu ${npc.traits.join(' y ')}, alzaré los estandartes de batalla contra ${otherK?.name || 'nuestros rivales'}.`,
      decision: {
        accion: 'declarar_guerra',
        objetivo: otherK?.id,
        motivo: `Mandato divino recibido en diálogo directo.`,
      },
    };
  }

  if (msgLower.includes('paz') || msgLower.includes('alianza') || msgLower.includes('amigo')) {
    return {
      reply: `Tu sabiduría ilumina mi corazón, Creador. Enviaré emisarios a ${otherK?.name || 'las tierras vecinas'} para sellar una alianza duradera.`,
      decision: {
        accion: 'alianza',
        objetivo: otherK?.id,
        motivo: `Inspirado por la palabra de paz del Creador.`,
      },
    };
  }

  if (msgLower.includes('templo') || msgLower.includes('altar') || msgLower.includes('construye')) {
    return {
      reply: `¡Así se hará! Nuestros artesanos levantarán un Templo Sagrado en tu nombre para que todas las generaciones de la ${npc.dynastyName} te veneren.`,
      decision: {
        accion: 'construir_templo',
        motivo: `Obra sagrada en honor al Creador.`,
      },
    };
  }

  if (msgLower.includes('rebela') || msgLower.includes('independencia') || msgLower.includes('traiciona')) {
    return {
      reply: `¡Las cadenas se rompen hoy! Con tu bendición fundaré mi propio estandarte y reclamaré estas tierras.`,
      decision: {
        accion: 'rebelarse',
        motivo: `Instigado por una voz divina a fundar un nuevo reino.`,
      },
    };
  }

  return {
    reply: `¡Oh gran deidad de Aetheria! Soy ${npc.name} de la ${npc.dynastyName}, ${npc.role} (${npc.traits.join(', ')}). He vivido ${npc.age} años y recuerdo bien mis hazañas. He escuchado tus palabras ("${playerMessage}") y elevaré mis plegarias en tu honor.`,
    decision: {
      accion: 'rezar',
      motivo: `Conmovido por la voz directa de su Dios.`,
    },
  };
}

export function generateFallbackDivineEvent(world: WorldState): DivineChoiceEvent {
  const k1 = world.kingdoms[0];
  const k2 = world.kingdoms[1] || world.kingdoms[0];
  const prophet =
    world.creatures.find((c) => c.role === 'profeta') ||
    world.creatures.find((c) => c.role === 'rey') ||
    world.creatures[0];

  return {
    id: nextEntityId('evt'),
    year: world.year,
    title: 'El Presagio del Cometa Áureo',
    description: `Un cometa de dos colas cruza el firmamento sobre ${k1?.name || 'Aetheria'}. El vidente ${
      prophet?.name || 'Aldric'
    } clama que es una señal tuya: los sacerdotes piden una Edad de Oro, mientras los generales exigen marchar contra ${
      k2?.name || 'sus rivales'
    }. ¿Cuál es tu voluntad divina?`,
    prophetName: prophet?.name || 'Aldric el Vidente',
    kingdomName: k1?.name || 'Reino de Valoria',
    options: [
      {
        label: 'Bendecir a los Fieles',
        description: `Otorga salud máxima, fe y bendición divina a los habitantes de ${k1?.name || 'la región'}.`,
        effectType: 'bendecir_reino',
        targetKingdomId: k1?.id,
      },
      {
        label: 'Decretar Paz Universal',
        description: 'Obliga a todos los reinos a firmar una Alianza Sagrada inmediata.',
        effectType: 'forzar_paz',
      },
      {
        label: 'Invocar un Avatar Heroico',
        description: `Envía un Héroe bendecido para liderar las fuerzas de ${k1?.name || 'Aetheria'}.`,
        effectType: 'invocar_heroe',
        targetKingdomId: k1?.id,
      },
    ],
  };
}

export function generateFallbackWorldSummary(world: WorldState, tone: NarratorTone): string {
  const kSummaries = world.kingdoms
    .map((k) => {
      const pop = world.creatures.filter((c) => c.kingdomId === k.id).length;
      const king = world.creatures.find((c) => c.id === k.kingId);
      return `• **${k.name}** (${k.race.toUpperCase()}): ${pop} habitantes, liderados por ${
        king ? `${king.name} (${king.dynastyName})` : 'un consejo de regencia'
      }. Lema: "${k.motto}".`;
    })
    .join('\n');

  const intro =
    tone === 'comico'
      ? `¡Bienvenidos al gran resumen cósmico del Año ${world.year}! Hasta ahora han nacido ${world.stats.totalBirths} criaturas y has lanzado ${world.stats.meteorsDropped} meteoritos porque aparentemente el mapa necesitaba redecoración.`
      : tone === 'oscuro'
        ? `En los ${world.year} años transcurridos desde el Génesis, ${world.stats.totalDeaths} almas han retornado al polvo y ${world.stats.warsDeclared} guerras han teñido los campos de carmesí.`
        : `Desde el Amanecer en el Año 1 hasta el presente Año ${world.year}, el mundo de Aetheria ha forjado una leyenda inmortal con ${world.creatures.length} seres vivos y ${world.buildings.length} edificaciones.`;

  return `${intro}\n\nEstado de las Naciones:\n${kSummaries}\n\nHitos Recientes:\n${world.chronicles
    .slice(0, 5)
    .map((c) => `- [Año ${c.year}] ${c.title}: ${c.text}`)
    .join('\n')}`;
}
