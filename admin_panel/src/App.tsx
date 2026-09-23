import { useState } from 'react';
import { Layout, Menu, Button, Result, Typography, Tag, Spin } from 'antd';
import {
  CloudOutlined, UploadOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useSesion, puedeAdministrar } from './firebase/sesion';
import { Entrar } from './paginas/Entrar';
import { Agua } from './paginas/Agua';
import { Importar } from './paginas/Importar';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const SECCIONES = [
  { key: 'agua', icon: <CloudOutlined />, label: 'Agua', componente: <Agua /> },
  { key: 'importar', icon: <UploadOutlined />, label: 'Cargar datos', componente: <Importar /> },
];

export default function App() {
  const { usuario, municipioId, rol, cargando, salir } = useSesion();
  const [seccion, setSeccion] = useState('agua');

  if (cargando) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><Spin size="large" /></div>;
  }

  if (!usuario) return <Entrar />;

  // El rol y el municipio salen del custom claim. Una cuenta recien creada
  // todavia no los tiene: los escribe la Cloud Function asignarMunicipio.
  if (!puedeAdministrar(rol) || !municipioId) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Result
          status="403"
          title="Tu cuenta todavía no tiene acceso"
          subTitle="Un administrador de tu municipio tiene que asignarte un rol antes de que puedas entrar al panel."
          extra={<Button onClick={salir}>Salir</Button>}
        />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--borde)', padding: '0 20px',
      }}>
        <span>
          <Text strong>MiTeocal</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>{municipioId}</Text>
          <Tag color="blue" style={{ marginLeft: 8 }}>{rol}</Tag>
        </span>
        <Button type="text" icon={<LogoutOutlined />} onClick={salir}>Salir</Button>
      </Header>

      <Layout>
        <Sider width={200} theme="light" breakpoint="lg" collapsedWidth={0}>
          <Menu
            mode="inline"
            selectedKeys={[seccion]}
            onSelect={({ key }) => setSeccion(key)}
            style={{ height: '100%', borderInlineEnd: 0 }}
            items={SECCIONES.map(({ key, icon, label }) => ({ key, icon, label }))}
          />
        </Sider>

        <Content style={{ padding: 24 }}>
          {SECCIONES.find((s) => s.key === seccion)?.componente}
        </Content>
      </Layout>
    </Layout>
  );
}
