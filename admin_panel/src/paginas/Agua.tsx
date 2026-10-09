import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Segmented, Skeleton, Typography, App } from 'antd';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/cliente';
import { useSesion } from '../firebase/sesion';

const { Title, Text } = Typography;

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface EstadoAgua {
  horario: string;
  presion: number;
  calidad: string;
  cobertura: string;
  estado: 'activo' | 'sin-servicio';
}

const VACIO: EstadoAgua = {
  horario: '', presion: 0, calidad: 'Potable', cobertura: 'Total', estado: 'activo',
};

export function Agua() {
  const { municipioId } = useSesion();
  const { message } = App.useApp();
  const [form] = Form.useForm<EstadoAgua>();
  const fecha = hoyISO();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La ruta SIEMPRE parte de municipios/{municipioId}, y el id sale del token.
  const ruta = municipioId ? `municipios/${municipioId}/agua/${fecha}` : null;

  useEffect(() => {
    if (!ruta) return;
    return onSnapshot(
      doc(db, ruta),
      (snap) => {
        form.setFieldsValue(snap.exists() ? { ...VACIO, ...(snap.data() as EstadoAgua) } : VACIO);
        setCargando(false);
      },
      () => { setError('No se pudo leer el estado del agua.'); setCargando(false); }
    );
  }, [ruta, form]);

  async function guardar(valores: EstadoAgua) {
    if (!ruta) return;
    setGuardando(true);
    setError(null);
    try {
      await setDoc(doc(db, ruta), { ...valores, actualizadoEn: serverTimestamp() }, { merge: true });
      message.success('Publicado. Los vecinos ya lo ven en la app.');
    } catch {
      setError('No se pudo guardar. Revisa que tu cuenta tenga rol de funcionario.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card style={{ maxWidth: 560 }}>
      <Title level={4} style={{ marginTop: 0, marginBottom: 2 }}>Estado del agua</Title>
      <Text type="secondary">{fecha} · se publica en tiempo real</Text>

      {cargando ? (
        <Skeleton active style={{ marginTop: 20 }} />
      ) : (
        <Form form={form} layout="vertical" onFinish={guardar} initialValues={VACIO}
              style={{ marginTop: 20 }} requiredMark={false}>
          <Form.Item label="Servicio" name="estado">
            <Segmented options={[
              { label: 'Activo', value: 'activo' },
              { label: 'Sin servicio', value: 'sin-servicio' },
            ]} />
          </Form.Item>

          <Form.Item label="Horario del día" name="horario"
                     rules={[{ required: true, message: 'Indica el horario.' }]}>
            <Input placeholder="06:00 - 12:00" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Presión (bar)" name="presion">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Calidad" name="calidad"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Cobertura" name="cobertura"><Input /></Form.Item>
            </Col>
          </Row>

          {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

          <Button type="primary" htmlType="submit" loading={guardando} size="large">
            Publicar
          </Button>
        </Form>
      )}
    </Card>
  );
}
