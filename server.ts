import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  epico:
    'Tono épico mitológico (estilo Silmarillion o crónicas antiguas), solemne pero con sutiles toques de ironía divina.',
  comico:
    'Tono cómico e irreverente (estilo Terry Pratchett / Mundodisco), burlándose con cariño de las locuras de los mortales y los caprichos del jugador dios.',
  oscuro:
    'Tono grimdark y sombrío, enfatizando el destino trágico, la fragilidad mortal y los presagios de ceniza.',
  infantil:
    'Tono de fábula o cuento clásico encantador, lleno de asombro y calidez narrativa.',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. AI Narrator Chronicle Endpoint
  app.post('/api/ai/chronicle', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(200).json({ fallback: true, reason: 'no_api_key' });
        return;
      }

      const { worldSummary, tone = 'epico', recentEvents = [] } = req.body || {};
      const toneDesc = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.epico;

      const prompt = `Eres el Cronista Inmortal del mundo de fantasía "Aetheria".
Estilo requerido: ${toneDesc}
Idioma: Español.
Escribe una crónica breve (máximo 2-3 frases vibrantes, entre 35 y 65 palabras) que narre lo que está ocurriendo en el mundo manteniendo continuidad con los eventos recientes.

Estado compacto del mundo:
${JSON.stringify(worldSummary)}

Últimos eventos registrados (para mantener continuidad):
${JSON.stringify(recentEvents.slice(-20))}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Título evocador y breve para la entrada de la crónica (3 a 7 palabras).',
              },
              text: {
                type: Type.STRING,
                description: 'Texto de la crónica en español (2-3 oraciones).',
              },
            },
            required: ['title', 'text'],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      res.json({ title: parsed.title, text: parsed.text, isAI: true });
    } catch (err) {
      res.status(200).json({ fallback: true, error: err instanceof Error ? err.message : 'error' });
    }
  });

  // 2. NPC Personality Chat + Autonomous JSON Decision Endpoint
  app.post('/api/ai/npc-chat', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(200).json({ fallback: true, reason: 'no_api_key' });
        return;
      }

      const { npc, playerMessage, worldContext } = req.body || {};

      const prompt = `Eres un personaje mortal dentro de un simulador de dioses llamado Aetheria. Quien te habla es EL DIOS CREADOR DEL MUNDO.
Responde en primera persona en español, manteniendo tu personalidad, raza, rol y memoria histórica.
Además, decide una acción diplomática o personal en formato JSON estricto según la conversación y tus rasgos.

Datos de tu personaje:
${JSON.stringify(npc)}

Contexto de reinos del mundo:
${JSON.stringify(worldContext)}

Mensaje del Dios Jugador:
"${playerMessage}"

Acciones válidas para "accion":
- "declarar_guerra" (si decides atacar a otro reino, pon el id del reino en "objetivo", ej. "reino_2")
- "alianza" (si decides aliarte con otro reino, pon el id del reino en "objetivo")
- "construir_templo" (si decides alzar un templo en honor al dios)
- "rezar" (si decides orar y bendecir al dios)
- "migrar" (si decides marchar a nuevas tierras)
- "rebelarse" (si decides fundar un nuevo reino rebelde)
- "ninguna" (si solo conversas sin tomar acción drástica)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Tu respuesta en carácter al Dios (2-3 frases con personalidad propia).',
              },
              decision: {
                type: Type.OBJECT,
                properties: {
                  accion: {
                    type: Type.STRING,
                    description:
                      'Una de: declarar_guerra, alianza, construir_templo, rezar, migrar, rebelarse, ninguna',
                  },
                  objetivo: {
                    type: Type.STRING,
                    description: 'ID del reino objetivo (ej. reino_1, reino_2) si aplica.',
                  },
                  motivo: {
                    type: Type.STRING,
                    description: 'Motivo breve de tu decisión.',
                  },
                },
                required: ['accion', 'motivo'],
              },
            },
            required: ['reply', 'decision'],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      res.json({ reply: parsed.reply, decision: parsed.decision, isAI: true });
    } catch (err) {
      res.status(200).json({ fallback: true, error: err instanceof Error ? err.message : 'error' });
    }
  });

  // 3. Dynamic AI Event & Quest Generator Endpoint
  app.post('/api/ai/divine-event', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(200).json({ fallback: true, reason: 'no_api_key' });
        return;
      }

      const { worldSummary, tone = 'epico' } = req.body || {};
      const toneDesc = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.epico;

      const prompt = `Genera un dilema o evento dinámico para el jugador (que es el dios de Aetheria) basado en el estado actual del mundo.
Estilo: ${toneDesc}
Idioma: Español.
Estado del mundo: ${JSON.stringify(worldSummary)}

Devuelve un evento con título, descripción dramática, nombre del profeta o rey involucrado, nombre del reino, y exactamente 3 opciones para el jugador.
Cada opción debe usar uno de estos "effectType" exactos:
- "bendecir_reino"
- "castigar_reino"
- "forzar_paz"
- "desatar_guerra"
- "edad_oro"
- "invocar_heroe"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              prophetName: { type: Type.STRING },
              kingdomName: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    effectType: { type: Type.STRING },
                    targetKingdomId: { type: Type.STRING },
                  },
                  required: ['label', 'description', 'effectType'],
                },
              },
            },
            required: ['title', 'description', 'prophetName', 'kingdomName', 'options'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({ event: parsed, isAI: true });
    } catch (err) {
      res.status(200).json({ fallback: true, error: err instanceof Error ? err.message : 'error' });
    }
  });

  // 4. Full World History Summary Endpoint
  app.post('/api/ai/world-summary', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        res.status(200).json({ fallback: true, reason: 'no_api_key' });
        return;
      }

      const { worldSummary, tone = 'epico', recentEvents = [] } = req.body || {};
      const toneDesc = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.epico;

      const prompt = `Escribe un "Gran Resumen de la Historia del Mundo" para el jugador dios de Aetheria en 3 párrafos bien estructurados.
Estilo: ${toneDesc}
Idioma: Español.
Estado actual: ${JSON.stringify(worldSummary)}
Crónicas recientes: ${JSON.stringify(recentEvents.slice(-20))}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Resumen narrativo de 3 párrafos sobre la historia del mundo hasta el momento.',
              },
            },
            required: ['summary'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({ summary: parsed.summary, isAI: true });
    } catch (err) {
      res.status(200).json({ fallback: true, error: err instanceof Error ? err.message : 'error' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Aetheria server running on http://localhost:${port}`);
  });
}

startServer();
