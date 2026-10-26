import test from 'node:test';
import assert from 'node:assert/strict';
import { Biome, MAP_SIZE } from '../types/game';
import { computeBiomeFromHeightMoisture, generateWorld, getTilesInBrush } from './worldGen';
import {
  applyDivineEventOption,
  applyGodTool,
  executeNPCDecision,
  generateFallbackDivineEvent,
  stepSimulation,
  validateNPCDecision,
} from './simulation';

test('generateWorld creates a valid 128x128 map with 4 starter kingdoms and initial creatures', () => {
  const world = generateWorld(12345);
  assert.equal(world.width, MAP_SIZE);
  assert.equal(world.height, MAP_SIZE);
  assert.equal(world.biomes.length, MAP_SIZE * MAP_SIZE);
  assert.equal(world.elevation.length, MAP_SIZE * MAP_SIZE);
  assert.equal(world.kingdoms.length, 4);
  assert.equal(world.villages.length, 4);
  assert.ok(world.creatures.length >= 24, 'Should spawn starter kings, heroes, citizens, and wildlife');

  // Verify every kingdom has a crowned king
  for (const k of world.kingdoms) {
    assert.ok(k.kingId, `Kingdom ${k.name} should have a kingId`);
    const king = world.creatures.find((c) => c.id === k.kingId);
    assert.ok(king, `King entity for ${k.name} must exist`);
    assert.equal(king.role, 'rey');
  }
});

test('computeBiomeFromHeightMoisture assigns correct biomes across elevation thresholds', () => {
  assert.equal(computeBiomeFromHeightMoisture(0.1, 0.5), Biome.DEEP_WATER);
  assert.equal(computeBiomeFromHeightMoisture(0.32, 0.5), Biome.SHALLOW_WATER);
  assert.equal(computeBiomeFromHeightMoisture(0.39, 0.5), Biome.SAND);
  assert.equal(computeBiomeFromHeightMoisture(0.55, 0.3), Biome.GRASS);
  assert.equal(computeBiomeFromHeightMoisture(0.55, 0.8), Biome.FOREST);
  assert.equal(computeBiomeFromHeightMoisture(0.76, 0.5), Biome.MOUNTAIN);
  assert.equal(computeBiomeFromHeightMoisture(0.92, 0.5), Biome.SNOW);
});

test('getTilesInBrush returns circular tile set within map bounds', () => {
  const single = getTilesInBrush(64, 64, 0);
  assert.equal(single.length, 1);
  assert.equal(single[0].x, 64);
  assert.equal(single[0].y, 64);

  const radius2 = getTilesInBrush(64, 64, 2);
  assert.ok(radius2.length > 9 && radius2.length <= 25);
});

test('applyGodTool modifies terrain, spawns creatures, and casts powers accurately', () => {
  const world = generateWorld(42);
  const initialPop = world.creatures.length;

  // Spawn an elf
  const res = applyGodTool(world, 'elfo', 50, 50, 1);
  assert.ok(res.spawnedCreature);
  assert.equal(res.spawnedCreature.race, 'elfo');
  assert.equal(world.creatures.length, initialPop + 1);

  // Paint lava
  applyGodTool(world, 'lava', 60, 60, 1);
  assert.equal(world.biomes[60 * world.width + 60], Biome.LAVA);

  // Drop meteor
  const beforeMeteors = world.stats.meteorsDropped;
  applyGodTool(world, 'meteorito', 60, 60, 2);
  assert.equal(world.stats.meteorsDropped, beforeMeteors + 1);
});

test('validateNPCDecision and executeNPCDecision strictly validate and execute AI JSON actions', () => {
  const world = generateWorld(777);
  const king = world.creatures.find((c) => c.role === 'rey')!;
  assert.ok(king);

  // Invalid payload falls back to ninguna
  const invalid = validateNPCDecision({ accion: 'hackear_mundo', motivo: 123 });
  assert.equal(invalid.accion, 'ninguna');

  // Valid war declaration
  const warRes = executeNPCDecision(world, king.id, {
    accion: 'declarar_guerra',
    objetivo: 'reino_2',
    motivo: 'Disputa ancestral por las tierras altas',
  });
  assert.equal(warRes.executed, true);
  const myK = world.kingdoms.find((k) => k.id === king.kingdomId)!;
  assert.equal(myK.diplomacy['reino_2'], 'guerra');
});

test('stepSimulation advances world years, updates creature states, and resolves divine events', () => {
  const world = generateWorld(999);
  assert.equal(world.year, 1);

  // Advance 8.5 seconds of sim time -> should advance to year 2
  stepSimulation(world, 8.5, 'epico');
  assert.equal(world.year, 2);

  // Generate and apply a Divine Choice Event
  const evt = generateFallbackDivineEvent(world);
  world.activeDivineEvent = evt;
  const outcome = applyDivineEventOption(world, evt, 0, 'epico');
  assert.ok(outcome.length > 10);
  assert.equal(world.activeDivineEvent, null);
});
