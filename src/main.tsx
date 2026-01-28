import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Importamos el Proveedor de Autenticación que creamos
import { AuthProvider } from './contexts/AuthContext.tsx' 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Envolvemos la App con el AuthProvider para que funcione el usuario */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)