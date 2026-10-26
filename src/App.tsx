import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Creature,
  DivineChoiceEvent,
  MAP_SIZE,
  NarratorTone,
  TILE_PIXEL_SIZE,
  ToolCategory,
  ToolId,
  WorldState,
} from './types/game';
import { generateWorld } from './game/worldGen';
import {
  addChronicle,
  applyDivineEventOption,
  applyGodTool,
  evaluateAchievementsAndObjectives,
  executeNPCDecision,
  stepSimulation,
} from './game/simulation';
import { particlePool } from './game/particlePool';
import { CameraState, WorldRenderer } from './game/renderer';
import { soundEngine } from './game/soundEngine';
import {
  canTriggerAutoAICall,
  requestAIChronicle,
  requestDivineChoiceEvent,
  requestNPCDialogue,
  requestWorldSummary,
} from './services/aiService';
import { TitleScreen } from './components/TitleScreen';
import { GOD_TOOLS, GodToolbar } from './components/GodToolbar';
import { ChroniclePanel } from './components/ChroniclePanel';
import { NPCInspectorModal } from './components/NPCInspectorModal';
import { ActiveModalType, Modals } from './components/Modals';

const STORAGE_KEY = 'AETHERIA_SAVED_WORLD_V1';

type GameShellState = 'title' | 'playing' | 'paused';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [shellState, setShellState] = useState<GameShellState>(isAutostart ? 'playing' : 'title');
  const shellStateRef = useRef<GameShellState>(isAutostart ? 'playing' : 'title');

  // Mutable simulation state stored in ref so 60Hz canvas loop never triggers full React re-renders
  const worldRef = useRef<WorldState>(generateWorld(42137));
  const rendererRef = useRef<WorldRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state in ref for smooth 60FPS pan/zoom
  const cameraRef = useRef<CameraState>({
    x: (MAP_SIZE * TILE_PIXEL_SIZE) / 2,
    y: (MAP_SIZE * TILE_PIXEL_SIZE) / 2,
    zoom: 1.45,
  });

  // Simulation speed: 0 (paused), 1, 2, 5
  const [simSpeed, setSimSpeed] = useState<0 | 1 | 2 | 5>(1);
  const simSpeedRef = useRef<0 | 1 | 2 | 5>(1);

  // Tool & Brush state
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('poderes');
  const [activeTool, setActiveTool] = useState<ToolId>('bendicion');
  const activeToolRef = useRef<ToolId>('bendicion');
  const [brushRadius, setBrushRadius] = useState<number>(2);
  const brushRadiusRef = useRef<number>(2);

  // Narrator & AI state
  const [narratorTone, setNarratorTone] = useState<NarratorTone>('epico');
  const narratorToneRef = useRef<NarratorTone>('epico');
  const [isChronicleOpen, setIsChronicleOpen] = useState<boolean>(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  // Selected NPC & Active Modals
  const [selectedNPCId, setSelectedNPCId] = useState<string | null>(null);
  const selectedNPCIdRef = useRef<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [worldSummaryText, setWorldSummaryText] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [hasSavedWorld, setHasSavedWorld] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [muted, setMuted] = useState<boolean>(false);

  // Throttled HUD snapshot counter to re-render React HUD cleanly ~3 times/sec
  const [, setHudTick] = useState<number>(0);

  // Sync refs
  useEffect(() => {
    shellStateRef.current = shellState;
    document.body.dataset.state = shellState;
  }, [shellState]);

  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    brushRadiusRef.current = brushRadius;
  }, [brushRadius]);

  useEffect(() => {
    narratorToneRef.current = narratorTone;
  }, [narratorTone]);

  useEffect(() => {
    selectedNPCIdRef.current = selectedNPCId;
  }, [selectedNPCId]);

  const forceHudSync = useCallback(() => {
    setHudTick((t) => t + 1);
  }, []);

  // Start Game Handler
  const handleStartGame = useCallback(() => {
    soundEngine.playBlessing();
    document.body.dataset.state = 'playing';
    shellStateRef.current = 'playing';
    setShellState('playing');
    setActiveModal(null);
    // Reset camera to center of world
    cameraRef.current = {
      x: (MAP_SIZE * TILE_PIXEL_SIZE) / 2,
      y: (MAP_SIZE * TILE_PIXEL_SIZE) / 2,
      zoom: 1.45,
    };
  }, []);

  // Generate New World Seed
  const handleNewWorld = useCallback(() => {
    soundEngine.playClick();
    const newSeed = Math.floor(10000 + Math.random() * 89999);
    worldRef.current = generateWorld(newSeed);
    rendererRef.current?.forceFullTerrainRebuild();
    particlePool.clear();
    setSelectedNPCId(null);
    setActiveModal(null);
    forceHudSync();
  }, [forceHudSync]);

  // Save World to localStorage
  const handleSaveWorld = useCallback(() => {
    try {
      const serialized = JSON.stringify(worldRef.current);
      localStorage.setItem(STORAGE_KEY, serialized);
      setHasSavedWorld(true);
      setSaveStatusMessage(`¡Mundo guardado con éxito en el Año ${worldRef.current.year}!`);
      soundEngine.playBlessing();
      setTimeout(() => setSaveStatusMessage(null), 3500);
    } catch {
      setSaveStatusMessage('No se pudo guardar en localStorage.');
    }
  }, []);

  // Load World from localStorage
  const handleLoadWorld = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const loaded = JSON.parse(raw) as WorldState;
      if (loaded && Array.isArray(loaded.biomes) && loaded.width === MAP_SIZE) {
        loaded.dirtyTerrain = true;
        loaded.dirtyTiles = [];
        worldRef.current = loaded;
        rendererRef.current?.forceFullTerrainRebuild();
        particlePool.clear();
        setSelectedNPCId(null);
        setSaveStatusMessage(`¡Mundo del Año ${loaded.year} cargado!`);
        soundEngine.playBlessing();
        if (shellStateRef.current === 'title') {
          handleStartGame();
        } else {
          setActiveModal(null);
        }
        forceHudSync();
      }
    } catch {
      setSaveStatusMessage('Error al leer el archivo guardado.');
    }
  }, [forceHudSync, handleStartGame]);

  // Manual or Auto AI Chronicle Trigger
  const handleTriggerAIChronicle = useCallback(
    async (forceManual: boolean = true) => {
      if (isGeneratingAI) return;
      setIsGeneratingAI(true);
      try {
        const res = await requestAIChronicle(worldRef.current, narratorToneRef.current, forceManual);
        addChronicle(
          worldRef.current,
          res.title,
          res.text,
          'cronica_ia',
          narratorToneRef.current,
          res.isAI,
          2
        );
        worldRef.current.pendingImportantEvents = [];
        forceHudSync();
      } finally {
        setIsGeneratingAI(false);
      }
    },
    [forceHudSync, isGeneratingAI]
  );

  // Trigger AI Divine Choice Event
  const handleTriggerDivineEvent = useCallback(async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      const evt: DivineChoiceEvent = await requestDivineChoiceEvent(
        worldRef.current,
        narratorToneRef.current
      );
      worldRef.current.activeDivineEvent = evt;
      setActiveModal('evento_divino');
      forceHudSync();
    } finally {
      setIsGeneratingAI(false);
    }
  }, [forceHudSync, isGeneratingAI]);

  // Open & Generate World Summary
  const handleOpenWorldSummary = useCallback(async () => {
    soundEngine.playClick();
    setActiveModal('resumen');
    setIsLoadingSummary(true);
    try {
      const res = await requestWorldSummary(worldRef.current, narratorToneRef.current);
      setWorldSummaryText(res.summary);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Send Divine Chat Message to Selected NPC
  const handleSendNPCMessage = useCallback(
    async (message: string) => {
      const npcId = selectedNPCIdRef.current;
      if (!npcId) return;
      const npc = worldRef.current.creatures.find((c) => c.id === npcId);
      if (!npc) return;

      setIsSendingChat(true);
      soundEngine.playClick();

      // Append God message immediately
      npc.chatHistory.push({
        sender: 'dios',
        text: message,
        year: worldRef.current.year,
      });

      // Unlock "Voz del Cielo" achievement & "Oráculo Viviente" objective
      const voiceAch = worldRef.current.achievements.find((a) => a.id === 'voz_divina');
      if (voiceAch && !voiceAch.unlocked) {
        voiceAch.unlocked = true;
        voiceAch.unlockedYear = worldRef.current.year;
      }
      const dialogueObj = worldRef.current.objectives.find((o) => o.id === 'obj_dialogo');
      if (dialogueObj && !dialogueObj.completed) {
        dialogueObj.current = 1;
        dialogueObj.completed = true;
      }
      forceHudSync();

      try {
        const res = await requestNPCDialogue(npc, message, worldRef.current);
        const execResult = executeNPCDecision(
          worldRef.current,
          npc.id,
          res.decision,
          narratorToneRef.current
        );

        npc.chatHistory.push({
          sender: 'npc',
          text: res.reply,
          year: worldRef.current.year,
          decision: execResult.decision,
        });
        if (execResult.executed) {
          soundEngine.playWarHorn();
        }
        forceHudSync();
      } finally {
        setIsSendingChat(false);
      }
    },
    [forceHudSync]
  );

  // Main 60 FPS Canvas & Simulation Loop + Input Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new WorldRenderer();
    }

    const keysPressed = new Set<string>();
    let isDraggingMap = false;
    let isPaintingTool = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let hasDraggedDistance = false;
    let hoverTile: { x: number; y: number } | null = null;
    let paintThrottleTimer = 0;

    // ResizeObserver for crisp full-viewport canvas
    const updateCanvasSize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    // Coordinate conversion: Screen CSS pixels -> World Tile (0..127)
    const screenToTile = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const cam = cameraRef.current;
      const worldPxX = (sx - rect.width / 2) / cam.zoom + cam.x;
      const worldPxY = (sy - rect.height / 2) / cam.zoom + cam.y;
      return {
        x: worldPxX / TILE_PIXEL_SIZE,
        y: worldPxY / TILE_PIXEL_SIZE,
      };
    };

    const triggerToolAtClientPos = (clientX: number, clientY: number, isContinuousDrag: boolean) => {
      if (shellStateRef.current !== 'playing') return;
      const t = screenToTile(clientX, clientY);
      if (t.x < 0 || t.x >= MAP_SIZE || t.y < 0 || t.y >= MAP_SIZE) return;

      const tool = activeToolRef.current;
      // One-shot powers/creatures shouldn't machine-gun on every pixel of mousemove
      if (isContinuousDrag && (tool === 'meteorito' || tool === 'rayo' || tool === 'terremoto' || tool === 'dragon' || tool === 'inspeccionar' || tool === 'inspirar_profeta')) {
        return;
      }

      if (tool === 'rayo') soundEngine.playLightning();
      else if (tool === 'meteorito' || tool === 'terremoto') soundEngine.playMeteor();
      else if (tool === 'bendicion' || tool === 'inspirar_profeta') soundEngine.playBlessing();
      else if (tool === 'humano' || tool === 'elfo' || tool === 'enano' || tool === 'orco' || tool === 'lobo' || tool === 'oveja' || tool === 'dragon') {
        soundEngine.playSpawn();
      } else if (!isContinuousDrag) {
        soundEngine.playTerrainBrush();
      }

      const res = applyGodTool(
        worldRef.current,
        tool,
        t.x,
        t.y,
        brushRadiusRef.current,
        narratorToneRef.current
      );

      if (res.inspectedCreature) {
        setSelectedNPCId(res.inspectedCreature.id);
      } else if (tool === 'inspeccionar' && !isContinuousDrag) {
        setSelectedNPCId(null);
      }
      forceHudSync();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (shellStateRef.current !== 'playing') return;
      if (e.button === 1 || e.button === 2 || e.shiftKey) {
        isDraggingMap = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        return;
      }
      // Left click: if tool is 'inspeccionar', allow dragging map if pointer moves > 6px, otherwise inspect/apply tool
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      hasDraggedDistance = false;

      if (activeToolRef.current === 'inspeccionar') {
        isDraggingMap = true;
      } else {
        isPaintingTool = true;
        triggerToolAtClientPos(e.clientX, e.clientY, false);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const tile = screenToTile(e.clientX, e.clientY);
      hoverTile = { x: Math.floor(tile.x), y: Math.floor(tile.y) };

      if (isDraggingMap) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.hypot(dx, dy) > 5) {
          hasDraggedDistance = true;
        }
        cameraRef.current.x -= dx / cameraRef.current.zoom;
        cameraRef.current.y -= dy / cameraRef.current.zoom;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      } else if (isPaintingTool) {
        const now = performance.now();
        if (now - paintThrottleTimer > 65) {
          paintThrottleTimer = now;
          triggerToolAtClientPos(e.clientX, e.clientY, true);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDraggingMap && activeToolRef.current === 'inspeccionar' && !hasDraggedDistance) {
        triggerToolAtClientPos(e.clientX, e.clientY, false);
      }
      isDraggingMap = false;
      isPaintingTool = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (shellStateRef.current !== 'playing') return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      cameraRef.current.zoom = Math.max(0.65, Math.min(4.5, cameraRef.current.zoom * zoomFactor));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (shellStateRef.current === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (shellStateRef.current === 'playing') {
          setShellState('paused');
          setActiveModal('pausa');
        } else if (shellStateRef.current === 'paused') {
          setShellState('playing');
          setActiveModal(null);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setSimSpeed((prev) => (prev === 0 ? 1 : 0));
        return;
      }

      if (e.code === 'KeyM') {
        const m = soundEngine.toggleMute();
        setMuted(m);
        return;
      }

      // Hotkeys for tools
      const matchingTool = GOD_TOOLS.find((gt) => `Key${gt.keyHint}` === e.code || `Digit${gt.keyHint}` === e.code);
      if (matchingTool) {
        setActiveCategory(matchingTool.category);
        setActiveTool(matchingTool.id);
      }

      keysPressed.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const clearInputs = () => {
      keysPressed.clear();
      isDraggingMap = false;
      isPaintingTool = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);

    let lastTime = performance.now();
    let hudSyncAccumulator = 0;
    let autoAIChronicleTimer = 0;
    let rafId = 0;

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      // Clamped dt <= 0.05s as required by ultra-mode gameplay craft
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const timeSec = now / 1000;

      const world = worldRef.current;

      // Decay screenShake & hitstopTimer in real dt
      if (world.screenShake > 0) {
        world.screenShake = Math.max(0, world.screenShake - dt * 1.8);
      }

      if (shellStateRef.current === 'title') {
        // Live World Camera Tour during Title Screen!
        const mapCenter = (MAP_SIZE * TILE_PIXEL_SIZE) / 2;
        cameraRef.current.x = mapCenter + Math.cos(timeSec * 0.22) * 140;
        cameraRef.current.y = mapCenter + Math.sin(timeSec * 0.17) * 110;
        cameraRef.current.zoom = 1.65;
        stepSimulation(world, dt * 0.6, narratorToneRef.current);
      } else if (shellStateRef.current === 'playing') {
        // Keyboard WASD / Arrow camera panning
        const panSpeed = 280 / cameraRef.current.zoom;
        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) cameraRef.current.y -= panSpeed * dt;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) cameraRef.current.y += panSpeed * dt;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) cameraRef.current.x -= panSpeed * dt;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) cameraRef.current.x += panSpeed * dt;

        // Clamp camera within reasonable world bounds
        const maxCoord = MAP_SIZE * TILE_PIXEL_SIZE;
        cameraRef.current.x = Math.max(0, Math.min(maxCoord, cameraRef.current.x));
        cameraRef.current.y = Math.max(0, Math.min(maxCoord, cameraRef.current.y));

        if (world.hitstopTimer > 0) {
          world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
        } else if (simSpeedRef.current > 0) {
          const simDt = dt * simSpeedRef.current;
          stepSimulation(world, simDt, narratorToneRef.current);

          // Follow selected NPC if alive
          if (selectedNPCIdRef.current) {
            const sel = world.creatures.find((c) => c.id === selectedNPCIdRef.current);
            if (!sel) {
              selectedNPCIdRef.current = null;
              setSelectedNPCId(null);
            }
          }

          // Periodic automatic AI Chronicle every ~20s when important events accumulate
          autoAIChronicleTimer += dt;
          if (
            autoAIChronicleTimer >= 20 &&
            world.pendingImportantEvents.length >= 2 &&
            canTriggerAutoAICall()
          ) {
            autoAIChronicleTimer = 0;
            requestAIChronicle(world, narratorToneRef.current, false).then((res) => {
              addChronicle(world, res.title, res.text, 'cronica_ia', narratorToneRef.current, res.isAI, 2);
              world.pendingImportantEvents = [];
              forceHudSync();
            });
          }
        }
      }

      // Always update pooled particles
      particlePool.update(dt);

      // Render world
      rendererRef.current?.render(
        ctx,
        canvas.width,
        canvas.height,
        world,
        cameraRef.current,
        selectedNPCIdRef.current,
        shellStateRef.current === 'playing' ? hoverTile : null,
        brushRadiusRef.current,
        timeSec
      );

      // Throttled HUD sync (~3 Hz)
      hudSyncAccumulator += dt;
      if (hudSyncAccumulator >= 0.35) {
        hudSyncAccumulator = 0;
        evaluateAchievementsAndObjectives(world);
        forceHudSync();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [forceHudSync, handleStartGame]);

  const world = worldRef.current;
  const selectedNPC: Creature | undefined = selectedNPCId
    ? world.creatures.find((c) => c.id === selectedNPCId)
    : undefined;
  const selectedNPCKingdom = selectedNPC?.kingdomId
    ? world.kingdoms.find((k) => k.id === selectedNPC.kingdomId)
    : undefined;
  const selectedSpouseName = selectedNPC?.spouseId
    ? world.creatures.find((c) => c.id === selectedNPC.spouseId)?.name ||
      world.dynastyRecords[selectedNPC.id]?.spouseName
    : undefined;
  const selectedRivalName = selectedNPC?.rivalId
    ? world.creatures.find((c) => c.id === selectedNPC.rivalId)?.name ||
      world.dynastyRecords[selectedNPC.id]?.rivalName
    : undefined;

  const notableNPCs = world.creatures.filter(
    (c) => c.role === 'rey' || c.role === 'heroe' || c.role === 'profeta' || c.race === 'dragon'
  );

  const handleSelectAndFocusNPC = (npc: Creature) => {
    setSelectedNPCId(npc.id);
    if (typeof window !== 'undefined' && window.innerWidth < 900) {
      setIsChronicleOpen(false);
    }
    cameraRef.current.x = npc.x * TILE_PIXEL_SIZE;
    cameraRef.current.y = npc.y * TILE_PIXEL_SIZE;
    cameraRef.current.zoom = Math.max(cameraRef.current.zoom, 2.2);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#071422]">
      {/* Isolated 2D Canvas Surface */}
      <canvas
        ref={canvasRef}
        data-testid="world-canvas"
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full cursor-crosshair pixelated"
      />

      {/* Title Screen Overlay */}
      {shellState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onNewSeed={handleNewWorld}
          hasSavedWorld={hasSavedWorld}
          onLoadSaved={handleLoadWorld}
        />
      )}

      {/* Playing HUD Shell */}
      {shellState !== 'title' && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {/* Top Perimeter Bar: World Readouts + Speed Controls + Feature Modals + Utility Icons */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 pointer-events-auto border-b border-amber-500/30 shadow-lg" style={{ backgroundColor: 'rgba(11, 16, 27, 0.94)' }}>
            {/* Left Cluster: Brand Emblem + Primary Tabular World Readouts */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm md:text-base font-extrabold text-amber-300 tracking-wide whitespace-nowrap">
                  AETHERIA
                </span>
              </div>

              <div className="flex items-center gap-4 border-l border-slate-800 pl-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Era</div>
                  <div className="text-sm md:text-base font-mono-tabular font-bold text-amber-200">
                    Año {world.year}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Población</div>
                  <div className="text-sm md:text-base font-mono-tabular font-bold text-emerald-300">
                    {world.creatures.length}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Reinos</div>
                  <div className="text-sm md:text-base font-mono-tabular font-bold text-sky-300">
                    {world.kingdoms.length}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Edificios</div>
                  <div className="text-sm md:text-base font-mono-tabular font-bold text-slate-200">
                    {world.buildings.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Cluster: Simulation Speed Controls (Pausa, x1, x2, x5) */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800" role="group" aria-label="Velocidad de simulación">
              {(
                [
                  { speed: 0, label: 'Pausa' },
                  { speed: 1, label: '1×' },
                  { speed: 2, label: '2×' },
                  { speed: 5, label: '5×' },
                ] as { speed: 0 | 1 | 2 | 5; label: string }[]
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    soundEngine.playClick();
                    setSimSpeed(item.speed);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono-tabular font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    simSpeed === item.speed
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right Cluster: World Summary, Dynasties, Achievements & Utility Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenWorldSummary}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/45 text-amber-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Resumen del Mundo
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveModal('dinastias');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Dinastías
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveModal('logros');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Logros ({world.achievements.filter((a) => a.unlocked).length}/{world.achievements.length})
              </button>

              {/* Zoom In / Out Buttons for Mobile & Accessibility */}
              <button
                type="button"
                aria-label="Acercar cámara"
                onClick={(e) => {
                  e.currentTarget.blur();
                  cameraRef.current.zoom = Math.min(4.5, cameraRef.current.zoom * 1.25);
                }}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Alejar cámara"
                onClick={(e) => {
                  e.currentTarget.blur();
                  cameraRef.current.zoom = Math.max(0.65, cameraRef.current.zoom * 0.8);
                }}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
              >
                −
              </button>

              {/* Mute [M] */}
              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Activar sonido [M]' : 'Silenciar sonido [M]'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const m = soundEngine.toggleMute();
                  setMuted(m);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                title="Sonido [M]"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  {muted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>

              {/* Pause / Save Menu [P] */}
              <button
                type="button"
                tabIndex={-1}
                aria-label="Menú de Guardado y Pausa [P]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  soundEngine.playClick();
                  setShellState('paused');
                  setActiveModal('pausa');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Guardar / Menú
              </button>
            </div>
          </div>

          {/* Left Drawer: NPC Inspector & Live AI Divine Chat */}
          {selectedNPC && (
            <NPCInspectorModal
              npc={selectedNPC}
              kingdom={selectedNPCKingdom}
              spouseName={selectedSpouseName}
              rivalName={selectedRivalName}
              onClose={() => setSelectedNPCId(null)}
              onSendMessage={handleSendNPCMessage}
              onBlessNPC={() => {
                soundEngine.playBlessing();
                applyGodTool(worldRef.current, 'bendicion', selectedNPC.x, selectedNPC.y, 1, narratorToneRef.current);
                forceHudSync();
              }}
              onSmiteNPC={() => {
                soundEngine.playLightning();
                applyGodTool(worldRef.current, 'rayo', selectedNPC.x, selectedNPC.y, 1, narratorToneRef.current);
                forceHudSync();
              }}
              isSendingChat={isSendingChat}
            />
          )}

          {/* Right Collapsible Drawer: AI Chronicles & Notable Leaders */}
          <ChroniclePanel
            isOpen={isChronicleOpen}
            onToggleOpen={() => {
              setIsChronicleOpen((o) => {
                const next = !o;
                if (next && typeof window !== 'undefined' && window.innerWidth < 900) {
                  setSelectedNPCId(null);
                }
                return next;
              });
            }}
            chronicles={world.chronicles}
            tone={narratorTone}
            onChangeTone={(t) => setNarratorTone(t)}
            onTriggerAIChronicle={() => handleTriggerAIChronicle(true)}
            onTriggerDivineEvent={handleTriggerDivineEvent}
            isGeneratingAI={isGeneratingAI}
            notableNPCs={notableNPCs}
            kingdoms={world.kingdoms}
            onSelectNPC={handleSelectAndFocusNPC}
          />

          {/* Bottom Dock: God Tools */}
          <GodToolbar
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            brushRadius={brushRadius}
            onSelectBrushRadius={setBrushRadius}
          />
        </div>
      )}

      {/* Modals (Divine Event, World Summary, Dynasties, Achievements, Pause/Save) */}
      <Modals
        activeModal={activeModal}
        onClose={() => {
          setActiveModal(null);
          if (shellState === 'paused') {
            setShellState('playing');
          }
          if (worldRef.current.activeDivineEvent) {
            worldRef.current.activeDivineEvent = null;
          }
        }}
        world={world}
        worldSummaryText={worldSummaryText}
        isLoadingSummary={isLoadingSummary}
        onRefreshSummary={handleOpenWorldSummary}
        divineEvent={world.activeDivineEvent}
        onChooseEventOption={(idx) => {
          if (worldRef.current.activeDivineEvent) {
            applyDivineEventOption(
              worldRef.current,
              worldRef.current.activeDivineEvent,
              idx,
              narratorToneRef.current
            );
            setActiveModal(null);
            forceHudSync();
          }
        }}
        onSaveWorld={handleSaveWorld}
        onLoadWorld={handleLoadWorld}
        hasSavedWorld={hasSavedWorld}
        saveStatusMessage={saveStatusMessage}
        onNewWorld={handleNewWorld}
        onReturnToTitle={() => {
          setActiveModal(null);
          setShellState('title');
        }}
      />
    </main>
  );
}
