# mobile_app — MiTeocal

App ciudadana de MiTeocal (Flutter, iOS y Android). Diseño:
[Figma · MiTeocal — Prototipo v1](https://www.figma.com/design/6YEhEL4EGCltEQod7LzVza/MiTeocal-%E2%80%94-Prototipo-v1).
Cada pantalla del código indica el número de pantalla del Figma que calca (`/// 04 · Servicios`).

## Correrla

```bash
cd mobile_app
flutter pub get
flutter devices                # ver tu celular o emulador
flutter run                    # modo demo: datos de ejemplo, sin Firebase
```

**Mapas (Mapbox):** copia `.env.example` como `.env`, pon el token público (`pk.…`, el mismo del
panel) y corre `flutter run --dart-define-from-file=.env`. Sin token, los mapas muestran la
ilustración del Figma. El `.env` no se sube al repo.

- **Modo demo (por defecto).** Datos de Teocaltiche en memoria (`lib/datos/repositorio_demo.dart`).
  No necesitas acceso a Firebase para trabajar en las pantallas.
- **Modo Firebase.** `flutter run --dart-define=FUENTE=firebase`. Requiere `firebase_options.dart`
  (lo genera `flutterfire configure`; **no** se sube al repo).
- **Otro municipio.** `--dart-define=MUNICIPIO_ID=villa-hidalgo`. La app no tiene nada amarrado
  a Teocaltiche: nombre, colores, colonias y módulos salen de los datos.

En iPhone la primera compilación tarda (CocoaPods). Si falla con "specs repository is too
out-of-date": `cd ios && pod install --repo-update`.

## Cómo está organizada

```
lib/
  main.dart                     elige la fuente (demo/firebase) y monta los Providers
  datos/
    repositorio.dart            interfaz: TODO lo que la app lee o escribe pasa por aquí
    repositorio_demo.dart       datos de ejemplo
    repositorio_firestore.dart  municipios/{municipioId}/... (misma forma que el panel)
    sesion.dart                 perfil del vecino (se guarda en el teléfono)
    modelos/                    Municipio, EstadoAgua, Colonia, Perfil, Reporte, Noticia, ...
  navegacion/                   barra de 4 pestañas (Pestanas permite saltar entre ellas)
  nucleo/
    tema/                       colores, tipografía (Inter) y medidas del Figma
    widgets/                    botones, campos, hoja de colonias
    servicios/ubicacion.dart    GPS y colonia más cercana
  pantallas/
    registro/                   09 Bienvenida → 10 Registro → 11 SMS → 12 Colonia
    inicio_pagina.dart          01 Inicio (+ 07 selector de colonia)
    servicios_pagina.dart       04 Servicios (+ 08 reporte enviado)
    noticias_pagina.dart        02 — pendiente
    comercio_pagina.dart        03 — pendiente
```

Reglas para no romper nada:

1. Las pantallas **solo** hablan con `Repositorio` (`context.read<Repositorio>()`), nunca con
   Firestore directo. Si necesitas un dato nuevo, agrégalo a la interfaz y a **las dos**
   implementaciones (demo y Firestore).
2. Los valores que escribe la app (`tipo: 'bache'`, `estado: 'recibido'`...) son los mismos que
   lee el panel (`panel_nodex/lib/datos.ts`). No los cambies sin cambiar el panel.
3. Colores, tipografía y medidas salen de `nucleo/tema`. Nada de `Color(0xFF...)` sueltos.
4. Antes de subir: `flutter analyze` sin avisos y `flutter test` en verde.

## Qué ya funciona (modo demo)

Las 16 pantallas del Figma:

- **Registro (09–12):** con GPS y elección de colonia.
- **01 Inicio:** agua del día (abre 13), "Tu municipio" con los módulos contratados, noticias y accesos.
- **02 Noticias:** filtros por categoría, nota completa, avisos parroquiales y esquelas.
- **03 Comercio:** buscador, filtros, WhatsApp, bolsa de trabajo y clasificados.
- **04 Servicios:** reporte ciudadano con foto, GPS y folio (08); directorio de emergencia.
- **05 Feria:** programa real 2026 (30 oct – 12 nov), plaza / plaza de toros, votación de
  Srita. Teocaltiche y Miss Chiquitita (un voto por vecino), compra simulada con pase QR que valida
  el escáner del panel (`MITEOCAL1|municipio|folio|pagoId`).
- **06 Paisanos:** transmisión, trámites a distancia y negocios que envían a la familia.
- **07 Selector de colonia**.
- **13 Agua:** estado, bitácora del día y cortes programados.
- **14 Basura en vivo:** mapa ilustrado con el camión, llegada estimada y días de recolección.
- **15 Cierres y obras:** mapa, filtros y ruta alterna.
- **16 Escuelas:** seguir planteles (se guarda en el teléfono) y sus avisos.

Los nombres de negocios, escuelas y personas del demo son **inventados**, salvo el programa de la
feria y las candidatas, que dio el municipio. Precios y horarios de la Plaza de Toros: por confirmar.

## Pendiente (para repartir)

| Tarea | Dónde |
|---|---|
| Firebase Auth con números de prueba (sin SMS reales) | 10, 11 |
| Ubicación real del camión (GPS de la unidad) | 14 |
| Notificaciones push (FCM) para los interruptores "Avísame" | 13, 14, 16 |
| "Mis reportes" con su estado | — |
| Colecciones del panel que faltan: esquelas, vacantes, clasificados, escuelas, rutas | Firestore |
| Empaquetar Inter en `assets/` | — |

Con Firebase en el plan gratis (Spark) no hay Storage ni Cloud Functions: la foto viaja
reducida dentro del documento del reporte, y lo que necesite servidor (asignar el municipio al
vecino, clasificar la foto con IA) va en rutas del panel en Vercel.
