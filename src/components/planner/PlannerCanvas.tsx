import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Line, Transformer, Rect, Circle, Group, Text, Path, Image as KonvaImage, Arrow } from 'react-konva';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Calculator, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';

// Componentes hijos
import PlannerToolbar, { type Tool } from './PlannerToolbar';
import PlannerSidebar from './PlannerSidebar';

// Utilidades
import { generateUnifilarDiagram } from '../../lib/planner/utils/unifilarAutoMapper'; // 🆕 Generador automático
import MaterialReportModal from './MaterialReportModal';
import ProjectInfoModal, { type ProjectData } from './ProjectInfoModal';
import CalculationSidebar from './CalculationSidebar';
import { supabase } from '../../lib/supabase';
import { PlanService } from '../../services/plan.service';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileService } from '../../services/profile.service';
import { addPDFCoverPage } from '../../lib/pdf-utils';
import autoTable from 'jspdf-autotable';

// Sistema de Catálogos
import { CatalogLoader } from '../../lib/planner/catalog-loader';
import type { TradeCatalog, SymbolItem, Wall, Pipe, AuxLine } from '../../types/planner';

// Hooks Personalizados
import { useCanvasState } from '../../lib/planner/hooks/useCanvasState';
import { useDrawingTools } from '../../lib/planner/hooks/useDrawingTools';
import { usePlannerPersistence } from '../../lib/planner/hooks/usePlannerPersistence';
import { useCircuitLayers } from '../../lib/planner/hooks/useCircuitLayers';
import { usePipeRenderer } from '../../lib/planner/hooks/usePipeRenderer';
import { PipeRenderer } from './PipeRenderer'; // 🆕 Circuit-based layers

// Generación de Ambientes
import { PlannerVisionPanel } from './PlannerVisionPanel'; // 🆕 Panel Unificado "El Cerebro"
import { DoorComponent } from './DoorComponent';
import { WindowComponent } from './WindowComponent';
import { generateRoomWalls, getRoomCenter } from '../../lib/planner/utils/roomGenerator';
import { PassageComponent } from './PassageComponent';

// Sistema de Múltiples Plantas y Capas
import { FloorTabs } from './FloorTabs';
import { NewFloorModal } from './NewFloorModal';
import { EditFloorModal } from './EditFloorModal';
import { OpeningConfigModal, type DoorConfig, type WindowConfig, type PassageConfig } from './OpeningConfigModal';
import { PlannerBottomHub } from './PlannerBottomHub';
import type { PaperFormat, Floor } from '../../types/floors';
import { createFloor } from '../../types/floors';
import type { Opening } from '../../types/openings';
import { createDoor, createWindow, createPassage } from '../../types/openings';
import { findNearestWall } from '../../lib/planner/utils/openingGeometry';
import { createDimension } from '../../types/dimensions';
import { DimensionComponent } from './DimensionComponent';

// 🆕 Rótulo IRAM 4508
import { TITLE_BLOCK_CONFIG } from '../../lib/planner/constants/titleBlockLayout';
import { mmToPixels, calculateStandardScale, IRAM_MARGINS, getUsableDimensions } from '../../lib/planner/utils/geometryConverter';

