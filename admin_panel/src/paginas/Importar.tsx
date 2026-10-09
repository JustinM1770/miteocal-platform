import { useMemo, useState } from 'react';
import {
  Alert, Button, Card, Input, Select, Table, Tag, Typography, Upload, App, Space,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { doc, writeBatch, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/cliente';
import { useSesion } from '../firebase/sesion';
import { leerCSV, aSlug } from '../importar/csv';
import { ESQUEMAS, validar, type Esquema, type FilaValidada } from '../importar/esquemas';

const { Title, Text, Paragraph } = Typography;
const LIMITE_LOTE = 400; // Firestore admite 500; dejamos margen.

export function Importar() {
  const { municipioId } = useSesion();
  const { message } = App.useApp();
  const [esquema, setEsquema] = useState<Esquema>(ESQUEMAS[0]);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analisis = useMemo(
    () => (texto.trim() ? validar(esquema, leerCSV(texto)) : null),
    [texto, esquema]
  );

  const conErrores = analisis?.validadas.filter((f) => f.errores.length) ?? [];
  const listas = analisis?.validadas.filter((f) => !f.errores.length) ?? [];
  const puedeImportar =
    !!municipioId && !analisis?.errorGeneral && listas.length > 0 && conErrores.length === 0;

  async function importar() {
    if (!municipioId || !analisis) return;
    setGuardando(true);
    setError(null);
    try {
      const base = `municipios/${municipioId}`;

      if (esquema.destino.tipo === 'documento') {
        const lista = listas.map((f) => ({ id: aSlug(String(f.datos.nombre)), ...f.datos }));
        await setDoc(doc(db, `${base}/${esquema.destino.ruta}`), { lista }, { merge: false });
        message.success(`${lista.length} renglones guardados.`);
      } else {
        const nombre = esquema.destino.nombre;
        for (let i = 0; i < listas.length; i += LIMITE_LOTE) {
          const trozo = listas.slice(i, i + LIMITE_LOTE);
          const lote = writeBatch(db);
          for (const fila of trozo) {
            const id = esquema.idDeFila
              ? esquema.idDeFila(fila.datos)
              : doc(collection(db, `${base}/${nombre}`)).id;
            lote.set(doc(db, `${base}/${nombre}/${id}`), fila.datos, { merge: true });
          }
          await lote.commit();
        }
        message.success(`${listas.length} documentos guardados en ${nombre}.`);
      }
      setTexto('');
    } catch {
      setError('No se pudo guardar. Revisa que tu cuenta tenga rol de funcionario.');
    } finally {
      setGuardando(false);
    }
  }

  const columnas = [
    { title: '#', dataIndex: 'numero', width: 56 },
    ...esquema.campos.map((c) => ({
      title: c.etiqueta,
      key: c.clave,
      render: (_: unknown, f: FilaValidada) => String(f.datos[c.clave] ?? ''),
    })),
    {
      title: 'Estado',
      key: 'estado',
      render: (_: unknown, f: FilaValidada) =>
        f.errores.length
          ? <Tag color="error">{f.errores.join(', ')}</Tag>
          : <Tag color="success">ok</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ display: 'flex', maxWidth: 900 }}>
      <Card>
        <Title level={4} style={{ marginTop: 0, marginBottom: 2 }}>
          Cargar datos desde una hoja de cálculo
        </Title>
        <Text type="secondary">
          Exporta la hoja como CSV. Se revisa antes de guardar nada.
        </Text>

        <div style={{ marginTop: 20, marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Qué vas a cargar</Text>
          <Select
            value={esquema.id}
            onChange={(id) => setEsquema(ESQUEMAS.find((x) => x.id === id)!)}
            style={{ width: '100%' }}
            options={ESQUEMAS.map((x) => ({ value: x.id, label: x.titulo }))}
          />
          <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            {esquema.descripcion}
          </Paragraph>
        </div>

        <Upload.Dragger
          accept=".csv,text/csv"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(archivo) => {
            archivo.text().then(setTexto);
            return false; // no subir a ningun lado: se procesa en el navegador
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Arrastra el CSV aquí o haz clic para elegirlo</p>
          <p className="ant-upload-hint" style={{ fontSize: 13 }}>
            Columnas esperadas: {esquema.campos.map((c) => c.clave).join(', ')}
          </p>
        </Upload.Dragger>

        <Input.TextArea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`...o pega el CSV aquí:\n\n${esquema.ejemplo}`}
          rows={6}
          style={{ marginTop: 16, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }}
        />

        {analisis?.errorGeneral && (
          <Alert type="error" message={analisis.errorGeneral} style={{ marginTop: 16 }} />
        )}
        {error && <Alert type="error" message={error} style={{ marginTop: 16 }} />}

        <Button type="primary" size="large" onClick={importar}
                disabled={!puedeImportar} loading={guardando} style={{ marginTop: 16 }}>
          Guardar {listas.length || ''} renglones
        </Button>
      </Card>

      {analisis && !analisis.errorGeneral && analisis.validadas.length > 0 && (
        <Card>
          <Title level={5} style={{ marginTop: 0 }}>Vista previa</Title>
          {conErrores.length > 0 && (
            <Alert
              type="warning"
              message={`${conErrores.length} renglón(es) con problemas`}
              description="Corrígelos en tu hoja y vuelve a cargarla. No se guarda nada mientras haya errores."
              style={{ marginBottom: 16 }}
            />
          )}
          <Table
            size="small"
            rowKey="numero"
            columns={columnas}
            dataSource={analisis.validadas}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            scroll={{ x: true }}
            rowClassName={(f) => (f.errores.length ? 'fila-con-error' : '')}
          />
        </Card>
      )}
    </Space>
  );
}
