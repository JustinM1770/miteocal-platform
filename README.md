# MiTeocal — Plataforma Ciudadana de Teocaltiche

> **Lo que pasa en tu colonia, antes de que te afecte.**

MiTeocal es la plataforma digital del municipio de Teocaltiche, Jalisco. Conecta a los
vecinos con los servicios públicos, el comercio local y las noticias de su colonia en
tiempo real, e incluye un canal dedicado para los paisanos que viven en el extranjero.

Está construida como **plataforma multi-municipio**: un solo código base atiende a varios
ayuntamientos, cada uno con su identidad, sus colonias y los módulos que haya contratado.
Teocaltiche es el primer despliegue, no el único posible. Ver
[`docs/arquitectura-multimunicipio.md`](./docs/arquitectura-multimunicipio.md).

El diseño de referencia vive en Figma:
[MiTeocal — Prototipo v1](https://www.figma.com/proto/6YEhEL4EGCltEQod7LzVza/MiTeocal-%E2%80%94-Prototipo-v1?node-id=2-243)

---

## Tabla de contenidos

- [El problema](#el-problema)
- [Módulos del producto](#módulos-del-producto)
- [Arquitectura](#arquitectura)
- [Multi-municipio](#multi-municipio)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Stack tecnológico](#stack-tecnológico)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Sistema de diseño](#sistema-de-diseño)
- [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
- [Seguridad](#seguridad)
- [Estado del proyecto](#estado-del-proyecto)

---

## El problema

En Teocaltiche la información municipal se dispersa entre grupos de WhatsApp, perifoneo y
publicaciones de Facebook. Un vecino no sabe a qué hora habrá agua, cuándo pasa el camión
de la basura o qué calle está cerrada hasta que ya salió de su casa. Al mismo tiempo, miles
de teocaltichenses radicados en Estados Unidos dependen de terceros para hacer un trámite o
enviar algo a su familia.

MiTeocal concentra esa información en un solo lugar, con datos operativos del municipio y
un directorio verificado de comercios locales.

---

## Módulos del producto

### Inicio
Estado del agua potable en tiempo real (horario del día, presión en bar, calidad y
cobertura), seguimiento en vivo del camión de la basura con tiempo estimado de llegada a tu
calle, cortes de agua programados, cierres viales y obras cerca de ti, avisos de las
escuelas que sigues, y accesos directos a pagar agua, reportar una falla, trámites y
emergencias.

### Noticias
Boletín municipal filtrable por categoría (Obras, Salud, Cultura), avisos parroquiales y
esquelas — las tres fuentes que la gente del pueblo realmente consulta.

### Comercio
Directorio de negocios locales con búsqueda, categorías, calificaciones y contacto directo
por WhatsApp. Incluye bolsa de trabajo con vacantes del municipio y clasificados de compra,
venta y renta.

### Servicios
Trámites y pagos municipales, reporte ciudadano con foto y ubicación GPS (fugas, baches,
alumbrado público, recolección de basura), folio de seguimiento, enlace al portal oficial y
directorio de emergencias (Policía Municipal, Cruz Roja, Protección Civil, SAPAS).

### Feria de Noviembre
Cartelera de artistas con precios y disponibilidad, mapa interactivo del recinto y pase
digital con código QR compatible con Apple Wallet y Google Wallet.

### Paisanos
Transmisión en vivo de los eventos del pueblo, contador de la comunidad conectada desde el
extranjero, trámites a distancia (actas, pasaportes, apostillas, pago de predial con
tarjeta internacional) y un directorio de comercios que envían a domicilio en Teocaltiche y
aceptan pago en dólares.

---

## Arquitectura

```
┌──────────────────┐     ┌──────────────────┐
│   mobile_app     │     │   admin_panel    │
│  Flutter (iOS,   │     │  Panel web para  │
│  Android)        │     │  el municipio    │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │      REST / HTTPS      │
         └───────────┬────────────┘
                     │
            ┌────────▼─────────┐
            │     backend      │
            │  Node.js + API   │
            └────────┬─────────┘
                     │
            ┌────────▼──────────────────────────┐
            │            Firebase               │
            │  Auth (OTP SMS) · Firestore ·     │
            │  Storage · Cloud Messaging ·      │
            │  Cloud Functions                  │
            └───────────────────────────────────┘
```

El backend concentra la lógica de negocio y la validación; la app y el panel nunca escriben
directo a Firestore en colecciones sensibles. Las notificaciones de agua, basura y cierres
salen desde Cloud Functions hacia FCM segmentadas por colonia.

---

## Multi-municipio

Ningún dato de negocio vive suelto: todo cuelga de `municipios/{municipioId}`, y el
`municipioId` de cada persona viaja en un *custom claim* de Firebase Auth, nunca en un
parámetro que mande el cliente. Las reglas de Firestore usan ese claim para impedir que un
municipio lea los datos de otro.

Nada específico de Teocaltiche —nombre, escudo, colores, colonias, teléfonos de
emergencia— está escrito en el código: todo sale del documento de configuración del
municipio. Dar de alta un ayuntamiento nuevo es llenar ese documento y capacitar a su
personal, no clonar el repositorio.

Cada módulo (`agua`, `basura`, `reportes`, `comercio`, `noticias`, `escuelas`, `feria`,
`paisanos`) se enciende o apaga por municipio, lo que además define los paquetes
comerciales.

El detalle completo, incluidas las reglas de seguridad y el checklist de revisión de PRs,
está en [`docs/arquitectura-multimunicipio.md`](./docs/arquitectura-multimunicipio.md).

---

## Estructura del repositorio

```
miteocal-platform/
├── backend/          API en Node.js, Cloud Functions y reglas de Firestore
├── mobile_app/       Aplicación Flutter para ciudadanos y paisanos
├── admin_panel/      Panel web de administración para el municipio
├── docs/             Documentación técnica, de producto y de diseño
├── .gitignore
└── README.md
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| App móvil | Flutter 3.x · Dart 3.x |
| Backend | Node.js 20 LTS · Express · TypeScript |
| Panel admin | React + Vite · TypeScript |
| Base de datos | Cloud Firestore |
| Autenticación | Firebase Auth (verificación por SMS) |
| Archivos | Firebase Storage |
| Notificaciones | Firebase Cloud Messaging |
| Serverless | Firebase Cloud Functions |
| Mapas | Google Maps Platform |
| Tipografía | Inter · DM Sans |

---

## Puesta en marcha

### Requisitos previos

- Flutter SDK 3.19 o superior
- Node.js 20 LTS y npm
- Firebase CLI (`npm install -g firebase-tools`)
- Xcode (iOS) y Android Studio (Android)

### Clonar el proyecto

```bash
git clone <url-del-repositorio>
cd miteocal-platform
git checkout develop
```

### Backend

```bash
cd backend
npm install
cp .env.example .env        # completa las credenciales
npm run dev
```

### Aplicación móvil

```bash
cd mobile_app
flutter pub get
flutterfire configure       # genera firebase_options.dart (no se versiona)
flutter run
```

### Panel de administración

```bash
cd admin_panel
npm install
cp .env.example .env
npm run dev
```

---

## Variables de entorno

Ningún archivo `.env` ni llave de servicio se versiona: el `.gitignore` bloquea `.env`,
`serviceAccount*.json`, `*-firebase-adminsdk-*.json`, `google-services.json` y
`GoogleService-Info.plist`. Cada carpeta mantiene su propio `.env.example` con las claves
requeridas y valores de muestra.

| Variable | Ámbito | Descripción |
|----------|--------|-------------|
| `FIREBASE_PROJECT_ID` | backend | ID del proyecto de Firebase |
| `FIREBASE_CLIENT_EMAIL` | backend | Cuenta de servicio del Admin SDK |
| `FIREBASE_PRIVATE_KEY` | backend | Llave privada de la cuenta de servicio |
| `GOOGLE_MAPS_API_KEY` | móvil, panel | Mapas de basura, obras y feria |
| `API_BASE_URL` | móvil, panel | URL base del backend |

Si una credencial se filtra, revócala en la consola de Google Cloud antes de reescribir el
historial de Git.

---

## Sistema de diseño

Tokens tomados directamente del prototipo de Figma:

| Token | Valor | Uso |
|-------|-------|-----|
| `brand/primary` | `#1552E0` | Botones, enlaces, tarjeta de agua |
| `brand/soft` | `#EDF2FE` | Fondos de estado informativo |
| `text/primary` | `#0E1116` | Títulos y texto principal |
| `text/secondary` | `#6B7280` | Texto de apoyo |
| `text/inverse` | `#FFFFFF` | Texto sobre fondos oscuros |
| `bg/canvas` | `#FFFFFF` | Fondo de tarjetas |
| `bg/subtle` | `#F5F6F8` | Fondo de pantalla |
| `bg/inverse` | `#0E1116` | Bloques oscuros y video |
| `border/hairline` | `#E8EAEE` | Bordes de 1 px |
| `status/success` | `#12A150` | Servicio activo, disponible |
| `status/successSoft` | `#E6F6EE` | Fondo de etiquetas positivas |
| `status/danger` | `#D93A3A` | Fallas, cierres, "EN VIVO" |
| `accent/whatsapp` | `#25D366` | Botones de contacto |

Escala tipográfica: Heading 17/22 (600), Body Strong 15/22 (500), Caption Strong 13/18
(600), Micro 11/14 (500). Base de 390 px de ancho, radios de 12–16 px y espaciado en
múltiplos de 4.

El detalle completo está en [`docs/`](./docs).

---

## Flujo de trabajo con Git

| Rama | Propósito |
|------|-----------|
| `main` | Código en producción, siempre estable |
| `develop` | Rama de integración; parte de aquí todo trabajo nuevo |
| `feature/*` | Funcionalidad nueva (`feature/reporte-ciudadano`) |
| `fix/*` | Corrección de errores |
| `release/*` | Preparación de una versión |

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

```bash
git checkout develop
git checkout -b feature/mi-funcionalidad
# ... trabajo ...
git commit -m "feat: agrega seguimiento del camión de basura"
```

---

## Seguridad

- Ninguna credencial se sube al repositorio; revisa `git status` antes de cada commit.
- Las reglas de Firestore y Storage viven en `backend/` y se despliegan con Firebase CLI.
- Los reportes ciudadanos guardan ubicación aproximada, no la dirección exacta del usuario.
- El acceso al panel de administración se limita por rol mediante custom claims de Firebase
  Auth.

---

## Estado del proyecto

En desarrollo activo. Prototipo de interfaz completo (26 pantallas en Figma); la
implementación arranca sobre esta estructura base.

---

Hecho para Teocaltiche, Jalisco.
