# Nodex · Panel del Ayuntamiento

Panel interno donde cada dependencia publica lo que los vecinos ven en la app.
Next.js 15 (App Router) + Firebase Auth + Firestore.

## Arrancar

```bash
npm install
cp .env.local.example .env.local   # llenar con los datos de Firebase
npm run dev                        # http://localhost:3000
```

**Sin `.env.local` el panel corre igual, en modo demo**, con datos en memoria y
login que acepta cualquier contraseña. Sirve para enseñar el diseño sin
configurar nada. En cuanto llenes las variables, se conecta solo.

## Qué hay

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión, con estado de error |
| `/panel` | Escritorio — espejo de lo que ven los ciudadanos, aviso de dato caducado, métricas, actividad reciente, modal de corrección |
| `/panel/agua` | Publicar estado — formulario, vista previa en vivo, programación y modal de confirmación de envío |

Las demás entradas del menú están marcadas como fase 2 y no navegan.

## Firebase: qué activar

1. **Authentication** → proveedor *Correo electrónico/contraseña*. Crea a mano
   los usuarios del ayuntamiento; no hay registro abierto a propósito.
2. **Firestore** → modo producción, y publica `firestore.rules`.
3. Colección `usuarios`, un documento por persona con el **uid de Auth** como id:
   ```json
   { "nombre": "Laura M.", "rol": "operador", "area": "Agua Potable", "municipioId": "teocaltiche" }
   ```
   Da de alta **dos operadores desde el día uno**: si solo hay uno y se enferma,
   la app se queda congelada.

## Modelo de datos

Una sola colección `publicaciones` para todo lo que sale a la app o se queda
interno. Agua, cortes, cartelera de feria y avisos internos son el mismo
documento con distinto `tipo`. Agregar un módulo nuevo es contenido, no código.

```ts
{
  municipioId, tipo, canal,        // canal: 'publico' | 'interno'
  colonia, estado, titulo, mensaje, horaEstimada,
  publicarEn,                      // programación: sale a esta hora
  caducaEn,                        // después de aquí la app dice «sin información»
  notificar, alcance,
  autorNombre, autorUid, creadoEn
}
```

Tres decisiones que conviene no revertir:

- **`municipioId` en todo**, aunque hoy solo exista Teocaltiche. Es lo que
  permite vender el panel a otro municipio sin migrar nada.
- **Nada se edita ni se borra.** Una corrección es una publicación nueva, y la
  bitácora de auditoría es inmutable. Es lo que protege al equipo el día que
  alguien pregunte quién publicó un dato equivocado.
- **`caducaEn`.** Un dato viejo presentado como actual es peor que no tener dato.

## Lo que falta y necesita backend

Esto es front. Tres piezas piden Cloud Functions:

1. **Envío real del push.** Una función que escuche `publicaciones` con
   `notificar: true` y mande el mensaje por FCM a los tokens de esa colonia.
   Hoy el panel deja el registro listo y la auditoría escrita.
2. **Publicación programada.** Una función con `onSchedule` cada minuto que
   revise qué toca publicar. El campo `publicarEn` ya existe.
3. **Rol y área reales.** `lib/auth.tsx` deja `operador` por defecto; falta
   leerlos de la colección `usuarios`.
