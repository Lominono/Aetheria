import {
  Creature,
  DivineChoiceEvent,
  DivineChoiceOption,
  NarratorTone,
  NPCDecisionPayload,
  WorldState,
} from '../types/game';
import {
  generateFallbackChronicle,
  generateFallbackDivineEvent,
  generateFallbackNPCReply,
  generateFallbackWorldSummary,
  validateNPCDecision,
} from '../game/simulation';
import { nextEntityId } from '../game/worldGen';

const MIN_AUTO_AI_INTERVAL_MS = 16000;
let lastAutoCallTimestamp = 0;
const responseCache = new Map<string, unknown>();

export function buildCompactWorldSummary(world: WorldState) {
  return {
    year: world.year,
    totalPopulation: world.creatures.length,
    totalBuildings: world.buildings.length,
    peaceYears: world.peaceYears,
    stats: world.stats,
    kingdoms: world.kingdoms.map((k) => {
      const pop = world.creatures.filter((c) => c.kingdomId === k.id).length;
      const king = world.creatures.find((c) => c.id === k.kingId);
      return {
        id: k.id,
        name: k.name,
        race: k.race,
        population: pop,
        kingName: king ? `${king.name} (${king.dynastyName})` : 'Sin Rey',
        motto: k.motto,
        faith: k.faith,
        diplomacy: k.diplomacy,
      };
    }),
  };
}

export function canTriggerAutoAICall(): boolean {
  return Date.now() - lastAutoCallTimestamp >= MIN_AUTO_AI_INTERVAL_MS;
}

async function fetchWithTimeout(url: string, body: unknown, timeoutMs = 2800): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function requestAIChronicle(
  world: WorldState,
  tone: NarratorTone,
  forceManual: boolean = false
): Promise<{ title: string; text: string; isAI: boolean }> {
  if (!forceManual && !canTriggerAutoAICall()) {
    const fb = generateFallbackChronicle(world, tone);
    return { ...fb, isAI: false };
  }

  lastAutoCallTimestamp = Date.now();
  const worldSummary = buildCompactWorldSummary(world);
  const recentEvents = world.chronicles.slice(0, 20).map((c) => `[Año ${c.year}] ${c.title}: ${c.text}`);

  try {
    const res = await fetchWithTimeout('/api/ai/chronicle', { worldSummary, tone, recentEvents });
    if (!res.ok) throw new Error('HTTP error');
    const data = await res.json();
    if (data.fallback || !data.title || !data.text) {
      const fb = generateFallbackChronicle(world, tone);
      return { ...fb, isAI: false };
    }
    return { title: data.title, text: data.text, isAI: true };
  } catch {
    const fb = generateFallbackChronicle(world, tone);
    return { ...fb, isAI: false };
  }
}

export async function requestNPCDialogue(
  npc: Creature,
  playerMessage: string,
  world: WorldState
): Promise<{ reply: string; decision: NPCDecisionPayload; isAI: boolean }> {
  const worldContext = buildCompactWorldSummary(world);
  const npcPayload = {
    name: npc.name,
    title: npc.title,
    race: npc.race,
    role: npc.role,
    dynastyName: npc.dynastyName,
    age: npc.age,
    traits: npc.traits,
    kills: npc.kills,
    kingdomId: npc.kingdomId,
    memory: npc.memory.slice(-10),
    chatHistory: npc.chatHistory.slice(-6),
  };

  try {
    const res = await fetchWithTimeout('/api/ai/npc-chat', {
      npc: npcPayload,
      playerMessage,
      worldContext,
    });
    if (!res.ok) throw new Error('HTTP error');
    const data = await res.json();
    if (data.fallback || !data.reply) {
      const fb = generateFallbackNPCReply(npc, playerMessage, world);
      return { ...fb, isAI: false };
    }
    return {
      reply: data.reply,
      decision: validateNPCDecision(data.decision),
      isAI: true,
    };
  } catch {
    const fb = generateFallbackNPCReply(npc, playerMessage, world);
    return { ...fb, isAI: false };
  }
}

export async function requestDivineChoiceEvent(
  world: WorldState,
  tone: NarratorTone
): Promise<DivineChoiceEvent> {
  lastAutoCallTimestamp = Date.now();
  const worldSummary = buildCompactWorldSummary(world);

  try {
    const res = await fetchWithTimeout('/api/ai/divine-event', { worldSummary, tone });
    if (!res.ok) throw new Error('HTTP error');
    const data = await res.json();
    if (data.fallback || !data.event || !Array.isArray(data.event.options) || data.event.options.length === 0) {
      return generateFallbackDivineEvent(world);
    }

    const validEffects: DivineChoiceOption['effectType'][] = [
      'bendecir_reino',
      'castigar_reino',
      'forzar_paz',
      'desatar_guerra',
      'edad_oro',
      'invocar_heroe',
    ];

    const options: DivineChoiceOption[] = data.event.options.slice(0, 3).map((o: Record<string, string>) => ({
      label: o.label || 'Intervenir con Poder Divino',
      description: o.description || 'Cambia el destino del reino.',
      effectType: validEffects.includes(o.effectType as DivineChoiceOption['effectType'])
        ? (o.effectType as DivineChoiceOption['effectType'])
        : 'bendecir_reino',
      targetKingdomId: o.targetKingdomId,
    }));

    return {
      id: nextEntityId('evt'),
      year: world.year,
      title: data.event.title,
      description: data.event.description,
      prophetName: data.event.prophetName || 'Oráculo Real',
      kingdomName: data.event.kingdomName || world.kingdoms[0]?.name || 'Aetheria',
      options,
    };
  } catch {
    return generateFallbackDivineEvent(world);
  }
}

export async function requestWorldSummary(world: WorldState, tone: NarratorTone): Promise<{ summary: string; isAI: boolean }> {
  const cacheKey = `${world.year}_${tone}_${world.chronicles.length}`;
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey) as { summary: string; isAI: boolean };
  }

  const worldSummary = buildCompactWorldSummary(world);
  const recentEvents = world.chronicles.slice(0, 20).map((c) => `[Año ${c.year}] ${c.title}: ${c.text}`);

  try {
    const res = await fetchWithTimeout('/api/ai/world-summary', { worldSummary, tone, recentEvents });
    if (!res.ok) throw new Error('HTTP error');
    const data = await res.json();
    if (data.fallback || !data.summary) {
      return { summary: generateFallbackWorldSummary(world, tone), isAI: false };
    }
    const result = { summary: data.summary, isAI: true };
    responseCache.set(cacheKey, result);
    return result;
  } catch {
    return { summary: generateFallbackWorldSummary(world, tone), isAI: false };
  }
}
