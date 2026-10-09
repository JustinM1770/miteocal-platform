import { useState } from 'react';
import { Button, Card, Form, Input, Alert, Typography } from 'antd';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, usandoEmuladores } from '../firebase/cliente';

const { Title, Text } = Typography;

export function Entrar() {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(valores: { correo: string; clave: string }) {
    setError(null);
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, valores.correo, valores.clave);
    } catch {
      // Generico a proposito: no revelar si el correo existe.
      setError('Correo o contraseña incorrectos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <Card style={{ width: 380 }}>
        <Title level={4} style={{ marginTop: 0 }}>Panel del municipio</Title>
        <Text type="secondary">Acceso para personal autorizado.</Text>

        <Form layout="vertical" onFinish={alEnviar} style={{ marginTop: 20 }} requiredMark={false}>
          <Form.Item
            label="Correo"
            name="correo"
            rules={[{ required: true, type: 'email', message: 'Escribe un correo válido.' }]}
          >
            <Input autoComplete="username" size="large" />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="clave"
            rules={[{ required: true, message: 'Escribe tu contraseña.' }]}
          >
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>

          {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

          <Button type="primary" htmlType="submit" loading={enviando} block size="large">
            Entrar
          </Button>
        </Form>

        {usandoEmuladores && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
            Conectado a los emuladores locales.
          </Text>
        )}
      </Card>
    </div>
  );
}
