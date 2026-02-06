import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/planner/PlannerCanvas.tsx';
let content = readFileSync(filePath, 'utf8');
let changesMade = false;

// PASO 1: Verificar y agregar imports si no existen
if (!content.includes("usePipeRenderer")) {
    const importRegex = /(import \{ useCircuitLayers \} from '\.\.\/\.\.\/lib\/planner\/hooks\/useCircuitLayers';)/;
    if (importRegex.test(content)) {
        content = content.replace(
            importRegex,
            `$1\nimport { usePipeRenderer } from '../../lib/planner/hooks/usePipeRenderer';\nimport { PipeRenderer } from './PipeRenderer';`
        );
        console.log('✅ Paso 1: Imports agregados');
        changesMade = true;
    }
} else {
    console.log('✅ Paso 1: Imports ya existen');
}

// PASO 2: Inicializar hook (después de drawingTools destructuring)
if (!content.includes("usePipeRenderer()")) {
    const hookInitRegex = /(const \{\s+handleMouseDown[^}]+getCursorStyle\s+\} = drawingTools;)/s;
    if (hookInitRegex.test(content)) {
        content = content.replace(
            hookInitRegex,
            `$1\n\n  // ✅ HOOK: Pipe Renderer\n  const { getPipeDash, getPipeStyle } = usePipeRenderer();`
        );
        console.log('✅ Paso 2: Hook inicializado');
        changesMade = true;
    } else {
        console.log('❌ No se encontró destructuring de drawingTools');
    }
} else {
    console.log('✅ Paso 2: Hook ya inicializado');
}

// PASO 3: Reemplazar renderizado inline de pipes
const pipeRenderPattern = /\{p\.type === 'curved' \?\s+<Path[\s\S]+?opacity=\{p\.nature === 'relevado' \? 0\.4 : 1\}\s+\/>\s+:\s+<Line[\s\S]+?opacity=\{p\.nature === 'relevado' \? 0\.4 : 1\}\s+\/>\s+\}/;
if (pipeRenderPattern.test(content)) {
    content = content.replace(
        pipeRenderPattern,
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
    changesMade = true;
} else {
    console.log('⚠️  Patrón de renderizado no encontrado (puede estar ya actualizado)');
}

if (changesMade) {
    writeFileSync(filePath, content, 'utf8');
    console.log('\n✅ Archivo guardado exitosamente');
} else {
    console.log('\n✅ No se requirieron cambios');
}
