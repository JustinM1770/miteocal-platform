import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/tokens.css';
import App from './App.tsx';
import { ProveedorSesion } from './firebase/sesion';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorSesion>
      <App />
    </ProveedorSesion>
  </StrictMode>
);
