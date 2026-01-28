import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Line, Transformer, Rect, Circle, Group, Text, Path, Image as KonvaImage } from 'react-konva';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Calculator, Download } from 'lucide-react';
import jsPDF from 'jspdf';

// Componentes hijos
import PlannerToolbar, { type Tool } from './PlannerToolbar';
import PlannerSidebar from './PlannerSidebar';
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

// Generación de Ambientes
import { RightSidebar } from './RightSidebar';
import { DoorComponent } from './DoorComponent';
import { WindowComponent } from './WindowComponent';
import { generateRoomWalls, getRoomCenter } from '../../lib/planner/utils/roomGenerator';

// Sistema de Múltiples Plantas y Capas
import { FloorTabs } from './FloorTabs';
import { LayersPanel } from './LayersPanel';
import { NewFloorModal } from './NewFloorModal';
import { EditFloorModal } from './EditFloorModal';
import { OpeningConfigModal, type DoorConfig, type WindowConfig } from './OpeningConfigModal';
import type { PaperFormat } from '../../types/floors';
import type { Opening } from '../../types/openings';
import { createDoor, createWindow } from '../../types/openings';
import { findNearestWall } from '../../lib/planner/utils/openingGeometry';
import { createDimension } from '../../types/dimensions';
import { DimensionComponent } from './DimensionComponent';

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
  const [projectData, setProjectData] = useState<ProjectData>({
    projectName: '', address: '', installer: '', category: '1:50', date: new Date().toLocaleDateString('es-AR')
  });

  // --- DUAL MODE STATE ---
  const [activeMode, setActiveMode] = useState<'floorPlan' | 'singleLine'>('floorPlan');
  const modeStore = useRef<{
    floorPlan: { symbols: any[]; walls: any[]; pipes: any[]; auxLines: any[]; pixelsPerMeter: number };
    singleLine: { symbols: any[]; walls: any[]; pipes: any[]; auxLines: any[]; pixelsPerMeter: number };
  }>({
    floorPlan: { symbols: [], walls: [], pipes: [], auxLines: [], pixelsPerMeter: 50 },
    singleLine: { symbols: [], walls: [], pipes: [], auxLines: [], pixelsPerMeter: 50 }
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

    // Elementos (compatibilidad)
    symbols,
    walls,
    pipes,
    auxLines,
    roomGroups,
    pixelsPerMeter,
    selectedId,
    setSymbols,
    setWalls,
    setPipes,
    setAuxLines,
    setRoomGroups,
    setPixelsPerMeter,
    selectShape,
    addSymbol,
    addWall,
    addPipe,
    addAuxLine
  } = canvasState;

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showProjectInfoModal, setShowProjectInfoModal] = useState(false);
  const [showNewFloorModal, setShowNewFloorModal] = useState(false);
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingType, setOpeningType] = useState<'door' | 'window'>('door');
  const [openingConfig, setOpeningConfig] = useState<DoorConfig | WindowConfig | null>(null);
  const [dimensionFirstPoint, setDimensionFirstPoint] = useState<{ x: number; y: number } | null>(null);
  const [calculationData, setCalculationData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

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
    "Las cajas de tomacorrientes y llaves se han instalado a 0.40m y 1.10m del NPT respectivamente, salvo indicación en contrario. Se utilizó cañería de PVC ignífugo y conductores normalizados IRAM NM-247-3. El conductor de protección (PE) recorre toda la instalación."
  );

  // --- BLUEPRINT STATE ---
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundBase64, setBackgroundBase64] = useState<string | null>(null);
  const [isBackgroundLocked, setIsBackgroundLocked] = useState(false);
  // Posición inicial del fondo
  const [backgroundProps, setBackgroundProps] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });

  // ZOOM / PAN
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 50, y: 50 });

  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  // ✅ HOOK: Herramientas de Dibujo
  const drawingTools = useDrawingTools(
    {
      tool,
      currentCircuitColor,
      currentPipeType,
      pixelsPerMeter,
      stageRef,
      onCalibrationComplete: (newPixelsPerMeter) => {
        setPixelsPerMeter(newPixelsPerMeter);
        console.log('🎯 Escala actualizada globalmente:', newPixelsPerMeter, 'px/m');
      }
    },
    { addSymbol, addWall, addPipe, addAuxLine, selectShape }
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
    getCursorStyle
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

  // --- EFECTOS ---
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
      const isLine = walls.find(w => w.id === selectedId) || auxLines.find(a => a.id === selectedId);

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
  }, [selectedId, walls, auxLines, isBackgroundLocked]);

  useEffect(() => {
    if (selectedId && currentCircuitColor) {
      setPipes(prev => prev.map(p => p.id === selectedId ? { ...p, color: currentCircuitColor } : p));
    }
  }, [currentCircuitColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace')) handleDeleteSelected();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);


  // Cargar Perfil del Matriculado (para PDF)
  useEffect(() => {
    if (user) {
      ProfileService.getProfile(user.id).then(p => setProfileData(p)).catch(console.error);
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

    // 1. Guardar estado actual en el store antes de persistir
    modeStore.current[activeMode] = { symbols, walls, pipes, auxLines, pixelsPerMeter };

    const drawingData = {
      // Estructura Dual
      floorPlan: modeStore.current.floorPlan,
      singleLine: modeStore.current.singleLine,

      // Fondo Global (asociado a floorPlan conceptualmente, pero guardado en root por simpleza actual o mover a floorPlan)
      // Mantener en root funciona bien para este refactor sin romper todo.
      backgroundBase64,
      backgroundProps
    };

    const projectData = {
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
      // PRESERVAR calculation_data para no perder la receta
      calculation_data: {
        config: calculationData.config,
        environments: calculationData.environments,
        calculation: calculationData.calculation
      }
    };

    try {
      if (projectId && projectId !== 'draft') {
        // ACTUALIZAR PROYECTO EXISTENTE (PlanService)
        // Solo guardamos el dibujo en drawing_data
        await PlanService.savePlan(projectId, drawingData);

        // Opcional: Si queremos actualizar metadatos del proyecto (nombre, etc) deberíamos llamar a ProjectService
        // Pero por ahora solo actualizamos el dibujo como se pidió.

        // FEEDBACK VISUAL EXPLÍCITO
        alert('✅ Proyecto y Dibujo actualizados correctamente');
        console.log('✅ Proyecto actualizado:', projectId);
      } else {
        // Crear nuevo proyecto - ESTO NO SE PUEDE HACER SOLO CON savePlan (necesita ID)
        // Mantenemos lógica de insertar todo el objeto
        const { data, error } = await supabase
          .from('projects')
          .insert([projectData as any])
          .select()
          .single() as any;

        if (error) throw error;
        alert('✅ Proyecto guardado correctamente');

        // Actualizar URL con el nuevo ID
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

  const handleDeleteSelected = () => {
    if (selectedId) {
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
    addFloor(name, `${format.name}-${format.orientation}`);
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

  // Handler: Abrir modal de abertura (puerta o ventana)
  const handleOpeningTool = (type: 'door' | 'window') => {
    setOpeningType(type);
    setShowOpeningModal(true);
  };

  // Handler: Confirmar configuración de abertura
  const handleOpeningConfirm = (config: DoorConfig | WindowConfig) => {
    // Guardar configuración y activar herramienta
    setOpeningConfig(config);
    setTool(config.type);
    console.log(`🚪 Herramienta ${config.type} activada:`, config);
  };

  // Handler: Click en Stage para insertar abertura
  const handleStageClick = (e: any) => {
    // HERRAMIENTA: DIMENSION (Cota)
    if (tool === 'dimension') {
      const stage = e.target.getStage();
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Ajustar por escala y posición del stage
      const clickX = (pointerPos.x - stagePos.x) / stageScale;
      const clickY = (pointerPos.y - stagePos.y) / stageScale;

      if (!dimensionFirstPoint) {
        // Primer click: guardar punto inicial
        setDimensionFirstPoint({ x: clickX, y: clickY });
        console.log('📏 Punto inicial de cota:', clickX.toFixed(0), clickY.toFixed(0));
      } else {
        // Segundo click: crear cota
        const newDimension = createDimension(
          dimensionFirstPoint,
          { x: clickX, y: clickY },
          pixelsPerMeter,
          'layer-0'
        );

        // Agregar a la planta actual
        setFloors(prev => prev.map(f =>
          f.id === currentFloorId
            ? {
              ...f,
              elements: {
                ...f.elements,
                dimensions: [...f.elements.dimensions, newDimension]
              }
            }
            : f
        ));

        console.log(`✅ Cota creada: ${newDimension.distanceMeters.toFixed(2)}m`);

        // Reset para siguiente cota
        setDimensionFirstPoint(null);
      }
      return;
    }

    // HERRAMIENTA: DOOR o WINDOW (Aberturas)
    // Solo procesar si la herramienta es door o window
    if (tool !== 'door' && tool !== 'window') return;
    if (!openingConfig) return;

    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Ajustar por escala y posición del stage
    const mouseX = (pointerPos.x - stagePos.x) / stageScale;
    const mouseY = (pointerPos.y - stagePos.y) / stageScale;

    // Buscar el RoomGroup más cercano con un muro cerca del cursor
    let foundOpening = false;

    for (const group of roomGroups) {
      const result = findNearestWall(
        group.walls,
        mouseX,
        mouseY,
        group.x,
        group.y,
        group.rotation,
        group.scaleX,
        group.scaleY,
        30 // máximo 30 píxeles de distancia
      );

      if (result) {
        // Crear abertura
        let newOpening: Opening;

        if (openingConfig.type === 'door') {
          newOpening = createDoor(
            group.id,
            result.wallIndex,
            result.position,
            openingConfig.width,
            openingConfig.doorSwing
          );
        } else {
          newOpening = createWindow(
            group.id,
            result.wallIndex,
            result.position,
            openingConfig.width,
            openingConfig.height,
            openingConfig.sillHeight
          );
        }

        // Agregar abertura al grupo
        setRoomGroups(prev => prev.map(g =>
          g.id === group.id
            ? { ...g, openings: [...g.openings, newOpening] }
            : g
        ));

        console.log(`✅ ${openingConfig.type === 'door' ? 'Puerta' : 'Ventana'} insertada en muro ${result.wallIndex} del ambiente ${group.id}`);
        foundOpening = true;
        break;
      }
    }

    if (!foundOpening) {
      console.log('⚠️ No se encontró ningún muro cercano');
    }
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
    const newLabel = window.prompt("Editar etiqueta:", currentLabel || "");
    if (newLabel !== null) setSymbols(symbols.map(s => s.id === id ? { ...s, label: newLabel } : s));
  };

  // --- CAMBIO DE MODO ---
  const handleSwitchMode = (newMode: 'floorPlan' | 'singleLine') => {
    if (newMode === activeMode) return;

    // 1. Guardar estado actual en store
    modeStore.current[activeMode] = { symbols, walls, pipes, auxLines, pixelsPerMeter };

    // 2. Cambiar modo
    setActiveMode(newMode);

    // 3. Cargar estado del nuevo modo
    const nextData = modeStore.current[newMode];
    setSymbols(nextData.symbols);
    setWalls(nextData.walls);
    setPipes(nextData.pipes);
    setAuxLines(nextData.auxLines); // En unifilar seguramente vacío, pero útil
    setPixelsPerMeter(nextData.pixelsPerMeter);
    selectShape(null);
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



  const handleSymbolDragEnd = (id: string, e: any) => {
    const x = e.target.x();
    const y = e.target.y();
    setSymbols(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  };

  // --- CLICS ---

  const updateLinePoint = (id: string, type: 'wall' | 'aux', pointIndex: 0 | 2, newX: number, newY: number) => {
    if (type === 'wall') {
      setWalls(prev => prev.map(w => w.id !== id ? w : { ...w, points: pointIndex === 0 ? [newX, newY, w.points[2], w.points[3]] : [w.points[0], w.points[1], newX, newY] }));
    } else {
      setAuxLines(prev => prev.map(a => a.id !== id ? a : { ...a, points: pointIndex === 0 ? [newX, newY, a.points[2], a.points[3]] : [a.points[0], a.points[1], newX, newY] }));
    }
  };

  const renderGrid = () => {
    const step = pixelsPerMeter;
    const lines = [];
    for (let i = 0; i < 1000; i += step) lines.push(<Line key={`v${i}`} points={[i, 0, i, 700]} stroke="#f1f5f9" strokeWidth={1} listening={false} />);
    for (let j = 0; j < 700; j += step) lines.push(<Line key={`h${j}`} points={[0, j, 1000, j]} stroke="#f1f5f9" strokeWidth={1} listening={false} />);
    return <Group name="grid">{lines}</Group>;
  };

  const renderSelectionNodes = () => {
    if (!selectedId || tool !== 'select') return null;
    const selectedWall = walls.find(w => w.id === selectedId);
    const selectedAux = auxLines.find(a => a.id === selectedId);

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
    return null;
  };

  const renderSymbol = (sym: SymbolItem) => {
    if (!sym) return null;

    // Validar bloqueo de capa
    const layer = getCurrentFloor()?.layers.find(l => l.id === (sym as any).layerId);
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
          onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
          onClick={(e) => { e.cancelBubble = true; if (tool === 'select') selectShape(sym.id); }}
          onDblClick={(e) => { e.cancelBubble = true; handleUpdateLabel(sym.id, sym.label); }}
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

    // Renderizar símbolo usando definición del catálogo
    return (
      <Group
        key={sym.id}
        id={sym.id}
        x={sym.x}
        y={sym.y}
        rotation={sym.rotation || 0}
        scaleX={sym.scaleX || 1}
        scaleY={sym.scaleY || 1}
        draggable={tool === 'select'}
        onDragEnd={(e) => handleSymbolDragEnd(sym.id, e)}
        onClick={() => tool === 'select' && selectShape(sym.id)}
        onTap={() => tool === 'select' && selectShape(sym.id)}
      >
        <Path
          data={symbolDef.svgPath}
          stroke={symbolDef.strokeColor}
          strokeWidth={2}
          fill={symbolDef.fillColor || 'transparent'}
          lineCap="round"
          lineJoin="round"
        />
        {sym.label && (
          <Text
            text={sym.label}
            fontSize={10}
            x={10}
            y={10}
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

    setTimeout(() => {
      try {
        const dataUri = stageRef.current.toDataURL({ pixelRatio: 2, x: 0, y: 0, width: 1000, height: 700 });

        stageRef.current.scale({ x: oldScale, y: oldScale }); stageRef.current.position(oldPos);
        elementsToHide.forEach(sel => stageRef.current.findOne(sel)?.show());

        // 1. Crear documento VERTICAL (Para Carátula y Notas)
        const doc = new jsPDF('p', 'mm', 'a4');

        // 2. Preparar Datos
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
          const rows = calc.circuits.map((c: any) => [
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

        // 6. PÁGINA FINAL: EL DIBUJO (Landscape)
        // (Será Pag 3 en Planta, Pag 4 en Unifilar)
        doc.addPage('a4', 'l');

        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const iw = 277;
        const ih = 190;
        const ix = (pw - iw) / 2;
        const iy = (ph - ih) / 2;

        doc.addImage(dataUri, 'PNG', ix, iy, iw, ih);
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(ix, iy, iw, ih);

        // Rótulo del Plano (Pag 3)
        const rx = (ix + iw) - 70;
        const ry = (iy + ih) - 25;
        doc.setFontSize(10); doc.setFillColor(255, 255, 255); doc.rect(rx, ry, 70, 25, 'FD');
        doc.setFontSize(7);
        doc.text(`OBRA: ${projectData.projectName.substring(0, 35)}`, rx + 2, ry + 4);
        doc.text(`DOMICILIO: ${projectData.address.substring(0, 35)}`, rx + 2, ry + 8.5);
        doc.text(`INSTALADOR: ${projectData.installer.substring(0, 35)}`, rx + 2, ry + 13);
        doc.text(`ESCALA: ${projectData.category}`, rx + 2, ry + 17.5);
        doc.text(`FECHA: ${projectData.date}`, rx + 2, ry + 22);

        doc.save(`plano_${activeMode}_${projectData.projectName || 'proyecto'}.pdf`);
      } catch (e) {
        console.error("PDF Error", e);
        stageRef.current.scale({ x: oldScale, y: oldScale }); stageRef.current.position(oldPos);
        elementsToHide.forEach(sel => stageRef.current.findOne(sel)?.show());
      }
    }, 100);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* HEADER BLINDADO: 
          1. h-16: Altura suficiente para botones grandes.
          2. relative: Contexto de posición.
      */}
      <div className="flex items-center justify-between px-3 bg-white border-b shadow-sm z-30 h-16 relative">

        {/* LADO IZQUIERDO: TÍTULO Y BOTONES DE NAVEGACIÓN */}
        <div className="flex items-center space-x-3 pr-6 bg-white z-20 h-full flex-shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-full"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-base font-bold text-slate-700 whitespace-nowrap">Taller CAD</h1>

            {/* TABS DE MODO */}
            <div className="flex space-x-1 mt-1 bg-slate-100 rounded p-1">
              <button
                onClick={() => handleSwitchMode('floorPlan')}
                className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${activeMode === 'floorPlan' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                Planta
              </button>
              <button
                onClick={() => handleSwitchMode('singleLine')}
                className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${activeMode === 'singleLine' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                Unifilar
              </button>
            </div>

            {/* BOTONES DE ABERTURAS */}
            <div className="flex space-x-1 ml-2">
              <button
                onClick={() => handleOpeningTool('door')}
                className={`px-3 py-1 text-sm rounded font-medium transition-colors flex items-center gap-1 ${tool === 'door'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                title="Insertar Puerta"
              >
                🚪 Puerta
              </button>
              <button
                onClick={() => handleOpeningTool('window')}
                className={`px-3 py-1 text-sm rounded font-medium transition-colors flex items-center gap-1 ${tool === 'window'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                title="Insertar Ventana"
              >
                🪟 Ventana
              </button>
            </div>

            {/* BOTÓN DE COTA */}
            <div className="flex space-x-1 ml-2">
              <button
                onClick={() => {
                  setTool('dimension');
                  setDimensionFirstPoint(null);
                }}
                className={`px-3 py-1 text-sm rounded font-medium transition-colors flex items-center gap-1 ${tool === 'dimension'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                title="Insertar Cota/Dimensión"
              >
                📏 Cota
              </button>
            </div>
          </div>

          {/* Botón Volver a Calculadora */}
          {calculationData && (
            <button
              onClick={() => {
                // Guardar datos para abrir wizard en modo edición
                sessionStorage.setItem('editProjectData', JSON.stringify(calculationData));
                sessionStorage.setItem('openWizardOnDashboard', 'true');
                navigate('/dashboard');
              }}
              className="flex items-center justify-center w-9 h-9 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              title="Volver a la Calculadora"
            >
              <Calculator className="w-5 h- 5" />
            </button>
          )}

          {/* Botón Guardar Proyecto */}
          <button
            onClick={handleSaveProject}
            className="flex items-center justify-center w-9 h-9 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            title="Guardar Proyecto"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>

        {/* LADO DERECHO: BARRA DE HERRAMIENTAS
            absolute: Se posiciona libremente.
            inset-x-0: Ocupa todo el ancho.
            flex justify-end: Alinea botones a la derecha.
            pl-[140px]: Relleno izquierdo "duro" para que NUNCA pise al título.
            z-10: Capa inferior (se esconde detrás del título si falta espacio).
        */}
        <div className="absolute inset-x-0 h-full flex items-center justify-end pl-[140px] pr-2 z-10 pointer-events-none">
          {/* pointer-events-auto para que los botones funcionen */}
          <div className="pointer-events-auto overflow-x-auto no-scrollbar max-w-full flex justify-end">
            <PlannerSidebar
              tool={tool}
              setTool={setTool}
              activeMode={activeMode}
              onOpenReport={() => setShowMaterialModal(true)}
              onOpenProjectInfo={() => setShowProjectInfoModal(true)}
            />
          </div>
        </div>
      </div>

      {/* FLOOR TABS - Sistema de Múltiples Plantas */}
      <FloorTabs
        floors={floors}
        currentFloorId={currentFloorId}
        onFloorChange={setCurrentFloorId}
        onAddFloor={() => setShowNewFloorModal(true)}
        onEditFloor={handleEditFloor}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <PlannerToolbar
          currentCircuitColor={currentCircuitColor} setCurrentCircuitColor={setCurrentCircuitColor}
          currentPipeType={currentPipeType} setCurrentPipeType={setCurrentPipeType}
          onDownloadPDF={handleOpenExportModal} onDeleteSelected={handleDeleteSelected} onClearAll={handleClearAll}
          onCalibrate={() => { setTool('calibrate'); alert("DIBUJA UNA LÍNEA sobre una medida conocida."); }}
          scaleText={`1m = ${Math.round(pixelsPerMeter)}px`}
          // NUEVOS PROPS
          onUploadImage={handleImageUpload}
          isBackgroundLocked={isBackgroundLocked}
          onToggleLock={() => {
            setIsBackgroundLocked(!isBackgroundLocked);
            if (!isBackgroundLocked) selectShape(null); // Al bloquear, deseleccionar
          }}
          hasBackgroundImage={!!backgroundImage}
          onDeleteImage={handleDeleteImage}
        />

        <div
          className="flex-1 bg-slate-200 relative overflow-hidden cursor-crosshair"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
        >
          <Stage
            width={window.innerWidth} height={window.innerHeight}
            draggable={tool === 'select'}
            ref={stageRef} scaleX={stageScale} scaleY={stageScale} x={stagePos.x} y={stagePos.y}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel}
            onClick={handleStageClick}
            style={{ cursor: getCursorStyle() }}
          >
            <Layer>
              <Rect x={4} y={4} width={1000} height={700} fill="black" opacity={0.1} cornerRadius={2} blurRadius={10} name="paper-shadow" listening={false} />
              <Rect
                x={0}
                y={0}
                width={getCurrentFloor()?.format.widthPx || 1000}
                height={getCurrentFloor()?.format.heightPx || 700}
                fill="white"
                name="paper-bg"
                listening={false}
              />

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
                  onClick={() => {
                    if (!isBackgroundLocked && tool === 'select') selectShape('blueprint-bg');
                  }}
                  onTap={() => {
                    if (!isBackgroundLocked && tool === 'select') selectShape('blueprint-bg');
                  }}
                  listening={!isBackgroundLocked} // CRÍTICO: Si está bloqueado, clics pasan a través
                />
              )}

              {renderGrid()}

              <Group>
                <Group x={1000 - 250} y={700 - 105} name="rotulo-visual" listening={false}>
                  <Rect width={250} height={105} stroke="black" strokeWidth={1} fill="white" />
                  <Text text="RÓTULO (Vista Previa)" x={5} y={5} fontSize={10} fill="gray" />
                  <Text text={`Obra: ${projectData.projectName.substring(0, 25)}`} x={10} y={23} fontSize={11} fill="black" />
                  <Text text={`Dir: ${projectData.address.substring(0, 25)}`} x={10} y={40} fontSize={11} fill="black" />
                  <Text text={`Inst: ${projectData.installer.substring(0, 25)}`} x={10} y={57} fontSize={11} fill="black" />
                  <Text text={`Escala: ${projectData.category}`} x={10} y={74} fontSize={11} fill="black" />
                  <Text text={`Fecha: ${projectData.date}`} x={10} y={91} fontSize={10} fill="black" />
                </Group>

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

                          // Actualizar grupo
                          setRoomGroups(prev => prev.map(g =>
                            g.id === group.id
                              ? {
                                ...g,
                                x: node.x(),
                                y: node.y(),
                                rotation: node.rotation(),
                                scaleX: scaleX,
                                scaleY: scaleY
                              }
                              : g
                          ));

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
                              />
                            );
                          }
                          return null;
                        })}
                      </Group>
                    );
                  })}

                {/* Transformer */}
                <Transformer ref={transformerRef} />

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
                          stroke={selectedId === w.id ? "#3b82f6" : "black"}
                          strokeWidth={5}
                          lineCap="round"
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
                {getCurrentFloor()?.elements.dimensions?.map((dimension) => (
                  <DimensionComponent
                    key={dimension.id}
                    dimension={dimension}
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
                        {p.type === 'curved' ?
                          <Path
                            data={`M${p.points[0]},${p.points[1]} Q${(p.points[0] + p.points[2]) / 2},${(p.points[1] + p.points[3]) / 2 + 30} ${p.points[2]},${p.points[3]}`}
                            stroke={selectedId === p.id ? "#3b82f6" : pipeColor}
                            strokeWidth={2}
                            dash={[5, 5]}
                          /> :
                          <Line
                            points={p.points}
                            stroke={selectedId === p.id ? "#3b82f6" : pipeColor}
                            strokeWidth={2}
                          />
                        }
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
                    const layer = getCurrentFloor()?.layers.find(l => l.id === (sym as any).layerId);
                    return layer?.visible !== false;
                  })
                  .map(renderSymbol)}
                {renderSelectionNodes()}
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
            </Layer>
          </Stage>
        </div>

        {/* SIDEBAR DERECHO: Ambientes + Cálculos */}
        <RightSidebar
          calculationData={calculationData}
          symbols={symbols}
          activeMode={activeMode}
          onRoomDragStart={handleRoomDragStart}
        />

        {/* LAYERS PANEL: Sistema de Capas por Circuito */}
        <LayersPanel
          layers={getCurrentFloor()?.layers || []}
          currentLayerId={currentLayerId}
          onLayerChange={setCurrentLayerId}
          onToggleVisibility={toggleLayerVisibility}
          onToggleLock={toggleLayerLock}
          onColorChange={updateLayerColor}
        />
      </div>
      {/* MODAL DE EXPORTACIÓN (NOTAS) */}
      {showExportModal && (
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
      )}

      <MaterialReportModal isOpen={showMaterialModal} onClose={() => setShowMaterialModal(false)} symbols={symbols} pipes={pipes} walls={walls} pixelsPerMeter={pixelsPerMeter} />
      <ProjectInfoModal isOpen={showProjectInfoModal} onClose={() => setShowProjectInfoModal(false)} onSave={setProjectData} initialData={projectData} />

      {/* Modal Nueva Planta */}
      {showNewFloorModal && (
        <NewFloorModal
          onClose={() => setShowNewFloorModal(false)}
          onConfirm={handleAddFloor}
        />
      )}

      {/* Modal Editar Planta */}
      {showEditFloorModal && editingFloorId && (
        <EditFloorModal
          floor={floors.find(f => f.id === editingFloorId)!}
          onClose={() => {
            setShowEditFloorModal(false);
            setEditingFloorId(null);
          }}
          onConfirm={handleEditFloorConfirm}
        />
      )}

      {/* Modal Configurar Abertura */}
      {showOpeningModal && (
        <OpeningConfigModal
          type={openingType}
          onClose={() => setShowOpeningModal(false)}
          onConfirm={handleOpeningConfirm}
        />
      )}
    </div>
  );
}