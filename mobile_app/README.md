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

## Qué ya funciona

- Registro completo (09–12) con GPS y elección de colonia.
- Inicio: saludo, colonia (se cambia tocándola), agua del día, noticias y accesos directos.
- Servicios: reporte ciudadano con tipo, foto (cámara o galería), descripción, GPS y folio;
  directorio de emergencia con marcado directo.

## Pendiente (para repartir)

| Tarea | Pantallas del Figma |
|---|---|
| Noticias y comunidad | 02 |
| Cierres y obras (mapa) | 15 |
| Basura en vivo (mapa) | 14 |
| Feria: programa y pase con QR | 05 |
| "Mis reportes" con su estado | — |
| Firebase Auth con números de prueba (sin SMS reales) | 10, 11 |
| Empaquetar Inter en `assets/` (no descargarla al abrir) | — |

Con Firebase en el plan gratis (Spark) no hay Storage ni Cloud Functions: la foto viaja
reducida dentro del documento del reporte, y lo que necesite servidor (asignar el municipio al
vecino, clasificar la foto con IA) va en rutas del panel en Vercel.
