# Hackathon Jalisco 2026 · Reto 01 Ciudades Inteligentes

Cada quien trabaja en **su rama** y abre un Pull Request hacia `hackathon`.
Justin revisa y une. Nadie sube directo a `hackathon` ni a `main`.

```bash
git clone https://github.com/JustinM1770/miteocal-platform.git
cd miteocal-platform
git checkout <tu-rama>        # santi · omar · jona · justin
```

App: ver `mobile_app/README.md` (`flutter run` corre en modo demo, sin Firebase).

## Fechas
| Fecha | Qué |
|---|---|
| **30 oct** | Pago y póster subidos |
| **3 nov** | Llegan los datos y directrices del reto |
| **15 nov** | Entrega en Drive: código, video, documento técnico, declaración de IA |
| 11–12 dic | Evaluación virtual (15 min) |

## Tareas

### Justin · coordinación y entrega
- Pago + póster (30 oct).
- Documento técnico, guion del video, declaración de uso de IA, créditos y fuentes.
- Carpeta de Drive con la estructura que pidan el 3 nov.
- Revisar y unir los Pull Requests.

### Santi · app (Flutter), experiencia de uso
- Ícono de la app y pantalla de arranque con el escudo.
- Carga con siluetas grises en lugar de la ruedita.
- Animaciones de transición (tarjeta → detalle) y listas escalonadas.
- Vibración ligera al votar, apartar boleto y enviar reporte.
- Selector de municipio al abrir (demo multi-municipio con un 2.º municipio de prueba).

### Omar · IA para reportes
- Clasificar la foto y el texto de cada reporte: tipo, urgencia y área responsable (Claude Haiku, desde una ruta del panel en Vercel; la llave nunca va en la app).
- Mostrar la sugerencia en el panel: "Sugerido: Fuga · urgencia alta (92 %)" con botón aceptar / corregir.
- Duplicados sin IA: mismo tipo, a menos de 50 m y en menos de 7 días.

### Jona · mapa de zonas críticas y métricas
- Mapa de calor de reportes por colonia en el panel y tendencia por semana (estadística, sin IA).
- Métricas de impacto: reportes atendidos, tiempo promedio de respuesta, colonias más afectadas.
- El 3 nov: analizar los datos del reto y proponer cómo entran en la app.

## Reglas
- Nada de llaves ni `.env` en el repo. El token de Mapbox va en `mobile_app/.env` (ver `.env.example`).
- Antes del PR: `flutter analyze` y `flutter test` en verde (app) / `npm run build` (panel).
