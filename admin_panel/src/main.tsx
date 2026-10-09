import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AppAntd } from 'antd';
import esES from 'antd/locale/es_ES';
import 'antd/dist/reset.css';
import './estilos/tokens.css';
import { temaMiTeocal } from './estilos/tema-antd';
import App from './App.tsx';
import { ProveedorSesion } from './firebase/sesion';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={temaMiTeocal} locale={esES}>
      <AppAntd>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </AppAntd>
    </ConfigProvider>
  </StrictMode>
);
