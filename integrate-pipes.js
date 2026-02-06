const fs = require('fs');
const path = require('path');

const filePath = 'src/components/planner/PlannerCanvas.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// PASO 1: Agregar imports (después de useDrawingTools)
const importRegex = /(import \{ useDrawingTools \} from '\.\.\/\.\.\/lib\/planner\/hooks\/useDrawingTools';)/;
if (importRegex.test(content)) {
    content = content.replace(
        importRegex,
        `$1\nimport { usePipeRenderer } from '../../lib/planner/hooks/usePipeRenderer';\nimport { PipeRenderer } from './PipeRenderer';`
    );
    console.log('✅ Paso 1: Imports agregados');
} else {
    console.log('❌ No se encontró import de useDrawingTools');
    process.exit(1);
}

// PASO 2: Inicializar hook (después de drawingTools)
const hookInitRegex = /(const drawingTools = useDrawingTools\([^)]+\);\s+const \{[^}]+\} = drawingTools;)/s;
if (hookInitRegex.test(content)) {
    content = content.replace(
        hookInitRegex,
        `$1\n\n  // ✅ HOOK: Pipe Renderer\n  const { getPipeDash, getPipeStyle } = usePipeRenderer();`
    );
    console.log('✅ Paso 2: Hook inicializado');
} else {
    console.log('❌ No se encontró inicialización de drawingTools');
    process.exit(1);
}

// PASO 3: Reemplazar renderizado inline de pipes (aproximado)
const pipeRenderRegex = /\{p\.type === 'curved' \?\s+<Path\s+data={\`M\$\{p\.points\[0\]\}[^}]+\}\s+\/>/gs;
if (pipeRenderRegex.test(content)) {
    // Buscar el bloque completo de renderizado
    const fullPipeBlock = /\{p\.type === 'curved' \?[\s\S]+?<Line[\s\S]+?\/>\s+}/;
    content = content.replace(
        fullPipeBlock,
        `{(() => {
                            const circuitMethod = calculationData?.config?.circuitInventoryForCAD?.find(c => c.id === p.circuitId)?.conduit?.method;
                            return (
                              <PipeRenderer
                                pipe={p}
                                selectedId={selectedId}
                                {...getPipeStyle(p, selectedId)}
                                dash={getPipeDash(p, circuitMethod)}
                              />
                            );
                          })()}`
    );
    console.log('✅ Paso 3: Renderizado reemplazado');
} else {
    console.log('⚠️  No se encontró patrón de renderizado de pipes (puede requerir ajuste manual)');
}

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo guardado exitosamente');
