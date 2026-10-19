# Tareas · MiTeocal / Nodex

Estado al 15 de octubre de 2026. Marca `[x]` al terminar y sube el cambio.

## 🔴 Bloqueantes · cuentas del proyecto (Justin)

- [ ] **Subir la rama**: `git push origin feature/panel-nodex` y abrir PR a `develop`.
- [ ] **Publicar reglas, índices y Storage** (arregla la app Flutter, que hoy no puede leer el agua por las reglas viejas):
      `cd backend && firebase deploy --only firestore:rules,firestore:indexes,storage --project miteocal`
- [ ] **Activar Storage** en la consola de Firebase.
- [ ] **Llave de servicio** (Consola → Configuración → Cuentas de servicio) guardada FUERA del repo.
- [ ] **Sembrar el municipio y darse admin**:
      `FIRESTORE_EMULATOR_HOST= node seed/sembrar.js --produccion`
      `node seed/crear-funcionario.js <correo> --rol admin --area "Presidencia" --produccion`
- [ ] **Plan Blaze y Cloud Functions**: `firebase deploy --only functions --project miteocal`
- [ ] **Respaldos**: crear bucket `miteocal-respaldos` (borrado a 30 días) y dar a la cuenta de Functions el rol *Cloud Datastore Import Export Admin*.
- [ ] **Restringir el token de Mapbox** a `miteocal-panel.vercel.app` y al dominio final.
- [x] Decidido: el panel es `panel_nodex`; el `admin_panel` se retiró (el importador CSV y el encendido de módulos viven en `panel_nodex`).

## 🟠 App ciudadana · Flutter (`mobile_app/`)

Lo que el panel ya publica y la app todavía no muestra. Contrato de datos en `panel_nodex/README.md`.

- [ ] Registro con SMS y elección de colonia; escribir en `usuarios/{uid}`: `nombre`, `telefono`, `colonia`, `tipo` (`local`/`paisano`), `origen`, `escuelas[]`, `fcmTokens[]`.
- [ ] Notificaciones push (FCM): guardar el token; el envío ya lo hacen las Functions.
- [ ] Reportes con foto (Storage `municipios/{id}/reportes/{folio}/`) y GPS (`geo`), con `uid` y `estado: 'recibido'`.
- [ ] Noticias, cierres (`obras`), comercios (botón «Pedir en línea» con `?ref=miteocal`), basura (`rutasBasura`) y emergencias (`config/emergencias`).
- [ ] Feria: cartelera, compra de boletos, pase con QR (`MITEOCAL1|municipio|folio|pagoId`) y voto (`votos/{certamen}_{uid}`).
- [ ] Trámites con documentos y citas; calificar la app (`calificaciones`).
- [ ] Alcohol: categoría solo tras confirmar +18; ocultarla si `config/leySeca.activa`.
- [x] El agua «sin dato» ya no se muestra como servicio activo.

## 🟡 Datos reales del municipio

- [ ] Colonias: horario de agua, pozo y centro en el mapa (Administración → Colonias y barrios, o Importar CSV).
- [ ] Teléfonos de emergencia confirmados con cada dependencia.
- [ ] Escuelas (Importar CSV), padrón de comercios con licencias y licencias de alcohol.
- [ ] Rutas reales del camión de basura (Servicios → Basura).
- [ ] Programa de la feria: artistas, fechas, precios y cupos; candidatas con autorización de foto.

## 🟡 Ayuntamiento y legal (Justin)

- [ ] Revisión jurídica de `docs/legal/aviso-de-privacidad.md` y `docs/legal/terminos-de-uso.md`.
- [ ] Cuenta de cobro (Clip o Mercado Pago) **a nombre del Ayuntamiento**, definida con Tesorería.
- [ ] Reglamento de venta de alcohol: horarios y requisitos para la categoría +18.
- [ ] Transparencia sobre qboard.mx en el contrato (participación opcional de los comercios).
- [ ] **Permisos por área**: definir qué ve cada área (pendiente de decisión).

## ⚪ Antes de abrir al público

- [ ] Proyecto de pruebas `miteocal-dev` separado del real.
- [ ] Dominio propio para el panel y la app.
- [ ] Monitoreo de errores (por ejemplo, Sentry).
- [ ] Integración real con qboard.mx (ventas por mes en `comercios/{id}.metricas`).
- [ ] Pasarela de pago real para boletos y trámites (Cloud Functions `crearCobro` / `webhook`).
- [ ] Manual corto y capacitación del personal.
