
import { selectOptimalCableAndProtection } from './src/lib/electrical-rules';

// Simular carga de datos (esto fallará si requiere archivos reales)
// Pero podemos ver si el código tiene algún sesgo.

const result = selectOptimalCableAndProtection(2.5, 'IUG', 'Embutido', '220V');
console.log('Result for IUG @ 2.5A:', result);