export default function PlannerCanvas() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();

  // LOG DE VERIFICACIÓN
  console.log('Taller CAD Abierto para Proyecto ID:', projectId);

  // --- ESTADOS PRINCIPALES ---
  const [tool, setTool] = useState<Tool>('select');
  const [currentCircuitColor, setCurrentCircuitColor] = useState<string>('#dc2626');
  const [currentPipeType, setCurrentPipeType] = useState<'straight' | 'curved'>('curved');
  const [currentPipeDashMode, setCurrentPipeDashMode] = useState<'solid' | 'dashed'>('solid'); // 🆕 Trazo por defecto
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: '',
    address: '',
    installer: '',
    licenseNumber: '', // 🆕
    planNumber: 'IE-01', // 🆕
    category: '',    // Se usará para mostrar la escala calculada
    date: new Date().toLocaleDateString('es-AR')
  });

  // --- DUAL MODE STATE ---
  const [activeMode, setActiveMode] = useState<'floorPlan' | 'singleLine'>('floorPlan');
  const [unifilarInitialized, setUnifilarInitialized] = useState(false); // 🆕 Flag para auto-generación
  const modeStore = useRef<{
    floorPlan: { floors: any[]; pixelsPerMeter: number };
    singleLine: { floors: any[]; pixelsPerMeter: number };
  }>({
    floorPlan: {
      floors: [createFloor('Planta Baja', 'A4-landscape')],
      pixelsPerMeter: 50
    },
    singleLine: {
      floors: [createFloor('Diagrama Unifilar', 'A4-landscape')],
      pixelsPerMeter: 50
    }
  });

  // ✅ HOOK: Estado del Canvas (NUEVA ESTRUCTURA CON FLOORS Y LAYERS)
  const canvasState = useCanvasState();
  const {
    // Plantas y capas
    floors,
    currentFloorId,
    currentLayerId,
    setCurrentFloorId,
    setCurrentLayerId,
    getCurrentFloor,
    getCurrentLayer,
    addFloor,
    removeFloor,
    updateFloorFormat,
    updateFloorName,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayerColor,
    setFloors,

    // Elementos (compatibilidad)
    symbols,
    walls,
    pipes,
    auxLines,
    dimensions,
    roomGroups,
    pixelsPerMeter,
    selectedId,
    setSymbols,
    setWalls,
    setPipes,
    setAuxLines,
    setDimensions,
    setRoomGroups,
    setPixelsPerMeter,
    selectShape,
    addSymbol,
    addWall,
    addPipe,
    addDimension,
    addAuxLine
  } = canvasState;

  const [isVisionPanelCollapsed, setIsVisionPanelCollapsed] = useState(false); // 🆕 Estado para Modo Foco
  const [visionActiveTab, setVisionActiveTab] = useState<'layers' | 'environments' | 'properties' | 'control' | 'help'>('layers');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showProjectInfoModal, setShowProjectInfoModal] = useState(false);
  const [showNewFloorModal, setShowNewFloorModal] = useState(false);
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingType, setOpeningType] = useState<'door' | 'window'>('door');
  const [openingConfig, setOpeningConfig] = useState<DoorConfig | WindowConfig | null>(null);
  const [calculationData, setCalculationData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundBase64, setBackgroundBase64] = useState<string | null>(null);
  const [backgroundProps, setBackgroundProps] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
  const [isBackgroundLocked, setIsBackgroundLocked] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'architecture' | 'electricity' | 'geometry'>('architecture'); // 🆕 Especialidad activa
  const [isHubCollapsed, setIsHubCollapsed] = useState(false); // 🆕 Estado del dock inferior
  const [pendingRoom, setPendingRoom] = useState<{ name: string; width: number; length: number; area: number } | null>(null); // 🆕 Tap-to-place room

  // --- CATALOG SYSTEM ---
  const catalogLoader = useMemo(() => new CatalogLoader(), []);
  const [activeCatalog, setActiveCatalog] = useState<TradeCatalog | null>(null);

  // Cargar catálogo eléctrico al montar el componente
  useEffect(() => {
    catalogLoader.loadCatalog('electrical')
      .then(catalog => {
        setActiveCatalog(catalog);
        console.log('✅ Catálogo eléctrico cargado:', catalog.name);
      })
      .catch(error => {
        console.error('❌ Error cargando catálogo eléctrico:', error);
      });
  }, [catalogLoader]);

  // --- EXPORT STATE ---
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportNotes, setExportNotes] = useState(
    "Instalación eléctrica ejecutada según normas AEA 90364. Se utilizó cañería de PVC ignífugo y conductores normalizados IRAM NM-247-3. El conductor de protección (PE) recorre toda la instalación."
  );

  // ZOOM / PAN
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 50, y: 50 });

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // --- COPY/PASTE STATE ---
  const [clipboard, setClipboard] = useState<any | null>(null);

  // --- REGLAS MAGNÉTICAS ---
  interface Guideline { id: string; orientation: 'H' | 'V'; position: number; }
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const SNAP_THRESHOLD = 10; // px — distancia de atracción magnética

  // --- OPENING INTERACTIVITY STATE ---
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [editingOpening, setEditingOpening] = useState<Opening | null>(null);
  const [isOpeningConfigOpen, setIsOpeningConfigOpen] = useState(false);

  // 🆕 Obtener estado de obra para validaciones y UI
  const projectConfig = calculationData?.config || {};
  const estadoObra = projectConfig.estadoObra || 'nueva';

  // 🆕 HOOK: Circuit-Based Layers (DEBE estar ANTES de useDrawingTools)
  // Genera automáticamente layer-0 (arquitectura) + 1 layer por circuito del Wizard
  const circuitLayers = useCircuitLayers(calculationData?.config);



  // 🆕 SYNCHRONIZATION: Reemplazar DEFAULT_LAYERS con circuitLayers dinámicos en todas las plantas
  useEffect(() => {
    if (circuitLayers.length > 0 && floors.length > 0) {
      // Verificar si alguna planta no está sincronizada
      const needsSync = floors.some(floor => {
        const currentLayers = floor.layers;
        return currentLayers.length !== circuitLayers.length ||
          !currentLayers.every((l, i) => l.id === circuitLayers[i].id);
      });

      if (needsSync) {
        console.log('🔄 Sincronizando capas del Wizard en TODAS las plantas:', circuitLayers.length, 'circuitos');

        const updatedFloors = floors.map(floor => ({
          ...floor,
          layers: [...circuitLayers]
        }));

        (canvasState as any).setFloors(updatedFloors);

        if (!circuitLayers.some(l => l.id === currentLayerId)) {
          setCurrentLayerId('layer-0');
        }
      }
    }
  }, [circuitLayers, floors, currentLayerId, canvasState, setCurrentLayerId]);

  // 🆕 AUTO-GENERACIÓN: Generar diagrama unifilar al entrar al modo por primera vez
  useEffect(() => {
    console.log('🔍 Auto-gen check:', {
      activeMode,
      unifilarInitialized,
      hasConfig: !!calculationData?.config,
      hasPanels: calculationData?.config?.panels?.length || 0
    });

    if (activeMode === 'singleLine' && !unifilarInitialized && calculationData?.config) {

      // ✅ VERIFICACIÓN PREVENTIVA (ETAPA 4): Si el Unifilar ya tiene símbolos en el store, NO sobreescribir.
      // Esto pasa cuando el usuario modificó manualmente el CAD y luego volvió del Wizard.
      const storedSingleLineSymbols = modeStore.current.singleLine?.floors?.[0]?.elements?.symbols;
      if (storedSingleLineSymbols && storedSingleLineSymbols.length > 0) {
        console.log('🛡️ Evitando auto-generación: El diagrama unifilar ya contenía dibujos manuales. (Golden Template Preservado)');
        setUnifilarInitialized(true);
        return; // Salir temprano
      }

      console.log('🔧 Auto-generando diagrama unifilar...');

      try {
        // 🆕 LIMPIAR símbolos del modo planta ANTES de generar unifilar
        console.log('🧹 Limpiando símbolos del modo planta...');
        setSymbols([]);  // Vaciar array de símbolos
        setPipes([]);    // Vaciar array de pipes

        // Obtener formato de hoja actual
        const currentFloor = floors.find(f => f.id === currentFloorId);
        const sheetFormat = currentFloor?.format;

        console.log('📐 Formato de hoja:', sheetFormat);

        // Generar símbolos y conexiones desde la configuración del Wizard
        const { symbols: generatedSymbols, pipes: generatedPipes } = generateUnifilarDiagram(calculationData.config, {
          sheetFormat,  // 🆕 Pasar formato de hoja para sistema de grilla
          startX: 400,  // Fallback para modo legacy
          startY: 200,
          verticalSpacing: 80,
          horizontalSpacing: 300
        });

        console.log(`✅ Diagrama generado: ${generatedSymbols.length} símbolos, ${generatedPipes.length} conexiones`, {
          symbols: generatedSymbols,
          pipes: generatedPipes
        });

        // 🆕 LIMPIAR símbolos del modo planta antes de agregar símbolos del unifilar
        // Los símbolos del modo planta (outlets, switches) NO deben aparecer en modo unifilar
        console.log('🧹 Limpiando símbolos del modo planta...');

        // Agregar símbolos del unifilar (REEMPLAZAR, no agregar)
        if (generatedSymbols.length > 0) {
          console.log('🔍 Antes de setSymbols, currentFloorId:', currentFloorId);
          console.log('🔍 Símbolos generados tienen layer:', generatedSymbols[0]?.layer);
          setSymbols(generatedSymbols);  // Reemplaza TODOS los símbolos
        }

        // Agregar conexiones (pipes) del unifilar (REEMPLAZAR, no agregar)
        if (generatedPipes.length > 0) {
          setPipes(generatedPipes);  // Reemplaza TODOS los pipes
        }

        // Marcar como inicializado INMEDIATAMENTE para evitar re-ejecución
        setUnifilarInitialized(true);

        console.log('✅ Auto-generación completada');
      } catch (error) {
        console.error('❌ Error generando diagrama unifilar:', error);
      }
    }
  }, [activeMode, unifilarInitialized, calculationData?.config, modeStore, floors, currentFloorId]);

  // 🆕 HELPER: Obtener datos del circuito desde calculationData
  const getCircuitData = useCallback((circuitId?: string) => {
    if (!circuitId || !calculationData?.config?.circuitInventoryForCAD) {
      return null;
    }

    return calculationData.config.circuitInventoryForCAD.find(
      (c) => c.id === circuitId
    );
  }, [calculationData]);

  // 🆕 HELPER: Actualizar propiedades de un símbolo (usado por el Hub)
  const handleUpdateSymbol = useCallback((id: string, updates: Partial<SymbolItem>) => {
    setSymbols((prev: any) => prev.map((s: any) => s.id === id ? { ...s, ...updates } : s));
  }, [setSymbols]);

  const selectedSymbol = useMemo(() => {
    if (!selectedId) return null;
    return symbols.find(s => s.id === selectedId) || null;
  }, [selectedId, symbols]);

  // 🎨 CONSTANTES: Visualización de nature y method
  const NATURE_OPACITY = {
    proyectado: 1.0,
    relevado: 0.6
  };

  const NATURE_COLORS = {
    relevado: {
      stroke: '#94a3b8',  // Gris
      fill: '#f1f5f9'     // Gris claro
    }
  };

  const METHOD_DASH = {
    dashPatterns: {
      dashed: [10, 5],                   // D1, D2
      solid: undefined                   // B1, B2
    }
  };

  // ✅ HOOK: Pipe Renderer (DEBE estar ANTES de useDrawingTools)
  const { getPipeDash, getPipeStyle, registerPipe } = usePipeRenderer();

  // ✅ HOOK: Herramientas de Dibujo
  const drawingTools = useDrawingTools(
    {
      tool,
      currentCircuitColor,
      currentPipeType,
      currentPipeDashMode, // 🆕 Modo de trazo
      pixelsPerMeter,
      stageRef,
      onCalibrationComplete: (newPixelsPerMeter) => {
        setPixelsPerMeter(newPixelsPerMeter);
        console.log('🎯 Escala actualizada globalmente:', newPixelsPerMeter, 'px/m');
      },
      // 🆕 Circuit-based layers
      currentLayerId,
      circuitLayers,
      estadoObra, // 🆕 Para validaciones
    },
    { addSymbol, addWall, addPipe, addAuxLine, addDimension, selectShape, registerPipe } // 🆕 registerPipe
  );
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    currentWall,
    currentAuxLine,
    currentPipePreview,
    calibrationLine,
    pipeStartPoint,
    dimensionFirstPoint,
    dimensionPreview,
    getCursorStyle,
    cancelDrawing,
    getPointerPosition,
    mousePos // 🆕 Posición para modo fantasma
  } = drawingTools;

  // ✅ HOOK: Persistencia
  const { loadProject, saveProject } = usePlannerPersistence({
    projectId,
    userId: user?.id,
    modeStore,
    canvasState,
    backgroundState: {
      setBackgroundImage,
      setBackgroundBase64,
      setBackgroundProps,
      backgroundBase64,
      backgroundProps
    },
    calculationData,
    onCalculationDataLoaded: setCalculationData
  });

  // --- DRAG & DROP DE AMBIENTES ---
  const [draggedRoom, setDraggedRoom] = useState<{ name: string; width: number; length: number; area: number } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // --- GRUPOS DE AMBIENTES (para Transformer) ---
  interface RoomGroup {
    id: string;
    walls: Wall[];
    labelId: string;
    originalWidth: number;
    originalLength: number;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    layerId: string; // Capa a la que pertenece el ambiente
    openings: Opening[]; // Aberturas (puertas y ventanas) del ambiente
  }

  // Handler: Inicio de arrastre de ambiente
  const handleRoomDragStart = (room: { name: string; width: number; length: number; area: number }) => {
    setDraggedRoom(room);
    console.log('🏠 Arrastrando ambiente:', room.name);
  };

  // Handler: Drop en canvas - Genera 4 paredes automáticamente
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedRoom) return;

    e.preventDefault();

    // Obtener posición del drop relativa al Stage
    const stage = stageRef.current;
    if (!stage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convertir coordenadas de pantalla a coordenadas del canvas
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = transform.point({ x, y });

    console.log('📏 Drop en posición:', pos, 'pixelsPerMeter:', pixelsPerMeter);

    // Generar ID único para el grupo de ambiente
    const roomGroupId = `room-${Date.now()}`;
    const labelId = `label-${Date.now()}`;

    // Generar 4 paredes formando rectángulo (relativas a 0,0 del grupo)
    const newWalls = generateRoomWalls(
      { width: draggedRoom.width, length: draggedRoom.length },
      { x: 0, y: 0 }, // Relativo al grupo
      pixelsPerMeter
    );

    // Crear grupo de ambiente (ASIGNADO A CAPA 0: Muros/Ambientes)
    const newGroup: RoomGroup = {
      id: roomGroupId,
      walls: newWalls,
      labelId: labelId,
      originalWidth: draggedRoom.width,
      originalLength: draggedRoom.length,
      x: pos.x,
      y: pos.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      layerId: 'layer-0', // Asignado automáticamente a capa Muros/Ambientes
      openings: [] // Inicialmente sin aberturas
    };

    setRoomGroups(prev => [...prev, newGroup]);

    // Agregar etiqueta (independiente, pero sincronizada)
    const center = getRoomCenter(
      { width: draggedRoom.width, length: draggedRoom.length },
      { x: 0, y: 0 }, // Relativo al grupo
      pixelsPerMeter
    );

    addSymbol({
      id: labelId,
      type: 'text',
      x: pos.x + center.x,
      y: pos.y + center.y,
      label: draggedRoom.name,
      fontSize: 14,
      color: '#1e40af',
      rotation: 0,
      groupId: roomGroupId // Para sincronizar movimiento
    });

    // Limpiar estado
    setDraggedRoom(null);
    console.log('✅ Ambiente generado:', draggedRoom.name, `(${draggedRoom.width}x${draggedRoom.length}m)`, 'GroupID:', roomGroupId);
  };

  // Handler: DragOver - Permitir drop
  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRoomSelect = (room: { name: string; width: number; length: number; area: number }) => {
    setPendingRoom(room);
    console.log('🎯 Ambiente seleccionado (Tap-to-place):', room.name);
    // Colapsar panel en móvil para mejor visibilidad
    if (window.innerWidth < 1024) {
      setIsVisionPanelCollapsed(true);
    }
  };

  // --- HANDLER: MOUSE DOWN EN STAGE (Interceder para Tap-to-place y Aberturas) ---
  const handleStageMouseDown = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // 0. DESELECCION: Si clickeamos el fondo o el papel, limpiar selecciones
    // En Konva, e.target es el objeto clickeado. Si es el stage o el papel, deseleccionamos.
    const clickedOnStage = e.target === stage;
    const clickedOnPaper = e.target.name() === 'paper-bg';

    if (clickedOnStage || clickedOnPaper) {
      if (selectedOpeningId) setSelectedOpeningId(null);
      if (selectedId) selectShape(null);
      if (selectedGroupId) setSelectedGroupId(null);
      console.log('🧹 Selección limpiada (Click en fondo)');
    }

    // 1. Si hay un ambiente pendiente, colocarlo y salir
    if (pendingRoom) {
      const pos = getPointerPosition(stage);

      const roomGroupId = `room-${Date.now()}`;
      const labelId = `label-${Date.now()}`;

      const newWalls = generateRoomWalls(
        { width: pendingRoom.width, length: pendingRoom.length },
        { x: 0, y: 0 },
        pixelsPerMeter
      );

      const newGroup: RoomGroup = {
        id: roomGroupId,
        walls: newWalls,
        labelId: labelId,
        originalWidth: pendingRoom.width,
        originalLength: pendingRoom.length,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        layerId: 'layer-0',
        openings: []
      };

      setRoomGroups(prev => [...prev, newGroup]);

      const center = getRoomCenter(
        { width: pendingRoom.width, length: pendingRoom.length },
        { x: 0, y: 0 },
        pixelsPerMeter
      );

      addSymbol({
        id: labelId,
        type: 'text',
        x: pos.x + center.x,
        y: pos.y + center.y,
        label: pendingRoom.name,
        fontSize: 14,
        color: '#1e40af',
        rotation: 0,
        groupId: roomGroupId
      });

      setPendingRoom(null);
      console.log('✅ Ambiente colocado vía Tap-to-place:', pendingRoom.name);
      return;
    }

    // 2. Si la herramienta es una abertura y hay configuración activa, intentar insertar en muro
    if (['door', 'window', 'passage'].includes(tool) && openingConfig) {
      const pos = getPointerPosition(stage);

      let foundWall: { groupId: string, wallIndex: number, position: number } | null = null;

      roomGroups.forEach(group => {
        const result = findNearestWall(
          group.walls,
          pos.x,
          pos.y,
          group.x,
          group.y,
          group.rotation,
          group.scaleX,
          group.scaleY,
          30
        );
        if (result && !foundWall) { // Solo toma el primer muro encontrado dentro de la tolerancia
          foundWall = { groupId: group.id, ...result };
        }
      });

      if (foundWall) {
        const { groupId, wallIndex, position } = foundWall;

        // Crear apertura usando los helpers de types/openings.ts
        // Nota: Los helpers generan su propio ID.
        let newOpening: any;
        if (tool === 'door') {
          const cfg = openingConfig as DoorConfig;
          newOpening = createDoor(groupId, wallIndex, position, cfg.width, cfg.doorSwing, cfg.openingDirection);
        } else if (tool === 'window') {
          const cfg = openingConfig as WindowConfig;
          newOpening = createWindow(groupId, wallIndex, position, cfg.width, cfg.height, cfg.sillHeight);
        } else {
          const cfg = openingConfig as PassageConfig;
          newOpening = createPassage(groupId, wallIndex, position, cfg.width || 0.80);
        }

        setRoomGroups((prev: RoomGroup[]) => prev.map(g =>
          g.id === groupId
            ? { ...g, openings: [...g.openings, newOpening] }
            : g
        ));

        console.log(`✅ ${tool} colocada en muro:`, newOpening);
        setTool('select'); // Volver a selección después de colocar
        setOpeningConfig(null);
        return;
      } else {
        console.log('⚠️ No se encontró un muro cercano para colocar la abertura');
      }
    }

    // 3. Si no hay nada pendiente, llamar al handler estándar de dibujo
    handleMouseDown(e);
  };

  // --- EFECTOS ---
  // Limpiar ambiente pendiente al cambiar de pestaña, herramienta o modo para evitar colocaciones accidentales
  useEffect(() => {
    if (pendingRoom) {
      setPendingRoom(null);
      console.log('🧹 Limpiando ambiente pendiente por cambio de contexto');
    }
  }, [tool, activeMode, visionActiveTab]);

  // Cargar catálogo eléctrico al montar el componente
  useEffect(() => {
    catalogLoader.loadCatalog('electrical')
      .then(catalog => {
        setActiveCatalog(catalog);
        console.log('✅ Catálogo eléctrico cargado:', catalog.name);
      })
      .catch(error => {
        console.error('❌ Error cargando catálogo:', error);
      });
  }, [catalogLoader]);

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      const selectedSym = symbols.find(s => s.id === selectedId);
      const isLine = walls.find(w => w.id === selectedId) ||
        auxLines.find(a => a.id === selectedId) ||
        (selectedSym && ['line', 'arrow'].includes(selectedSym.type));

      // Permitir transformación de IMAGEN DE FONDO
      if (selectedId === 'blueprint-bg') {
        if (node && !isBackgroundLocked) {
          transformerRef.current.nodes([node]);
          transformerRef.current.getLayer().batchDraw();
        } else {
          transformerRef.current.nodes([]);
        }
        return;
      }

      if (node && !isLine) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    } else {
      transformerRef.current?.nodes([]);
    }
  }, [selectedId, walls, auxLines, symbols, isBackgroundLocked]);

  useEffect(() => {
    if (selectedId && currentCircuitColor) {
      setPipes(prev => prev.map(p => p.id === selectedId ? { ...p, color: currentCircuitColor } : p));
    }
  }, [currentCircuitColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar eventos de teclado si el usuario está escribiendo en un input o textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace')) { handleDeleteSelected(); return; }

      // ✂️ Ctrl+C: Copiar símbolo o texto seleccionado
      if (e.ctrlKey && e.key === 'c') {
        const sym = symbols.find(s => s.id === selectedId);
        if (sym) {
          setClipboard({ ...sym });
          console.log('📋 Copiado:', sym.type, sym.id);
        }
        return;
      }

      // 📋 Ctrl+V: Pegar con offset de +20px
      if (e.ctrlKey && e.key === 'v' && clipboard) {
        const newSym = {
          ...clipboard,
          id: `sym-${Date.now()}`,
          x: (clipboard.x || 0) + 20,
          y: (clipboard.y || 0) + 20
        };
        setSymbols((prev: any[]) => [...prev, newSym]);
        selectShape(newSym.id);
        console.log('📋 Pegado:', newSym.type, newSym.id);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, symbols, clipboard]);


  // Cargar Perfil del Matriculado (para PDF y Rótulo)
  useEffect(() => {
    if (user) {
      ProfileService.getProfile(user.id).then(p => {
        setProfileData(p);
        if (p) {
          setProjectData(prev => ({
            ...prev,
            installer: prev.installer || p.business_name || '',
            licenseNumber: prev.licenseNumber || p.license_number || '',
          }));
        }
      }).catch(console.error);
    }
  }, [user]);


  // --- ACCIONES ---
  // Guardar proyecto completo (cálculo + dibujo)
  const handleSaveProject = async () => {
    if (!user) {
      alert('⚠️ Debes iniciar sesión para guardar');
      return;
    }

    if (!calculationData) {
      alert('⚠️ No hay datos de cálculo. Completa primero el wizard.');
      return;
    }

    // [NUEVO] Obtener el estado real de floors desde el hook
    const currentFloorsState = canvasState.floors;

    // 1. Guardar estado actual en el store antes de persistir
    modeStore.current[activeMode] = {
      floors: currentFloorsState,
      pixelsPerMeter
    };

    const drawingData = {
      // Estructura Dual (ahora basada en Floors)
      floorPlan: modeStore.current.floorPlan,
      singleLine: modeStore.current.singleLine,

      // Fondo Global
      backgroundBase64,
      backgroundProps
    };

    try {
      if (projectId && projectId !== 'draft') {
        // ACTUALIZAR PROYECTO EXISTENTE
        await PlanService.savePlan(projectId, drawingData);
        alert('✅ Proyecto y Dibujo actualizados correctamente');
        console.log('✅ Proyecto actualizado:', projectId);
      } else {
        // Crear nuevo proyecto
        const projectMetadata = {
          user_id: user.id,
          client_name: calculationData.config.clientName,
          surface_area: calculationData.config.surfaceArea,
          property_type: (calculationData.config.destination || 'vivienda').toLowerCase(),
          electrification_grade: calculationData.calculation.grade,
          project_type: calculationData.config.workType === 'certification_only' ? 'certificacion' : 'presupuesto',
          voltage_type: calculationData.config.voltage || '220V',
          client_cuit: calculationData.config.ownerDetail?.dniCuit || null,
          client_address: calculationData.config.ownerDetail?.address || null,
          client_city: calculationData.config.ownerDetail?.city || null,
          client_catastro: calculationData.config.ownerDetail?.catastro || null,
          drawing_data: drawingData,
          calculation_data: {
            config: calculationData.config,
            environments: calculationData.environments,
            calculation: calculationData.calculation
          }
        };

        const { data, error } = await supabase
          .from('projects')
          .insert([projectMetadata as any])
          .select()
          .single() as any;

        if (error) throw error;
        alert('✅ Proyecto guardado correctamente');

        if (data?.id) {
          navigate(`/taller/${data.id}`, { replace: true });
          sessionStorage.setItem('oveCurrentProjectId', data.id);
        }
      }
    } catch (error: any) {
      console.error('Error guardando proyecto:', error);
      alert(`❌ Error al guardar: ${error.message}`);
    }
  };

  const handleOpeningUpdatePosition = (roomId: string, openingId: string, newPosition: number) => {
    setRoomGroups(prev => prev.map(g =>
      g.id === roomId
        ? {
          ...g,
          openings: g.openings.map(o =>
            o.id === openingId ? { ...o, position: newPosition } : o
          )
        }
        : g
    ));
  };

  const handleOpeningSelect = (openingId: string) => {
    setSelectedOpeningId(openingId);
    setSelectedGroupId(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  };

  const handleOpeningEdit = (opening: Opening) => {
    setEditingOpening(opening);
    setIsOpeningConfigOpen(true);
  };

  const handleOpeningUpdateConfig = (config: DoorConfig | WindowConfig | PassageConfig) => {
    if (!editingOpening) return;

    setRoomGroups(prev => prev.map(g =>
      g.id === editingOpening.roomGroupId
        ? {
          ...g,
          openings: g.openings.map(o =>
            o.id === editingOpening.id
              ? { ...o, ...config }
              : o
          )
        }
        : g
    ));

    setEditingOpening(null);
    setIsOpeningConfigOpen(false);
  };

  const handleDeleteSelected = () => {
    // 🆕 Eliminar abertura seleccionada (Puerta, Ventana, Paso)
    if (selectedOpeningId) {
      setRoomGroups(prev => prev.map(g => ({
        ...g,
        openings: g.openings.filter(o => o.id !== selectedOpeningId)
      })));
      setSelectedOpeningId(null);
      return;
    }

    if (selectedId) {
      // 🆕 Eliminar imagen de fondo si está seleccionada
      if (selectedId === 'blueprint-bg') {
        handleDeleteImage();
        return;
      }

      // Verificar si es un grupo de ambiente
      if (selectedId.startsWith('room-')) {
        // Encontrar el grupo
        const group = roomGroups.find(g => g.id === selectedId);
        if (group) {
          // Eliminar grupo
          setRoomGroups(prev => prev.filter(g => g.id !== selectedId));
          // Eliminar etiqueta asociada
          setSymbols(prev => prev.filter(item => item.id !== group.labelId));
          console.log('🗑️ Ambiente eliminado:', selectedId);
        }
      }
      // 🆕 Eliminar Cota
      else if (dimensions.find(d => d.id === selectedId)) {
        setDimensions(prev => prev.filter(d => d.id !== selectedId));
        console.log('🗑️ Cota eliminada:', selectedId);
      }
      else if (selectedOpeningId) {
        // Eliminar abertura individual
        setRoomGroups(prev => prev.map(g => ({
          ...g,
          openings: g.openings.filter(o => o.id !== selectedOpeningId)
        })));
        console.log('🗑️ Abertura eliminada:', selectedOpeningId);
        setSelectedOpeningId(null);
      } else {
        // Eliminar elemento individual (símbolo, pared, pipe, etc.)
        setSymbols(prev => prev.filter(item => item.id !== selectedId));
        setWalls(prev => prev.filter(item => item.id !== selectedId));
        setPipes(prev => prev.filter(item => item.id !== selectedId));
        setAuxLines(prev => prev.filter(item => item.id !== selectedId));
      }
      selectShape(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("¿Estás seguro de que quieres BORRAR TODO el plano?")) {
      setSymbols([]); setWalls([]); setPipes([]); setAuxLines([]);
      setRoomGroups([]); // Limpiar ambientes
      selectShape(null);
    }
  };

  // Handler: Agregar nueva planta
  const handleAddFloor = (name: string, format: PaperFormat) => {
    // Pasar circuitLayers para que la nueva planta herede las capas del Wizard
    addFloor(name, format.name + '-' + format.orientation, circuitLayers);
    setShowNewFloorModal(false);
  };

  // Handler: Abrir modal de edición
  const handleEditFloor = (floorId: string) => {
    setEditingFloorId(floorId);
    setShowEditFloorModal(true);
  };

  // Handler: Confirmar edición de planta
  const handleEditFloorConfirm = (name: string, format: PaperFormat) => {
    if (editingFloorId) {
      updateFloorName(editingFloorId, name);
      updateFloorFormat(editingFloorId, `${format.name}-${format.orientation}`);
      setShowEditFloorModal(false);
      setEditingFloorId(null);
    }
  };

  // Handler: Eliminar planta
  const handleDeleteFloor = () => {
    if (!editingFloorId) return;

    // Protección adicional en lógica
    if (floors.length <= 1 || floors[0].id === editingFloorId) {
      alert("No se puede eliminar la planta original del proyecto.");
      return;
    }

    if (window.confirm(`¿Estás seguro de que deseas eliminar la planta "${floors.find(f => f.id === editingFloorId)?.name}"? Esta acción no se puede deshacer.`)) {
      removeFloor(editingFloorId);
      setShowEditFloorModal(false);
      setEditingFloorId(null);
    }
  };

  // Handler: Abrir modal de abertura (puerta o ventana)
  const handleOpeningTool = (type: 'door' | 'window' | 'passage') => {
    setOpeningType(type);
    setEditingOpening(null); // Asegurar que no estamos editando
    setIsOpeningConfigOpen(true);
  };

  // Handler: Confirmar configuración de abertura (Creación)
  const handleOpeningConfirmNew = (config: DoorConfig | WindowConfig | PassageConfig) => {
    // Guardar configuración y activar herramienta
    setOpeningConfig(config);
    setTool(config.type);
    setIsOpeningConfigOpen(false);
    console.log(`🚪 Herramienta ${config.type} activada (Nueva):`, config);
  };


  const handleCalibrateEnd = (points: number[]) => {
    const dx = points[2] - points[0];
    const dy = points[3] - points[1];
    const distPixels = Math.sqrt(dx * dx + dy * dy);
    if (distPixels < 10) return;

    const metersStr = window.prompt("¿Cuántos METROS reales mide la línea?", "1.0");
    if (metersStr) {
      const meters = parseFloat(metersStr.replace(',', '.'));
      if (!isNaN(meters) && meters > 0) {
        const newPPM = distPixels / meters;
        setPixelsPerMeter(newPPM);
        alert(`¡Escala Calibrada! 1 Metro = ${Math.round(newPPM)} pixeles.`);
        setProjectData(prev => ({ ...prev, category: `1:${Math.round(100 * 50 / newPPM)}` }));
      }
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setStageScale(newScale);
    setStagePos({
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    });
  };

  const handleUpdateLabel = (id: string, currentLabel?: string) => {
    const newLabel = prompt("Ingresa el texto para esta etiqueta:", currentLabel || "");
    if (newLabel !== null) {
      handleUpdateSymbolProperty(id, 'label', newLabel);
    }
  };

  const handleUpdateSymbolProperty = (id: string, property: string, value: any) => {
    setSymbols(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [property]: value };
      }
      return s;
    }));
  };

  // --- CAMBIO DE MODO ---
  const handleSwitchMode = (newMode: 'floorPlan' | 'singleLine') => {
    if (newMode === activeMode) return;

    console.log(`🔄 Cambiando de ${activeMode} a ${newMode}`);

    // 1. Guardar estado actual (array de floors completo) en store
    modeStore.current[activeMode] = {
      floors: canvasState.floors,
      pixelsPerMeter
    };
    console.log(`💾 Guardado estado de ${activeMode}:`, {
      floorsCount: canvasState.floors.length,
      symbolsCount: canvasState.floors[0]?.elements?.symbols?.length || 0
    });

    // Ajustar pestaña del panel derecho si es necesario (MV Properties)
    if (newMode === 'singleLine' && visionActiveTab === 'environments') {
      setVisionActiveTab('properties');
    } else if (newMode === 'floorPlan' && visionActiveTab === 'properties') {
      setVisionActiveTab('environments');
    }

    // 2. Cambiar modo
    setActiveMode(newMode);

    // 🆕 Si entramos a modo unifilar y estamos en arquitectura, cambiar a electricidad
    if (newMode === 'singleLine' && activeCategory === 'architecture') {
      setActiveCategory('electricity');
      console.log('📐 Auto-cambiando categoría a Electricidad (arquitectura no disponible en unifilar)');
    }

    // 3. Cargar estado del nuevo modo
    let nextData = modeStore.current[newMode];
    console.log(`📂 Cargando estado de ${newMode}:`, {
      floorsCount: nextData?.floors?.length || 0,
      symbolsCount: nextData?.floors?.[0]?.elements?.symbols?.length || 0
    });

    // Si hay datos previos para ese modo
    if (nextData && nextData.floors && nextData.floors.length > 0) {
      canvasState.setFloors(nextData.floors);
      // Resetear IDs de planta y capa actuales si es necesario
      if (nextData.floors.length > 0) {
        canvasState.setCurrentFloorId(nextData.floors[0].id);
        canvasState.setCurrentLayerId('layer-0');
      }
      setPixelsPerMeter(nextData.pixelsPerMeter || 50);
    }

    selectShape(null);
    setSelectedOpeningId(null);
    setSelectedGroupId(null);
    console.log(`✅ Modo cambiado a: ${newMode}`);
  };


  // --- IMAGEN DE FONDO ---
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const img = new Image();
        img.src = result;
        img.onload = () => {
          setBackgroundImage(img);
          setBackgroundBase64(result);
          // Centrar imagen aprox
          setBackgroundProps({ x: 50, y: 50, scaleX: 0.5, scaleY: 0.5, rotation: 0 });
          selectShape('blueprint-bg'); // Auto-seleccionar para mover
          setIsBackgroundLocked(false);
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = () => {
    if (window.confirm("¿Estás seguro de que quieres eliminar la imagen de fondo?")) {
      setBackgroundImage(null);
      setBackgroundBase64(null);
      setBackgroundProps({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
      setIsBackgroundLocked(false);
    }
  };



  // 🧲 Snap magnético a reglas: se llama en onDragMove de símbolos
  const snapToGuidelines = (node: any) => {
    const nx = node.x();
    const ny = node.y();
    guidelines.forEach(g => {
      if (g.orientation === 'V' && Math.abs(nx - g.position) < SNAP_THRESHOLD) {
        node.x(g.position);
      }
      if (g.orientation === 'H' && Math.abs(ny - g.position) < SNAP_THRESHOLD) {
        node.y(g.position);
      }
    });
  };

  const handleSymbolDragEnd = (id: string, e: any) => {
    const x = e.target.x();
    const y = e.target.y();

    setSymbols(prev => prev.map(s => {
      if (s.id !== id) return s;

      // Si el símbolo tiene puntos (línea/flecha), horneamos el desplazamiento en ellos
      if (s.points) {
        const newPoints = [
          s.points[0] + x,
          s.points[1] + y,
          s.points[2] + x,
          s.points[3] + y
        ];

        // Resetear la posición local del nodo de Konva para evitar saltos
        e.target.x(0);
        e.target.y(0);

        return { ...s, points: newPoints, x: 0, y: 0 };
      }

      return { ...s, x, y };
    }));
  };

  // --- CLICS ---

  const updateLinePoint = (id: string, type: 'wall' | 'aux' | 'pipe' | 'geom', pointIndex: 0 | 1 | 2, newX: number, newY: number) => {
    if (type === 'wall') {
      setWalls(prev => prev.map(w => w.id !== id ? w : { ...w, points: pointIndex === 0 ? [newX, newY, w.points[2], w.points[3]] : [w.points[0], w.points[1], newX, newY] }));
    } else if (type === 'aux') {
      setAuxLines(prev => prev.map(a => a.id !== id ? a : { ...a, points: pointIndex === 0 ? [newX, newY, a.points[2], a.points[3]] : [a.points[0], a.points[1], newX, newY] }));
    } else if (type === 'pipe') {
      setPipes(prev => prev.map(p => {
        if (p.id !== id) return p;
        if (pointIndex === 1) {
          // Actualizar punto de control
          return { ...p, controlPoint: { x: newX, y: newY } };
        } else {
          // Actualizar extremos
          const newPoints = pointIndex === 0
            ? [newX, newY, p.points[2], p.points[3]]
            : [p.points[0], p.points[1], newX, newY];
          return { ...p, points: newPoints };
        }
      }));
    } else if (type === 'geom') {
      setSymbols(prev => prev.map(s => {
        if (s.id !== id || !s.points) return s;
        const newPoints = [...s.points];
        // El punto guardado es relativo a la posición (x,y) del símbolo
        if (pointIndex === 0) {
          newPoints[0] = newX - (s.x || 0);
          newPoints[1] = newY - (s.y || 0);
        } else {
          newPoints[2] = newX - (s.x || 0);
          newPoints[3] = newY - (s.y || 0);
        }
        return { ...s, points: newPoints };
      }));
    }
  };

  // 📐 Renderizar reglas magnéticas graduadas (como Word/Illustrator)
  const renderGuidelines = () => {
    const floor = getCurrentFloor();
    const { width: uWmm, height: uHmm } = getUsableDimensions(
      floor?.format.widthMm || 297,
      floor?.format.heightMm || 210
    );
    const sheetW = mmToPixels(uWmm);
    const sheetH = mmToPixels(uHmm);
    const RULER_W = 18; // Ancho de la regla en px
    const TICK_COLOR = '#475569';
    const RULER_BG = '#fef9c3'; // Amarillo claro (aspecto regla)
    const RULER_BORDER = '#d97706';

    return guidelines.map(g => {
      const isH = g.orientation === 'H';
      const pos = g.position;

      // Ticks cada 10px, mayor cada 50px
      const ticks: JSX.Element[] = [];
      const span = isH ? sheetW : sheetH;
      for (let t = 0; t <= span; t += 10) {
        const isMajor = t % 50 === 0;
        const tickLen = isMajor ? RULER_W * 0.55 : RULER_W * 0.28;
        if (isH) {
          ticks.push(
            <Line key={`t${t}`} points={[t, 0, t, tickLen]} stroke={TICK_COLOR} strokeWidth={isMajor ? 1 : 0.5} listening={false} />
          );
          if (isMajor && t > 0) {
            ticks.push(
              <Text key={`l${t}`} x={t + 2} y={1} text={`${t}`} fontSize={6} fill={TICK_COLOR} listening={false} />
            );
          }
        } else {
          ticks.push(
            <Line key={`t${t}`} points={[0, t, tickLen, t]} stroke={TICK_COLOR} strokeWidth={isMajor ? 1 : 0.5} listening={false} />
          );
          if (isMajor && t > 0) {
            ticks.push(
              <Text key={`l${t}`} x={1} y={t + 2} text={`${t}`} fontSize={6} fill={TICK_COLOR} listening={false} />
            );
          }
        }
      }

      return (
        <Group
          key={g.id}
          x={isH ? 0 : pos}
          y={isH ? pos : 0}
          draggable
          onDragMove={(e) => {
            const newPos = isH ? e.target.y() : e.target.x();
            // Constrain drag axis
            if (isH) { e.target.x(0); } else { e.target.y(0); }
            setGuidelines(prev => prev.map(gl => gl.id === g.id ? { ...gl, position: newPos } : gl));
          }}
          onDblClick={() => setGuidelines(prev => prev.filter(gl => gl.id !== g.id))}
          onDblTap={() => setGuidelines(prev => prev.filter(gl => gl.id !== g.id))}
        >
          {/* Línea de snap (delgada, a través de toda la hoja) */}
          {isH
            ? <Line points={[0, RULER_W / 2, sheetW, RULER_W / 2]} stroke={RULER_BORDER} strokeWidth={1} dash={[6, 3]} opacity={0.5} listening={false} />
            : <Line points={[RULER_W / 2, 0, RULER_W / 2, sheetH]} stroke={RULER_BORDER} strokeWidth={1} dash={[6, 3]} opacity={0.5} listening={false} />
          }
          {/* Cuerpo de la regla */}
          <Rect
            x={0} y={0}
            width={isH ? sheetW : RULER_W}
            height={isH ? RULER_W : sheetH}
            fill={RULER_BG}
            stroke={RULER_BORDER}
            strokeWidth={1}
            opacity={0.88}
            cornerRadius={0}
          />
          {/* Ticks y números */}
          {ticks}
          {/* Etiqueta de posición */}
          <Text
            x={isH ? sheetW - 35 : 1}
            y={isH ? 6 : sheetH - 20}
            text={`${Math.round(pos)}px`}
            fontSize={7}
            fontStyle="bold"
            fill={RULER_BORDER}
            listening={false}
          />
        </Group>
      );
    });
  };

  const renderGrid = () => {
    const floor = getCurrentFloor();
    // Dimensiones útiles (sin márgenes)
    const { width: uWmm, height: uHmm } = getUsableDimensions(
      floor?.format.widthMm || 297,
      floor?.format.heightMm || 210
    );
    const sheetW = mmToPixels(uWmm);
    const sheetH = mmToPixels(uHmm);

    const lines = [];
    const minorStep = 10;
    const majorStep = 50;

    // Líneas secundarias (cada 10px) - Muy sutiles
    for (let i = 0; i <= sheetW; i += minorStep) {
      if (i % majorStep === 0) continue;
      lines.push(
        <Line
          key={`vm${i}`}
          points={[i, 0, i, sheetH]}
          stroke="#f8fafc"
          strokeWidth={0.5}
          strokeScaleEnabled={false}
          listening={false}
        />
      );
    }
    for (let j = 0; j <= sheetH; j += minorStep) {
      if (j % majorStep === 0) continue;
      lines.push(
        <Line
          key={`hm${j}`}
          points={[0, j, sheetW, j]}
          stroke="#f8fafc"
          strokeWidth={0.5}
          strokeScaleEnabled={false}
          listening={false}
        />
      );
    }

    // Líneas principales (cada 50px) - Referencia tipo Hoja Milimetrada
    for (let i = 0; i <= sheetW; i += majorStep) {
      lines.push(
        <Line
          key={`vM${i}`}
          points={[i, 0, i, sheetH]}
          stroke="#e2e8f0"
          strokeWidth={1}
          strokeScaleEnabled={false}
          listening={false}
        />
      );
    }
    for (let j = 0; j <= sheetH; j += majorStep) {
      lines.push(
        <Line
          key={`hM${j}`}
          points={[0, j, sheetW, j]}
          stroke="#e2e8f0"
          strokeWidth={1}
          strokeScaleEnabled={false}
          listening={false}
        />
      );
    }

    return <Group name="grid">{lines}</Group>;
  };

  const renderSelectionNodes = () => {
    if (!selectedId || tool !== 'select') return null;
    const selectedWall = walls.find(w => w.id === selectedId);
    const selectedAux = auxLines.find(a => a.id === selectedId);
    const selectedPipe = pipes.find(p => p.id === selectedId);
    const selectedGeom = symbols.find(s => s.id === selectedId && (s.type === 'line' || s.type === 'arrow'));

    if (selectedWall) {
      return (
        <>
          <Circle x={selectedWall.points[0]} y={selectedWall.points[1]} radius={6} fill="#3b82f6" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedWall.id, 'wall', 0, pos.x, pos.y); }} />
          <Circle x={selectedWall.points[2]} y={selectedWall.points[3]} radius={6} fill="#3b82f6" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedWall.id, 'wall', 2, pos.x, pos.y); }} />
        </>
      );
    }
    if (selectedAux) {
      return (
        <>
          <Circle x={selectedAux.points[0]} y={selectedAux.points[1]} radius={5} fill="#22c55e" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedAux.id, 'aux', 0, pos.x, pos.y); }} />
          <Circle x={selectedAux.points[2]} y={selectedAux.points[3]} radius={5} fill="#22c55e" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedAux.id, 'aux', 2, pos.x, pos.y); }} />
        </>
      );
    }
    if (selectedPipe) {
      const cp = selectedPipe.controlPoint || {
        x: (selectedPipe.points[0] + selectedPipe.points[2]) / 2,
        y: (selectedPipe.points[1] + selectedPipe.points[3]) / 2 + 30
      };

      return (
        <>
          <Circle x={selectedPipe.points[0]} y={selectedPipe.points[1]} radius={5} fill="#ef4444" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedPipe.id, 'pipe', 0, pos.x, pos.y); }} />
          {selectedPipe.type === 'curved' && (
            <Circle x={cp.x} y={cp.y} radius={5} fill="#f59e0b" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedPipe.id, 'pipe', 1, pos.x, pos.y); }} />
          )}
          <Circle x={selectedPipe.points[2]} y={selectedPipe.points[3]} radius={5} fill="#ef4444" stroke="white" strokeWidth={2} draggable onDragMove={(e) => { const pos = e.target.position(); updateLinePoint(selectedPipe.id, 'pipe', 2, pos.x, pos.y); }} />
        </>
      );
    }
    if (selectedGeom && selectedGeom.points) {
      return (
        <>
          <Circle
            x={(selectedGeom.x || 0) + selectedGeom.points[0]}
            y={(selectedGeom.y || 0) + selectedGeom.points[1]}
            radius={6} fill="#3b82f6" stroke="white" strokeWidth={2}
            draggable
            onDragMove={(e) => {
              const pos = e.target.position();
              updateLinePoint(selectedGeom.id, 'geom', 0, pos.x, pos.y);
            }}
          />
          <Circle
            x={(selectedGeom.x || 0) + selectedGeom.points[2]}
            y={(selectedGeom.y || 0) + selectedGeom.points[3]}
            radius={6} fill="#3b82f6" stroke="white" strokeWidth={2}
            draggable
            onDragMove={(e) => {
              const pos = e.target.position();
              updateLinePoint(selectedGeom.id, 'geom', 2, pos.x, pos.y);
            }}
          />
        </>
      );
    }
    return null;
  };

  const renderSymbol = (sym: SymbolItem) => {
    if (!sym) return null;

    // Validar bloqueo de capa
    const layer = getCurrentFloor()?.layers.find(l => l.id === sym.layer);
    const isLocked = layer?.locked || false;

    // Casos especiales que no están en el catálogo
    if (sym.type === 'text' || sym.type === 'label') {
      return (
        <Text
          key={sym.id}
          id={sym.id}
          x={sym.x}
          y={sym.y}
          text={sym.label || "Texto"}
          fontSize={sym.fontSize || 12}
          fill={sym.color || "black"}
          draggable={tool === 'select' && !isLocked}
          rotation={sym.rotation || 0}
          scaleX={sym.scaleX || 1}
          scaleY={sym.scaleY || 1}
          onDragMove={(e) => snapToGuidelines(e.target)}
          onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
          onClick={(e) => { e.cancelBubble = true; if (tool === 'select') selectShape(sym.id); }}
          onDblClick={(e) => { e.cancelBubble = true; handleUpdateLabel(sym.id, sym.label); }}
          opacity={sym.nature === 'relevado' ? NATURE_OPACITY.relevado : NATURE_OPACITY.proyectado}
        />
      );
    }

    if (sym.type === 'table') {
      return (
        <Group
          key={sym.id}
          id={sym.id}
          x={sym.x}
          y={sym.y}
          draggable={tool === 'select' && !isLocked}
          rotation={sym.rotation || 0}
          scaleX={sym.scaleX || 1}
          scaleY={sym.scaleY || 1}
          onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
          onClick={() => tool === 'select' && selectShape(sym.id)}
        >
          <Rect x={0} y={0} width={200} height={150} fill="white" stroke="black" strokeWidth={1} />
          <Line points={[100, 0, 100, 150]} stroke="black" strokeWidth={1} />
          <Line points={[0, 30, 200, 30]} stroke="black" strokeWidth={1} />
          <Line points={[0, 60, 200, 60]} stroke="black" strokeWidth={1} />
          <Line points={[0, 90, 200, 90]} stroke="black" strokeWidth={1} />
          <Line points={[0, 120, 200, 120]} stroke="black" strokeWidth={1} />
        </Group>
      );
    }

    // ✅ RENDERIZADO DE GEOMETRÍA BÁSICA (DOCK GEOM)
    if (['rect', 'circle', 'triangle', 'line', 'arrow'].includes(sym.type)) {
      const color = sym.color || currentCircuitColor;
      const lineType = sym.lineType || 'solid';
      const isSolid = sym.isSolid || false;
      const opacity = sym.nature === 'relevado' ? NATURE_OPACITY.relevado : NATURE_OPACITY.proyectado;

      const strokeDash = lineType === 'dashed' ? [10, 5] :
        lineType === 'dotted' ? [2, 4] :
          lineType === 'symmetry' ? [20, 5, 5, 5] : [];

      return (
        <Group
          key={sym.id}
          id={sym.id}
          x={sym.x}
          y={sym.y}
          rotation={sym.rotation || 0}
          scaleX={sym.scaleX || 1}
          scaleY={sym.scaleY || 1}
          draggable={tool === 'select' && !isLocked}
          onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
          onClick={(e) => { e.cancelBubble = true; if (tool === 'select') selectShape(sym.id); }}
          onTap={(e) => { e.cancelBubble = true; if (tool === 'select') selectShape(sym.id); }}
          opacity={opacity}
        >
          {sym.type === 'rect' && (
            <Rect
              x={-25} y={-25} width={50} height={50}
              stroke={color} strokeWidth={2}
              fill={isSolid ? color : undefined}
              fillEnabled={isSolid}
              dash={strokeDash}
              strokeScaleEnabled={false}
              hitStrokeWidth={10}
            />
          )}
          {sym.type === 'circle' && (
            <Circle
              radius={25}
              stroke={color} strokeWidth={2}
              fill={isSolid ? color : undefined}
              fillEnabled={isSolid}
              dash={strokeDash}
              strokeScaleEnabled={false}
              hitStrokeWidth={10}
            />
          )}
          {sym.type === 'triangle' && (
            <Path
              data="M 0 -25 L 25 25 L -25 25 Z"
              stroke={color} strokeWidth={2}
              fill={isSolid ? color : undefined}
              fillEnabled={isSolid}
              dash={strokeDash}
              strokeScaleEnabled={false}
              hitStrokeWidth={10}
            />
          )}
          {sym.type === 'line' && (
            <Line
              points={sym.points || [-25, 0, 25, 0]}
              stroke={color} strokeWidth={2}
              dash={strokeDash}
              strokeScaleEnabled={false}
              hitStrokeWidth={10}
            />
          )}
          {sym.type === 'arrow' && (
            <Arrow
              points={sym.points || [-25, 0, 25, 0]}
              stroke={color} strokeWidth={2}
              fill={color}
              dash={strokeDash}
              strokeScaleEnabled={false}
              hitStrokeWidth={10}
              pointerLength={10}
              pointerWidth={10}
            />
          )}
        </Group>
      );
    }

    // ✅ RENDERIZADO DINÁMICO DESDE CATÁLOGO
    if (!activeCatalog) {
      // Si el catálogo aún no cargó, mostrar placeholder
      return (
        <Group
          key={sym.id}
          id={sym.id}
          x={sym.x}
          y={sym.y}
          draggable={tool === 'select' && !isLocked}
          rotation={sym.rotation || 0}
          scaleX={sym.scaleX || 1}
          scaleY={sym.scaleY || 1}
          onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
          onClick={() => tool === 'select' && selectShape(sym.id)}
        >
          <Circle radius={8} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
        </Group>
      );
    }

    // Buscar símbolo en el catálogo
    const symbolDef = activeCatalog.symbols.find(s => s.id === sym.type);

    if (!symbolDef) {
      // Símbolo no encontrado en catálogo, mostrar símbolo genérico
      console.warn(`⚠️ Símbolo "${sym.type}" no encontrado en catálogo`);
      return (
        <Group
          key={sym.id}
          id={sym.id}
          x={sym.x}
          y={sym.y}
          draggable={tool === 'select' && !isLocked}
          rotation={sym.rotation || 0}
          scaleX={sym.scaleX || 1}
          scaleY={sym.scaleY || 1}
          onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
          onClick={() => tool === 'select' && selectShape(sym.id)}
        >
          <Rect x={-10} y={-10} width={20} height={20} stroke="#000000" strokeWidth={2} fill="white" />
          {sym.label && <Text text={sym.label} fontSize={10} x={12} y={-5} fill="#64748b" />}
        </Group>
      );
    }

    // Modificador de escala selectivo para Modo Unifilar (Achicar 40% -> Escala 0.6)
    const unifilarScale = activeMode === 'singleLine' ? 0.6 : 1;

    // Renderizar símbolo usando definición del catálogo
    return (
      <Group
        key={sym.id}
        id={sym.id}
        x={sym.x}
        y={sym.y}
        rotation={sym.rotation || 0}
        scaleX={(sym.scaleX || 1) * unifilarScale}
        scaleY={(sym.scaleY || 1) * unifilarScale}
        draggable={tool === 'select'}
        onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
        onClick={() => tool === 'select' && selectShape(sym.id)}
        onTap={() => tool === 'select' && selectShape(sym.id)}
      >
        <Path
          data={symbolDef.svgPath}
          stroke={sym.nature === 'relevado' ? NATURE_COLORS.relevado.stroke : symbolDef.strokeColor}
          strokeWidth={2}
          fill={sym.nature === 'relevado' ? NATURE_COLORS.relevado.fill : (symbolDef.fillColor || 'transparent')}
          lineCap="round"
          lineJoin="round"
          opacity={sym.nature === 'relevado' ? NATURE_OPACITY.relevado : NATURE_OPACITY.proyectado}
        />
        {/* Renderizado de Textos Embebidos (parte del diseño del símbolo) */}
        {symbolDef.textElements?.map((te, idx) => (
          <Text
            key={`te-${idx}`}
            text={te.text}
            x={te.x}
            y={te.y}
            width={te.width} // 🆕 Soporte para ancho
            align={te.align || 'center'} // 🆕 Soporte para alineación
            fontSize={te.fontSize}
            fontStyle={te.fontStyle}
            fill={te.fill || symbolDef.strokeColor}
            rotation={-1 * (sym.rotation || 0)} // Mantener texto horizontal respecto al papel
            verticalAlign="middle"
          />
        ))}

        {/* Etiqueta de Usuario (Nombre del circuito, etc.) */}
        {sym.label && (
          <Text
            text={sym.label}
            fontSize={10}
            x={15}
            y={15}
            rotation={-1 * (sym.rotation || 0)}
            fill="#64748b"
          />
        )}
      </Group>
    );
  };

  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  const handleGenerateFinalPDF = () => {
    setShowExportModal(false);
    if (!stageRef.current) return;
    const oldScale = stageRef.current.scaleX();
    const oldPos = stageRef.current.position();
    stageRef.current.scale({ x: 1, y: 1 }); stageRef.current.position({ x: 0, y: 0 });

    const elementsToHide = ['.grid', '.rotulo-visual', '.paper-shadow', '.paper-bg'];
    elementsToHide.forEach(sel => stageRef.current.findOne(sel)?.hide());
    if (transformerRef.current) transformerRef.current.nodes([]);

    const floor = getCurrentFloor();
    const { width: uWmm, height: uHmm } = getUsableDimensions(
      floor?.format.widthMm || 297,
      floor?.format.heightMm || 210
    );
    const sheetW = mmToPixels(uWmm);
    const sheetH = mmToPixels(uHmm);

    setTimeout(() => {
      try {
        const dataUri = stageRef.current.toDataURL({ pixelRatio: 2, x: 0, y: 0, width: sheetW, height: sheetH });

        stageRef.current.scale({ x: oldScale, y: oldScale }); stageRef.current.position(oldPos);
        elementsToHide.forEach(sel => stageRef.current.findOne(sel)?.show());

        // 1. Crear documento VERTICAL (Para Carátula y Notas)
        const doc = new jsPDF('p', 'mm', 'a4');

        /**
         * ELIMINACIÓN DE PLANTAS
         */
        const coverTitle = activeMode === 'floorPlan' ? 'PLANO DE PLANTA' : 'ESQUEMA UNIFILAR';
        const pdfProjectData = {
          wizardData: {
            config: calculationData?.config || {
              clientName: projectData.projectName || "Sin Nombre",
              ownerDetail: {
                street: projectData.address || "",
                city: "Córdoba"
              }
            }
          }
        };

        // 3. PÁGINA 1: Carátula (Agrega Page 2 automáticamente al final)
        // @ts-ignore
        addPDFCoverPage(doc, coverTitle, pdfProjectData, profileData); // Assuming profileData is available in scope

        // 4. PÁGINA 2: NOTAS TÉCNICAS (Ya estamos en Page 2 creada por addPDFCoverPage)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("NOTAS Y REFERENCIAS TÉCNICAS", 20, 30);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const splitNotes = doc.splitTextToSize(exportNotes, 170);
        doc.text(splitNotes, 20, 45);

        // Tabla Simple de Referencias (Estática por ahora, como solicitado)
        doc.setFont("helvetica", "bold");
        doc.text("REFERENCIAS DE SÍMBOLOS BASICAS", 20, 100);
        // @ts-ignore
        // @ts-ignore
        autoTable(doc, {
          startY: 105,
          head: [['Símbolo', 'Descripción']],
          body: [
            ['M', 'Medidor de Energía'],
            ['TP', 'Tablero Principal'],
            ['TS', 'Tablero Seccional'],
            ['X', 'Boca de Iluminación'],
            ['Ω', 'Tomacorriente'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [52, 73, 94] }
        });

        // 5. [NUEVO] PÁGINA 3 (CONDICIONAL): PLANILLA DE CARGAS (Solo Unifilar)
        if (activeMode === 'singleLine' && calculationData?.calculation) {
          doc.addPage(); // Nueva página vertical (Página 3)

          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("PLANILLA DE CARGAS Y PROTECCIONES", 105, 20, { align: "center" });

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");

          const calc = calculationData.calculation;
          const rows = (calc.circuits || []).map((c: any) => [
            c.id,
            c.type,
            c.description,
            c.bocas,
            `${c.power} VA`,
            c.cable,
            c.breaker
          ]);

          // @ts-ignore
          autoTable(doc, {
            startY: 30,
            head: [['ID', 'Uso', 'Descripción', 'Bocas', 'Potencia', 'Cable', 'Protección']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }, // Blue header for specialized table
            foot: [[
              { content: 'TOTALES', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
              { content: `DPMS: ${calc.dpmsTotal?.toFixed(0) || '-'} VA`, styles: { fontStyle: 'bold' } },
              { content: `In: ${calc.current?.toFixed(1) || '-'} A`, colSpan: 2, styles: { fontStyle: 'bold' } }
            ]]
          });
        }

        // 6. PÁGINA FINAL: EL DIBUJO (Dinamizado)
        const format = floor?.format.name.toLowerCase() || 'a4';
        const orientation = floor?.format.orientation === 'landscape' ? 'l' : 'p';
        doc.addPage(format as any, orientation);

        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        // Dimensiones útiles según IRAM_MARGINS
        const { width: iw, height: ih } = getUsableDimensions(pw, ph);
        const ix = IRAM_MARGINS.left;
        const iy = IRAM_MARGINS.top;

        // Captura e inserción exacta
        doc.addImage(dataUri, 'PNG', ix, iy, iw, ih);

        // Marco exterior
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(ix, iy, iw, ih);

        // Rótulo del Plano IRAM 4508 (Esquina inferior derecha del área de dibujo)
        const rbW = TITLE_BLOCK_CONFIG.width;
        const rbH = TITLE_BLOCK_CONFIG.height;
        const rx = (ix + iw) - rbW;
        const ry = (iy + ih) - rbH;
        const calculatedScale = calculateStandardScale(pixelsPerMeter);

        doc.setDrawColor(0);
        doc.setFillColor(255, 255, 255);
        doc.rect(rx, ry, rbW, rbH, 'FD');

        TITLE_BLOCK_CONFIG.cells.forEach(cell => {
          const cx = rx + cell.x;
          const cy = ry + cell.y;
          const cw = cell.width;
          const ch = cell.height;

          // Borde de celda
          doc.setLineWidth(0.2);
          doc.rect(cx, cy, cw, ch);

          // Etiqueta (Label)
          doc.setFontSize(5);
          doc.setTextColor(100);
          doc.setFont("helvetica", "italic");
          doc.text(cell.label, cx + 1, cy + 3);

          // Valor
          let value = "";
          if (cell.dataKey === 'calculatedScale') value = calculatedScale;
          else if (cell.dataKey === 'clientName') value = calculationData?.config?.clientName || "---";
          else value = (projectData as any)[cell.dataKey || ""] || "";

          doc.setFontSize(cell.fontSize * 0.7);
          doc.setTextColor(0);
          doc.setFont("helvetica", cell.isBold ? "bold" : "normal");

          const textValue = String(value).substring(0, 45);

          if (cell.align === 'center') {
            doc.text(textValue, cx + (cw / 2), cy + (ch / 2) + 2, { align: 'center' });
          } else {
            doc.text(textValue, cx + 1, cy + (ch / 2) + 2);
          }
        });

        doc.save(`plano_${activeMode}_${projectData.projectName || 'proyecto'}.pdf`);
      } catch (e) {
        console.error("PDF Error", e);
        stageRef.current.scale({ x: oldScale, y: oldScale }); stageRef.current.position(oldPos);
        elementsToHide.forEach(sel => stageRef.current.findOne(sel)?.show());
      }
    }, 100);
  };

  const deleteSelected = () => handleDeleteSelected();
  const clearAll = () => handleClearAll();
  const handleCalibrate = () => { setTool('calibrate'); alert("DIBUJA UNA LÍNEA sobre una medida conocida."); };
  const handleUploadImage = (file: File) => handleImageUpload(file);
  const calibrationMeters = 100 / pixelsPerMeter; // Assuming 100px is the reference for scaleText

  // 🆕 ETAPA 4: Función para regenerar el diagrama unifilar manualmente
  const handleRegenerateUnifilar = () => {
    if (!calculationData?.config) {
      alert("No hay datos del Wizard para generar el diagrama.");
      return;
    }

    const confirm = window.confirm(
      "¿Deseas borrar tu diagrama unifilar actual y regenerarlo automáticamente desde el origen?\n\n⚠️ ¡Perderás cualquier reorganización o dibujo manual que hayas hecho en el layout!"
    );

    if (confirm) {
      console.log('⚡ Regenerando diagrama unifilar a petición del usuario...');

      // Obtener formato de hoja actual
      const currentFloor = floors.find(f => f.id === currentFloorId);
      const sheetFormat = currentFloor?.format;

      try {
        // Generar símbolos y conexiones desde la configuración del Wizard
        const { symbols: generatedSymbols, pipes: generatedPipes } = generateUnifilarDiagram(calculationData.config, {
          sheetFormat,
          startX: 400,
          startY: 200,
          verticalSpacing: 80,
          horizontalSpacing: 300
        });

        // Limpiar completamente la "planta" / "vista" actual (que es el SingleLine de memoria)
        setSymbols([]);
        setPipes([]);

        // Asignar los nuevos
        if (generatedSymbols.length > 0) setSymbols(generatedSymbols);
        if (generatedPipes.length > 0) setPipes(generatedPipes);

        console.log('✅ Diagrama unifilar regenerado con éxito');
      } catch (error) {
        console.error('❌ Error regenerando diagrama unifilar:', error);
        alert("Ocurrió un error al intentar regenerar el diagrama.");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans">
      {/* BARRA SUPERIOR (LA MANO) */}
      <PlannerSidebar
        tool={tool}
        setTool={setTool}
        activeMode={activeMode}
        setActiveMode={handleSwitchMode} // 🆕 Usar handleSwitchMode para guardar/restaurar estado
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onOpenReport={() => setShowMaterialModal(true)}
        onOpenProjectInfo={() => setShowProjectInfoModal(true)}
        onDownloadPDF={() => setShowExportModal(true)}
        onSave={handleSaveProject} // 🛠️ CORRECCIÓN: Usar la función wrapper local envés de la desestructurada del hook directamente
        onRegenerateUnifilar={handleRegenerateUnifilar} // 🆕 Pasar función de regeneración
        onBack={() => navigate('/dashboard')}
        onOpenWizard={() => {
          sessionStorage.setItem('openWizardOnDashboard', 'true');
          navigate('/dashboard');
        }}
        estadoObra={estadoObra}
      />

      {/* ÁREA PRINCIPAL: CANVAS + EL CEREBRO */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* BARRA DE HERRAMIENTAS IZQUIERDA (DIBUJO) */}
        <PlannerToolbar
          tool={tool}
          setTool={setTool}
          currentCircuitColor={currentCircuitColor}
          setCurrentCircuitColor={setCurrentCircuitColor}
          currentPipeType={currentPipeType}
          setCurrentPipeType={setCurrentPipeType}
          currentPipeDashMode={currentPipeDashMode}
          setCurrentPipeDashMode={setCurrentPipeDashMode}
          onDownloadPDF={() => setShowExportModal(true)}
          onDeleteSelected={deleteSelected}
          onClearAll={clearAll}
          onCalibrate={handleCalibrate}
          scaleText={`100px = ${calibrationMeters.toFixed(2)}m`}
          onUploadImage={handleUploadImage}
          isBackgroundLocked={isBackgroundLocked}
          onToggleLock={() => setIsBackgroundLocked(!isBackgroundLocked)}
          hasBackgroundImage={!!backgroundImage}
          onDeleteImage={handleDeleteImage}
        />

        {/* CONTENEDOR DEL LIENZO (65% o 100%) - REGLA 35/65 */}
        <div
          className={`relative transition-all duration-500 ease-in-out bg-slate-200 shadow-inner flex flex-col ${isVisionPanelCollapsed ? 'flex-1' : 'w-[65%]'
            }`}
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        >
          {/* Tabs de Plantas (Piso) */}
          <div className="bg-slate-50/50 border-b border-slate-200 px-2 py-0 flex items-center justify-between min-h-[32px]">
            <FloorTabs
              floors={floors}
              currentFloorId={currentFloorId}
              onFloorChange={setCurrentFloorId}
              onEditFloor={(id) => {
                setEditingFloorId(id);
                setShowEditFloorModal(true);
              }}
              onAddFloor={() => setShowNewFloorModal(true)}
              activeLayer={(() => {
                const floor = getCurrentFloor();
                const layer = floor?.layers.find(l => l.id === currentLayerId);
                return layer ? { name: layer.name, color: layer.color } : undefined;
              })()}
              onClickIndicator={() => {
                setVisionActiveTab('layers');
                setIsVisionPanelCollapsed(false);
              }}
            />
            <div className="flex gap-2 px-2 items-center">
              {/* BOTONES REGLAS MAGNÉTICAS */}
              <div className="flex gap-1" title="Reglas magnéticas · Arrastrar para mover · Doble-click para eliminar">
                <button
                  onClick={() => {
                    const floor = getCurrentFloor();
                    const { height: uHmm } = getUsableDimensions(floor?.format.widthMm || 297, floor?.format.heightMm || 210);
                    const centerY = mmToPixels(uHmm) / 2;
                    setGuidelines(prev => [...prev, { id: `g-${Date.now()}`, orientation: 'H', position: centerY }]);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-all"
                  title="Agregar Regla Horizontal (magnética)"
                >
                  <span>━</span> Regla H
                </button>
                <button
                  onClick={() => {
                    const floor = getCurrentFloor();
                    const { width: uWmm } = getUsableDimensions(floor?.format.widthMm || 297, floor?.format.heightMm || 210);
                    const centerX = mmToPixels(uWmm) / 2;
                    setGuidelines(prev => [...prev, { id: `g-${Date.now()}`, orientation: 'V', position: centerX }]);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-all"
                  title="Agregar Regla Vertical (magnética)"
                >
                  <span>┃</span> Regla V
                </button>
                {guidelines.length > 0 && (
                  <button
                    onClick={() => setGuidelines([])}
                    className="px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 border border-red-200 rounded-md transition-all"
                    title="Eliminar todas las reglas"
                  >
                    ✕ Reglas
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsVisionPanelCollapsed(!isVisionPanelCollapsed)}
                className="p-1 text-slate-500 hover:bg-slate-100 rounded-md transition-all md:hidden"
                title="Toggle Sidebar"
              >
                <Calculator className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-hidden relative"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          >
            <Stage
              width={window.innerWidth * (isVisionPanelCollapsed ? 1 : 0.65)}
              height={window.innerHeight - 140}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              draggable={tool === 'select' && !selectedId}
              ref={stageRef}
            >
              <Layer>
                {(() => {
                  const floor = getCurrentFloor();
                  const { width: uWmm, height: uHmm } = getUsableDimensions(
                    floor?.format.widthMm || 297,
                    floor?.format.heightMm || 210
                  );
                  const sheetW = mmToPixels(uWmm);
                  const sheetH = mmToPixels(uHmm);
                  return (
                    <>
                      <Rect x={4} y={4} width={sheetW} height={sheetH} fill="black" opacity={0.1} cornerRadius={2} blurRadius={10} name="paper-shadow" listening={false} />
                      <Rect
                        x={0}
                        y={0}
                        width={sheetW}
                        height={sheetH}
                        fill="white"
                        name="paper-bg"
                        listening={!isBackgroundLocked} // CRÍTICO: Si está bloqueado, clics pasan a través
                      />
                    </>
                  );
                })()}

                {/* CAPA DE FONDO (BLUEPRINT) - SOLO EN FLOORPLAN */}
                {backgroundImage && activeMode === 'floorPlan' && (
                  <KonvaImage
                    id="blueprint-bg"
                    image={backgroundImage}
                    x={backgroundProps.x}
                    y={backgroundProps.y}
                    scaleX={backgroundProps.scaleX}
                    scaleY={backgroundProps.scaleY}
                    rotation={backgroundProps.rotation}
                    draggable={!isBackgroundLocked && tool === 'select'}
                    opacity={0.5} // Semi-transparente para calcar fácil
                    name="blueprint"
                    onDragEnd={(e) => {
                      setBackgroundProps({
                        ...backgroundProps,
                        x: e.target.x(),
                        y: e.target.y()
                      });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      setBackgroundProps({
                        x: node.x(),
                        y: node.y(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                        rotation: node.rotation()
                      });
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (!isBackgroundLocked && tool === 'select') {
                        selectShape('blueprint-bg');
                      }
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      if (!isBackgroundLocked && tool === 'select') {
                        selectShape('blueprint-bg');
                      }
                    }}
                    listening={!isBackgroundLocked} // CRÍTICO: Si está bloqueado, clics pasan a través
                  />
                )}

                {renderGrid()}
                {/* REGLAS MAGNÉTICAS GRADUADAS */}
                {renderGuidelines()}

                {/* RÓTULO DINÁMICO IRAM 4508 */}
                {(() => {
                  const floor = getCurrentFloor();
                  const { width: uWmm, height: uHmm } = getUsableDimensions(
                    floor?.format.widthMm || 297,
                    floor?.format.heightMm || 210
                  );
                  const sheetW = mmToPixels(uWmm);
                  const sheetH = mmToPixels(uHmm);

                  const rWidth = mmToPixels(TITLE_BLOCK_CONFIG.width);
                  const rHeight = mmToPixels(TITLE_BLOCK_CONFIG.height);
                  const calculatedScale = calculateStandardScale(pixelsPerMeter);

                  return (
                    <Group x={sheetW - rWidth} y={sheetH - rHeight} name="rotulo-visual" listening={false}>
                      <Rect width={rWidth} height={rHeight} stroke="black" strokeWidth={1} fill="white" />
                      {TITLE_BLOCK_CONFIG.cells.map(cell => {
                        const cx = mmToPixels(cell.x);
                        const cy = mmToPixels(cell.y);
                        const cw = mmToPixels(cell.width);
                        const ch = mmToPixels(cell.height);

                        let value = "";
                        if (cell.dataKey === 'calculatedScale') value = calculatedScale;
                        else if (cell.dataKey === 'clientName') value = calculationData?.config?.clientName || "---";
                        else value = (projectData as any)[cell.dataKey || ""] || "";

                        return (
                          <Group key={cell.id} x={cx} y={cy}>
                            <Rect width={cw} height={ch} stroke="black" strokeWidth={0.5} />
                            <Text text={cell.label} x={2} y={2} fontSize={6} fill="#64748b" fontStyle="italic" />
                            <Text
                              text={value}
                              width={cw - 4}
                              height={ch - 10}
                              x={2}
                              y={10}
                              fontSize={cell.fontSize * 0.8}
                              fontStyle={cell.isBold ? "bold" : "normal"}
                              align={cell.align}
                              verticalAlign="middle"
                              fill="black"
                              wrap="char"
                            />
                          </Group>
                        );
                      })}
                    </Group>
                  );
                })()}

                <Group>
                  {/* GRUPOS DE AMBIENTES (con Transformer) - ORDEN Z: PRIMERO (ABAJO) */}
                  {roomGroups
                    .filter(group => {
                      // Filtrar por visibilidad de capa
                      const layer = getCurrentFloor()?.layers.find(l => l.id === group.layerId);
                      return layer?.visible !== false;
                    })
                    .map(group => {
                      // Obtener capa del grupo
                      const layer = getCurrentFloor()?.layers.find(l => l.id === group.layerId);
                      const isLocked = layer?.locked || false;

                      return (
                        <Group
                          key={group.id}
                          id={group.id}
                          x={group.x}
                          y={group.y}
                          rotation={group.rotation}
                          scaleX={group.scaleX}
                          scaleY={group.scaleY}
                          draggable={tool === 'select' && !isLocked} // No arrastrable si está bloqueado
                          onDragEnd={(e) => {
                            if (isLocked) {
                              e.target.position({ x: group.x, y: group.y });
                              return;
                            }

                            const node = e.target;
                            const newX = node.x();
                            const newY = node.y();

                            // Actualizar posición del grupo
                            setRoomGroups(prev => prev.map(g =>
                              g.id === group.id
                                ? { ...g, x: newX, y: newY }
                                : g
                            ));

                            // Actualizar posición de la etiqueta asociada
                            setSymbols(prev => prev.map(sym =>
                              sym.id === group.labelId
                                ? { ...sym, x: sym.x + newX - group.x, y: sym.y + newY - group.y }
                                : sym
                            ));

                            console.log(`📍 Ambiente movido a: (${newX.toFixed(0)}, ${newY.toFixed(0)})`);
                          }}
                          onClick={(e) => {
                            e.cancelBubble = true;

                            // Validar bloqueo
                            if (isLocked) {
                              alert('⚠️ Capa bloqueada. Desbloquea la capa para editar.');
                              return;
                            }

                            if (tool === 'select') {
                              setSelectedGroupId(group.id);
                              selectShape(group.id);
                              // Adjuntar Transformer al grupo
                              const stage = stageRef.current;
                              if (stage && transformerRef.current) {
                                const node = stage.findOne(`#${group.id}`);
                                if (node) {
                                  transformerRef.current.nodes([node]);
                                  transformerRef.current.getLayer()?.batchDraw();
                                }
                              }
                            }
                          }}
                          onTransformEnd={(e) => {
                            // Validar bloqueo antes de transformar
                            if (isLocked) {
                              e.target.to({ scaleX: group.scaleX, scaleY: group.scaleY, rotation: group.rotation });
                              return;
                            }

                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();

                            // Calcular nuevas dimensiones en píxeles
                            const originalWidthPx = group.originalWidth * pixelsPerMeter;
                            const originalLengthPx = group.originalLength * pixelsPerMeter;

                            const newWidthPx = originalWidthPx * scaleX;
                            const newLengthPx = originalLengthPx * scaleY;

                            // Convertir a metros
                            const newWidthM = (newWidthPx / pixelsPerMeter).toFixed(2);
                            const newLengthM = (newLengthPx / pixelsPerMeter).toFixed(2);
                            const newAreaM = (parseFloat(newWidthM) * parseFloat(newLengthM)).toFixed(2);

                            console.log(`📏 Ambiente redimensionado: ${newWidthM}m × ${newLengthM}m = ${newAreaM}m²`);

                            // Actualizar grupo (Sincronizando metros reales)
                            setRoomGroups(prev => prev.map(g => {
                              if (g.id !== group.id) return g;

                              const widthM = parseFloat(newWidthM);
                              const lengthM = parseFloat(newLengthM);
                              const wPx = widthM * pixelsPerMeter;
                              const lPx = lengthM * pixelsPerMeter;

                              return {
                                ...g,
                                x: node.x(),
                                y: node.y(),
                                rotation: node.rotation(),
                                scaleX: 1, // Resetear escala tras persistir metros
                                scaleY: 1,
                                originalWidth: widthM,
                                originalLength: lengthM,
                                // Actualizar puntos de muros para que coincidan con los nuevos metros en píxeles
                                walls: [
                                  { ...g.walls[0], points: [0, 0, wPx, 0] },         // Top
                                  { ...g.walls[1], points: [wPx, 0, wPx, lPx] },     // Right
                                  { ...g.walls[2], points: [wPx, lPx, 0, lPx] },     // Bottom
                                  { ...g.walls[3], points: [0, lPx, 0, 0] }          // Left
                                ]
                              };
                            }));

                            // Resetear escala del nodo físico para que no haya doble escalado
                            node.scaleX(1);
                            node.scaleY(1);

                            // NOTA: La etiqueta NO se sincroniza en transformaciones (rotar/escalar)
                            // Solo se mueve cuando ARRASTRAS el ambiente (ver onDragEnd)

                            // TODO: Actualizar calculation_data
                          }}
                        >
                          {/* Paredes del grupo */}
                          {group.walls.map(wall => (
                            <Line
                              key={wall.id}
                              points={wall.points}
                              stroke="black"
                              strokeWidth={5}
                              lineCap="round"
                              strokeScaleEnabled={false}
                            />
                          ))}

                          {/* Aberturas del grupo (puertas y ventanas) */}
                          {group.openings?.map((opening) => {
                            const wall = group.walls[opening.wallIndex];
                            if (!wall) return null;

                            // Calcular longitud teórica del muro en metros (0 y 2: ancho, 1 y 3: largo)
                            const wallLengthMeters = (opening.wallIndex % 2 === 0)
                              ? (group.originalWidth || 0)
                              : (group.originalLength || 0);

                            if (opening.type === 'door') {
                              return (
                                <DoorComponent
                                  key={opening.id}
                                  door={opening as any}
                                  wall={wall}
                                  roomGroupX={group.x}
                                  roomGroupY={group.y}
                                  roomGroupRotation={group.rotation}
                                  roomGroupScaleX={group.scaleX}
                                  roomGroupScaleY={group.scaleY}
                                  pixelsPerMeter={pixelsPerMeter}
                                  isSelectMode={tool === 'select'}
                                  isSelected={selectedOpeningId === opening.id}
                                  onUpdatePosition={(pos) => handleOpeningUpdatePosition(group.id, opening.id, pos)}
                                  onSelect={handleOpeningSelect}
                                  onEdit={handleOpeningEdit}
                                />
                              );
                            } else if (opening.type === 'window') {
                              return (
                                <WindowComponent
                                  key={opening.id}
                                  window={opening as any}
                                  wall={wall}
                                  roomGroupX={group.x}
                                  roomGroupY={group.y}
                                  roomGroupRotation={group.rotation}
                                  roomGroupScaleX={group.scaleX}
                                  roomGroupScaleY={group.scaleY}
                                  pixelsPerMeter={pixelsPerMeter}
                                  isSelectMode={tool === 'select'}
                                  isSelected={selectedOpeningId === opening.id}
                                  onUpdatePosition={(pos) => handleOpeningUpdatePosition(group.id, opening.id, pos)}
                                  onSelect={handleOpeningSelect}
                                  onEdit={handleOpeningEdit}
                                />
                              );
                            } else if (opening.type === 'passage') {
                              return (
                                <PassageComponent
                                  key={opening.id}
                                  passage={opening}
                                  wall={wall}
                                  roomGroupX={group.x}
                                  roomGroupY={group.y}
                                  roomGroupRotation={group.rotation}
                                  roomGroupScaleX={group.scaleX}
                                  roomGroupScaleY={group.scaleY}
                                  pixelsPerMeter={pixelsPerMeter}
                                  isSelectMode={tool === 'select'}
                                  isSelected={selectedOpeningId === opening.id}
                                  onUpdatePosition={(pos) => handleOpeningUpdatePosition(group.id, opening.id, pos)}
                                  onSelect={handleOpeningSelect}
                                  onEdit={handleOpeningEdit}
                                />
                              );
                            }
                            return null;
                          })}
                        </Group>
                      );
                    })}

                  {/* COTAS / DIMENSIONES ELIMINADAS DE AQUÍ (Z-ORDER INCORRECTO) */}

                  {/* COTAS PREVIEW (Dibujo) */}
                  {dimensionPreview && dimensionFirstPoint && (
                    <DimensionComponent
                      dimension={{
                        id: 'preview-dim',
                        type: 'dimension',
                        startPoint: dimensionFirstPoint,
                        endPoint: {
                          x: dimensionPreview[2],
                          y: dimensionPreview[3]
                        },
                        distanceMeters: Math.sqrt(
                          Math.pow(dimensionPreview[2] - dimensionFirstPoint.x, 2) +
                          Math.pow(dimensionPreview[3] - dimensionFirstPoint.y, 2)
                        ) / pixelsPerMeter,
                        distancePixels: Math.sqrt(
                          Math.pow(dimensionPreview[2] - dimensionFirstPoint.x, 2) +
                          Math.pow(dimensionPreview[3] - dimensionFirstPoint.y, 2)
                        ),
                        textOffset: 20,
                        layerId: currentLayerId
                      }}
                    />
                  )}

                  {/* Transformer */}

                  {/* PAREDES INDIVIDUALES - ORDEN Z: SEGUNDO (DESPUÉS DE MUROS) */}
                  {walls
                    .filter(w => {
                      // Filtrar por visibilidad de capa
                      const layer = getCurrentFloor()?.layers.find(l => l.id === (w as any).layerId);
                      return layer?.visible !== false;
                    })
                    .map((w, i) => {
                      const layer = getCurrentFloor()?.layers.find(l => l.id === (w as any).layerId);
                      const isLocked = layer?.locked || false;

                      return (
                        <Group
                          key={w.id || i}
                          draggable={tool === 'select' && !isLocked}
                          onDragEnd={(e) => {
                            if (isLocked) {
                              e.target.position({ x: 0, y: 0 });
                              return;
                            }

                            const dx = e.target.x();
                            const dy = e.target.y();

                            // Si la pared tiene groupId, mover todo el grupo
                            if ((w as any).groupId) {
                              const groupId = (w as any).groupId;
                              console.log('🔄 Moviendo grupo:', groupId, 'dx:', dx, 'dy:', dy);

                              // Mover todas las paredes del grupo
                              setWalls(ws => ws.map(item =>
                                (item as any).groupId === groupId
                                  ? { ...item, points: [item.points[0] + dx, item.points[1] + dy, item.points[2] + dx, item.points[3] + dy] }
                                  : item
                              ));

                              // Mover símbolos del grupo (etiqueta)
                              setSymbols(syms => syms.map(sym =>
                                (sym as any).groupId === groupId
                                  ? { ...sym, x: sym.x + dx, y: sym.y + dy }
                                  : sym
                              ));
                            } else {
                              // Pared sin grupo: mover solo esta pared
                              setWalls(ws => ws.map(item =>
                                item.id === w.id
                                  ? { ...item, points: [item.points[0] + dx, item.points[1] + dy, item.points[2] + dx, item.points[3] + dy] }
                                  : item
                              ));
                            }

                            e.target.position({ x: 0, y: 0 });
                          }}
                        >
                          <Line
                            points={w.points}
                            stroke={selectedId === w.id ? "#3b82f6" : (w.nature === 'relevado' ? "#cbd5e1" : "black")}
                            strokeWidth={5}
                            lineCap="round"
                            opacity={w.nature === 'relevado' ? 0.6 : 1}
                            onClick={(e) => {
                              e.cancelBubble = true;
                              if (tool === 'select' && !isLocked) {
                                selectShape(w.id);
                              } else if (isLocked) {
                                alert('⚠️ Capa bloqueada. Desbloquea la capa para editar.');
                              }
                            }}
                          />
                        </Group>
                      );
                    })}
                  {currentWall && <Line points={currentWall} stroke="black" strokeWidth={5} opacity={0.5} />}

                  {/* COTAS/DIMENSIONES - ORDEN Z: DESPUÉS DE PAREDES, ANTES DE PIPES */}
                  {dimensions
                    ?.filter(dim => {
                      // 🆕 Filtrar por visibilidad de capa
                      const layer = getCurrentFloor()?.layers.find(l => l.id === dim.layerId);
                      return layer?.visible !== false;
                    })
                    .map((dimension) => (
                      <DimensionComponent
                        key={dimension.id}
                        dimension={dimension}
                        isSelected={selectedId === dimension.id}
                        onSelect={(id) => selectShape(id)}
                        isSelectMode={tool === 'select'}
                        pixelsPerMeter={pixelsPerMeter}
                      />
                    ))}

                  {/* CAÑERÍAS/PIPES - ORDEN Z: TERCERO (DESPUÉS DE PAREDES) */}
                  {pipes
                    .filter(p => {
                      // Filtrar por visibilidad de capa
                      const layer = getCurrentFloor()?.layers.find(l => l.id === (p as any).layerId);
                      return layer?.visible !== false;
                    })
                    .map((p, i) => {
                      const layer = getCurrentFloor()?.layers.find(l => l.id === (p as any).layerId);
                      const isLocked = layer?.locked || false;
                      const pipeColor = layer?.color || p.color; // Usar color de capa

                      return (
                        <Group
                          key={p.id || i}
                          onClick={(e) => {
                            e.cancelBubble = true;
                            if (tool === 'select' && !isLocked) {
                              selectShape(p.id);
                            } else if (isLocked) {
                              alert('⚠️ Capa bloqueada. Desbloquea la capa para editar.');
                            }
                          }}
                        >
                          {(() => {
                            const circuitMethod = calculationData?.config?.circuitInventoryForCAD?.find(c => c.id === p.circuitId)?.conduit?.method;
                            return (
                              <PipeRenderer
                                pipe={p}
                                {...getPipeStyle(p, selectedId)}
                                dash={getPipeDash(p, circuitMethod)}
                              />
                            );
                          })()}
                        </Group>
                      );
                    })}
                  {currentPipePreview && <Line points={currentPipePreview} stroke={currentCircuitColor} strokeWidth={2} dash={[2, 2]} />}

                  {auxLines.map((l, i) => (
                    <Group key={l.id || i} draggable={tool === 'select'}
                      onDragEnd={(e) => {
                        const x = e.target.x(); const y = e.target.y();
                        setAuxLines(as => as.map(item => item.id === l.id ? { ...item, points: [item.points[0] + x, item.points[1] + y, item.points[2] + x, item.points[3] + y] } : item));
                        e.target.position({ x: 0, y: 0 });
                      }}>
                      <Line points={l.points} stroke={selectedId === l.id ? "#3b82f6" : "#000000"} strokeWidth={3} onClick={(e) => { e.cancelBubble = true; selectShape(l.id); }} />
                    </Group>
                  ))}
                  {currentAuxLine && <Line points={currentAuxLine} stroke="#000000" strokeWidth={3} opacity={0.7} />}

                  {calibrationLine && <Line points={calibrationLine} stroke="red" strokeWidth={2} dash={[5, 5]} />}

                  {/* SÍMBOLOS (LUCES, TOMAS, ETIQUETAS) - ORDEN Z: CUARTO (ARRIBA DE TODO) */}
                  {symbols
                    .filter(sym => {
                      // Filtrar por visibilidad de capa
                      const layer = getCurrentFloor()?.layers.find(l => l.id === sym.layer);
                      return layer?.visible !== false;
                    })
                    .map(renderSymbol)}
                  {renderSelectionNodes()}
                  <Transformer
                    ref={transformerRef}
                    onTransformEnd={() => {
                      const node = transformerRef.current.nodes()[0];
                      if (!node) return;
                      if (node.id() === 'blueprint-bg') return; // Handled in KonvaImage

                      const symbolId = node.id();
                      // Solo actualizamos si es un símbolo (no paredes ni aux)
                      if (symbols.find(s => s.id === symbolId)) {
                        setSymbols(prev => prev.map(s => s.id === symbolId ? {
                          ...s,
                          x: node.x(),
                          y: node.y(),
                          rotation: node.rotation(),
                          scaleX: node.scaleX(),
                          scaleY: node.scaleY()
                        } : s));
                      }
                    }}
                  />
                </Group>
                {/* MODO FANTASMA (GHOST) PARA GEOMETRÍA */}
                {['rect', 'circle', 'triangle', 'line', 'arrow'].includes(tool) && (
                  <Group x={mousePos.x} y={mousePos.y} opacity={0.4} listening={false}>
                    {tool === 'rect' && (
                      <Rect
                        x={-25} y={-25} width={50} height={50}
                        stroke={currentCircuitColor} strokeWidth={2}
                        dash={[5, 5]}
                      />
                    )}
                    {tool === 'circle' && (
                      <Circle
                        radius={25}
                        stroke={currentCircuitColor} strokeWidth={2}
                        dash={[5, 5]}
                      />
                    )}
                    {tool === 'triangle' && (
                      <Line
                        points={[0, -25, 25, 25, -25, 25]}
                        closed
                        stroke={currentCircuitColor} strokeWidth={2}
                        dash={[5, 5]}
                      />
                    )}
                    {tool === 'line' && (
                      <Line
                        points={[-50, 0, 50, 0]}
                        stroke={currentCircuitColor} strokeWidth={2}
                        dash={[5, 5]}
                      />
                    )}
                    {tool === 'arrow' && (
                      <Path
                        data="M -50,0 L 50,0 M 20,-15 L 50,0 L 20,15"
                        stroke={currentCircuitColor} strokeWidth={2}
                        dash={[5, 5]}
                      />
                    )}
                  </Group>
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* EL CEREBRO (VISOR LATERAL UNIFICADO - 35%) */}
        {/* 🆕 Mismo panel para ambos modos, solo cambian las capas disponibles */}
        <PlannerVisionPanel
          calculationData={calculationData}
          symbols={symbols}
          activeMode={activeMode}
          layers={getCurrentFloor()?.layers || []}
          currentLayerId={currentLayerId}
          onLayerChange={setCurrentLayerId}
          onToggleVisibility={toggleLayerVisibility}
          onToggleLock={toggleLayerLock}
          onColorChange={updateLayerColor}
          onRoomDragStart={handleRoomDragStart}
          onRoomSelect={handleRoomSelect}
          isCollapsed={isVisionPanelCollapsed}
          onToggleCollapse={() => setIsVisionPanelCollapsed(!isVisionPanelCollapsed)}
          activeTab={visionActiveTab}
          onTabChange={setVisionActiveTab}
          selectedId={selectedId}
          onUpdateProperty={handleUpdateSymbolProperty}
        />


        <PlannerBottomHub
          tool={tool}
          setTool={setTool}
          activeMode={activeMode}
          activeCategory={activeCategory}
          isCollapsed={isHubCollapsed}
          setIsCollapsed={setIsHubCollapsed}
          onOpeningTool={handleOpeningTool}
          selectedSymbol={selectedSymbol}
          onUpdateSymbol={handleUpdateSymbol}
        />
      </div>

      {/* MODAL DE EXPORTACIÓN (NOTAS) */}
      {
        showExportModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="font-bold text-lg">Exportar Plano PDF</h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notas Técnicas y Referencias (Aparecerán en la Página 2)
                  </label>
                  <textarea
                    value={exportNotes}
                    onChange={(e) => setExportNotes(e.target.value)}
                    className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Ingrese las notas técnicas para el instalador..."
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    * Este texto se incluirá en una hoja dedicada antes del plano, junto con la tabla de referencias básica.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateFinalPDF}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <MaterialReportModal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        symbols={symbols}
        pipes={pipes}
        walls={walls}
        pixelsPerMeter={pixelsPerMeter}
        calculationData={calculationData}
      />
      <ProjectInfoModal isOpen={showProjectInfoModal} onClose={() => setShowProjectInfoModal(false)} onSave={setProjectData} initialData={projectData} />

      {/* Modal Nueva Planta */}
      {
        showNewFloorModal && (
          <NewFloorModal
            onClose={() => setShowNewFloorModal(false)}
            onConfirm={handleAddFloor}
          />
        )
      }

      {/* Modal Editar Planta */}
      {
        showEditFloorModal && editingFloorId && (
          <EditFloorModal
            floor={floors.find(f => f.id === editingFloorId)!}
            onClose={() => {
              setShowEditFloorModal(false);
              setEditingFloorId(null);
            }}
            onConfirm={handleEditFloorConfirm}
            onDelete={handleDeleteFloor}
            canDelete={floors.length > 1 && floors[0].id !== editingFloorId}
          />
        )
      }

      {/* Modal Configurar Abertura (Creación o Edición) */}
      {
        isOpeningConfigOpen && (
          <OpeningConfigModal
            type={editingOpening ? editingOpening.type : openingType}
            initialConfig={editingOpening ? (editingOpening as any) : undefined}
            onClose={() => {
              setIsOpeningConfigOpen(false);
              setEditingOpening(null);
            }}
            onConfirm={editingOpening ? handleOpeningUpdateConfig : handleOpeningConfirmNew}
          />
        )
      }

      {/* PANEL DE PROPIEDADES FLOTANTE (Para Naturaleza) */}
      {
        selectedId && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border-2 border-slate-300 rounded-full shadow-2xl p-1 px-2 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50">
            <span className="text-[10px] font-black uppercase text-slate-500 ml-2">Naturaleza:</span>
            {/* Solo mostrar selector en ampliación/refacción */}
            {calculationData?.config?.estadoObra !== 'nueva' && (
              <div className="flex bg-slate-200 rounded-full p-0.5">
                <button
                  onClick={() => {
                    if (symbols.find(s => s.id === selectedId)) {
                      setSymbols((prev: any[]) => prev.map((s: any) => s.id === selectedId ? { ...s, nature: 'relevado' } : s));
                    } else if (walls.find(w => w.id === selectedId)) {
                      setWalls((prev: any[]) => prev.map((w: any) => w.id === selectedId ? { ...w, nature: 'relevado' } : w));
                    } else if (pipes.find(p => p.id === selectedId)) {
                      setPipes((prev: any[]) => prev.map((p: any) => p.id === selectedId ? { ...p, nature: 'relevado' } : p));
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${(symbols.find(s => s.id === selectedId)?.nature === 'relevado' ||
                    walls.find(w => w.id === selectedId)?.nature === 'relevado' ||
                    pipes.find(p => p.id === selectedId)?.nature === 'relevado')
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  🔍 EXISTENTE
                </button>
                <button
                  onClick={() => {
                    if (symbols.find(s => s.id === selectedId)) {
                      setSymbols(prev => prev.map(s => s.id === selectedId ? { ...s, nature: 'proyectado' } : s));
                    } else if (walls.find(w => w.id === selectedId)) {
                      setWalls(prev => prev.map(w => w.id === selectedId ? { ...w, nature: 'proyectado' } : w));
                    } else if (pipes.find(p => p.id === selectedId)) {
                      setPipes(prev => prev.map(p => p.id === selectedId ? { ...p, nature: 'proyectado' } : p));
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${(symbols.find(s => s.id === selectedId)?.nature !== 'relevado')
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  🆕 PROYECTADA
                </button>
              </div>
            )}
            <button
              onClick={() => selectShape(null)}
              className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-full text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      }
    </div >
  );
}
