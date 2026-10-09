# panel_nodex · Panel del Ayuntamiento

Panel web donde el personal del municipio publica lo que los vecinos ven en la app
(`mobile_app`) y atiende lo que la app manda: reportes, trámites, boletos, votos.
Next.js 15 (App Router) + Firebase. Sigue [docs/arquitectura-multimunicipio.md](../docs/).

## Arrancar

```bash
cd panel_nodex
npm install
npm run dev            # http://localhost:3000
```

- **Sin `.env.local` corre en modo demo**: datos de ejemplo en memoria y cualquier
  contraseña entra. Sirve para enseñar el panel y trabajar en diseño.
- **Con Firebase**: copia `.env.example` a `.env.local` y llénalo con la
  configuración de la app web del proyecto (`firebase apps:sdkconfig WEB`).

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint (reglas de Next.js y TypeScript) |
| `npm run typecheck` | TypeScript sin compilar |
| `npm test` | Pruebas unitarias (Vitest) de `lib/` |
| `npm run build` | Compilación de producción |

El flujo `.github/workflows/panel-y-reglas.yml` corre todo esto y las pruebas de
reglas en cada Pull Request que toque `panel_nodex/` o `backend/`.

## Quién entra

El municipio y el rol **salen de los custom claims del token**, nunca de algo que
mande el cliente. Una cuenta sin claims ve una pantalla que explica qué falta.

```bash
# desde backend/, con la llave de servicio (GOOGLE_APPLICATION_CREDENTIALS)
node seed/crear-funcionario.js correo@municipio.gob.mx --rol admin --area "Presidencia" --produccion
```

Si la cuenta ya existe (creada en la consola), el mismo comando solo le asigna
permisos y no toca su contraseña. La pantalla **Administración → Personal** arma
este comando.

| Rol | En el panel |
|---|---|
| `funcionario` | Publica y atiende lo de su municipio |
| `admin` | Lo anterior + CRM (datos personales), Municipio, Personal, Auditoría |
| `plataforma` | Igual que admin; es el único que cruza municipios |

> **Pendiente:** permisos por área (que Agua no vea la taquilla, etc.). El claim
> `area` ya existe y viaja en la sesión; falta definir qué ve cada área.

## Modelo de datos

Todo cuelga de `municipios/{municipioId}`:

| Ruta | Quién la escribe | Para qué |
|---|---|---|
| `config/colonias`, `config/emergencias` | Panel (Municipio, Emergencias) o importador CSV del `admin_panel` | Colonias con zona, horario y pozo; directorio telefónico |
| `config/feria`, `config/catalogos` | Panel (Municipio) | Fechas de la feria; escenarios, escuelas, templos, dependencias |
| `config/estadisticas` | Cloud Function `estadisticasVecinos` | Vecinos por colonia (el panel no inventa cifras) |
| `config/contadores` | Panel y Cloud Functions (transacción) | Folios consecutivos de reportes, boletos y trámites |
| `publicaciones` | Panel | **Historial inmutable** de todo lo publicado |
| `agua/{fecha}`, `noticias`, `obras` | Panel (espejo, en el mismo lote que `publicaciones`) | Lo que la app ya lee en su formato |
| `notificaciones` | Panel / CRM encola; Cloud Function envía | Cola de push por colonia, segmento o persona |
| `auditoria` | Panel | Bitácora inmutable: quién hizo qué |
| `reportes` | App crea; panel atiende (`estado`, `historial[]`) | Reportes ciudadanos con foto y GPS |
| `rutasBasura` | Panel | Recorrido en el mapa, días y horario de cada camión |
| `comercios` | Panel o importador CSV (mismo id: slug del nombre) | Directorio de negocios |
| `eventos`, `candidatas`, `certamenes`, `votos`, `transmisiones`, `registrosPaisanos` | Panel / app | Feria |
| `pagos` | Taquilla (panel); en línea: Cloud Function de la pasarela | Boletos y pagos municipales (simulados) |
| `tramites`, `agendas`, `solicitudes` | Panel / app | Trámites y citas |
| `calificaciones` | App | Calificaciones de la app (solo admin) |

Y en la raíz `usuarios/{uid}`: el perfil del vecino o del personal (`rol` y
`municipioId` son espejo de los claims). Los pagos y votos guardan nombre y colonia
de quien los hizo, para que el funcionario no tenga que leer `usuarios`.

**El dueño de un documento va en `uid`** (convención del repo; las reglas lo usan).

## Reglas, índices y funciones

Viven en `backend/` (no en esta carpeta):

```bash
cd backend
npm run probar:reglas        # 42 pruebas contra el emulador
firebase deploy --only firestore:rules,firestore:indexes,storage --project miteocal
firebase deploy --only functions --project miteocal   # requiere plan Blaze
```

Cloud Functions que usa el panel: `procesarNotificacion` y `enviarProgramadas`
(push por FCM), `estadisticasVecinos`, `resumenPorPago` / `resumenPorCalificacion`
(resumen de cada vecino para el CRM) y `asignarMunicipio` (acepta `area`).

## Mapas y fotos

- **Mapbox**: `NEXT_PUBLIC_MAPBOX_TOKEN`. Restringe el token a los dominios del panel.
  El mapa se centra en las coordenadas de las colonias (`config/colonias`).
- **Storage**: noticias, comercios y candidatas suben imagen a
  `municipios/{id}/{carpeta}/…` (reglas en `backend/storage.rules`). Hay que activar
  Storage en el proyecto.

## Publicar en internet

En Vercel: importa el repo, **Root Directory = `panel_nodex`**, y copia las variables
de `.env.local`. Agrega el dominio de Vercel en Firebase → Authentication →
Dominios autorizados y en las restricciones del token de Mapbox.

## Lo que falta

- Permisos por área (ver arriba).
- Pasarela de pago real (hoy los pagos están simulados).
- Que la app escriba `tipo` (`local` / `paisano`) y `origen` en `usuarios/` para
  que el CRM y los segmentos de paisanos funcionen con datos reales.
- La app hoy trata `estado: 'sin-dato'` del agua como servicio activo; debería
  mostrar «sin información».
