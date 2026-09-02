# Arquitectura multi-municipio

> **Principio rector:** un solo código base, N municipios. El código no sabe que existe
> Teocaltiche; solo sabe leer la configuración del municipio que le toca.
>
> Se construye **solo para Teocaltiche**, pero ninguna decisión cierra la puerta al
> siguiente municipio. Este documento define esas decisiones. Se leen antes de escribir la
> primera línea del sprint 3.

---

## 1. Las cinco reglas

| # | Regla | Por qué ahora y no después |
|---|-------|----------------------------|
| 1 | Todo dato de negocio cuelga de `municipios/{municipioId}` | Meter un campo de tenant a una base con datos reales obliga a migrar todo y reescribir cada consulta |
| 2 | La cadena `"Teocaltiche"` no aparece en el código | Dar de alta un municipio debe ser llenar un documento, no clonar el repositorio |
| 3 | Los colores y el escudo son dato, no código | El siguiente ayuntamiento va a querer su identidad sin recompilar la app |
| 4 | Las reglas de seguridad separan por municipio | Un funcionario jamás debe leer los reportes de otro municipio |
| 5 | Cada módulo se puede apagar por municipio | No todos tienen feria, ni recolección con ruta fija, ni transmisión en vivo |

---

## 2. Modelo de datos

```
municipios/{municipioId}
  ├── (documento raíz)          nombre, estado, activo, modulos, tema, contacto
  ├── config/
  │     ├── colonias            lista de colonias con centroide
  │     └── emergencias         directorio telefónico
  ├── agua/{yyyy-mm-dd}         horario, presion, calidad, cobertura, incidencias[]
  ├── rutasBasura/{rutaId}      dias[], colonias[], posicionActual
  ├── reportes/{folio}          uid, tipo, descripcion, foto, geo, estado, historial[]
  ├── comercios/{comercioId}    nombre, categoria, whatsapp, destacado, aceptaUsd
  ├── noticias/{noticiaId}      titulo, cuerpo, categoria, publicadaEn
  ├── obras/{obraId}            calle, tipo, inicio, fin, geo
  └── eventos/{eventoId}        feria y cartelera

usuarios/{uid}
  municipioId, colonia, nombre, telefono, rol, fcmTokens[]
```

**`municipioId` es un slug estable, no un número:** `teocaltiche`, `villa-hidalgo`,
`encarnacion-de-diaz`. Se escribe una vez y no se cambia nunca.

`usuarios` vive en la raíz, no dentro del municipio, porque una persona puede mudarse y
porque Firebase Auth ya es global. El vínculo lo lleva el campo `municipioId`.

### Documento raíz del municipio

```json
{
  "nombre": "Teocaltiche",
  "estado": "Jalisco",
  "activo": true,
  "modulos": {
    "agua": true, "basura": true, "reportes": true,
    "comercio": true, "noticias": true, "escuelas": true,
    "feria": true, "paisanos": true
  },
  "tema": {
    "primary": "#1552E0", "primarySoft": "#EDF2FE",
    "success": "#12A150", "danger": "#D93A3A"
  },
  "escudo": "gs://miteocal/municipios/teocaltiche/escudo.png",
  "contacto": { "portal": "https://...", "telefono": "+52..." }
}
```

---

## 3. Catálogo de módulos

La app dibuja sus pestañas y secciones leyendo `modulos`. Un módulo apagado no se
renderiza y sus datos no se consultan. Esto además define los paquetes comerciales.

| Módulo | Qué habilita | Depende de |
|--------|--------------|-----------|
| `agua` | Tarjeta de estado en Inicio + pantalla de detalle | Que el municipio opere su red |
| `basura` | Ruta en vivo y días de recolección | Que haya rutas definidas |
| `reportes` | Reporte ciudadano con foto y folio | — |
| `comercio` | Directorio, bolsa de trabajo, clasificados | — |
| `noticias` | Boletín, avisos parroquiales, esquelas | — |
| `escuelas` | Avisos de planteles | Convenio con las escuelas |
| `feria` | Cartelera, mapa del recinto, pase digital | Que exista la feria |
| `paisanos` | Transmisión en vivo y trámites a distancia | `comercio` activo |

**Regla de implementación:** ningún módulo puede asumir que otro está encendido. Si
`paisanos` necesita `comercio`, lo valida y se apaga solo.

---

## 4. Usuarios, roles y custom claims

El `municipioId` de una persona **nunca se lee de lo que manda el cliente**. Vive en un
*custom claim* del token de Firebase Auth, que solo una Cloud Function puede escribir.

| Rol | Puede |
|-----|-------|
| `vecino` | Leer el contenido público de su municipio; crear reportes y leer los suyos |
| `funcionario` | Todo lo del vecino, más publicar contenido y atender reportes de **su** municipio |
| `admin` | Lo del funcionario, más administrar usuarios de su municipio |
| `plataforma` | Nosotros. Dar de alta municipios. Es el único rol que cruza municipios |

```js
// Cloud Function, al asignar a una persona a un municipio
await admin.auth().setCustomUserClaims(uid, {
  municipioId: "teocaltiche",
  rol: "funcionario"
});
```

---

## 5. Reglas de seguridad de Firestore

Es la pieza que hace real la separación. Sin esto, "multi-municipio" es solo una carpeta.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function autenticado()      { return request.auth != null; }
    function claims()           { return request.auth.token; }
    function delMunicipio(mid)  { return autenticado() && claims().municipioId == mid; }
    function esFuncionario(mid) { return delMunicipio(mid)
                                    && claims().rol in ['funcionario', 'admin']; }

    match /municipios/{mid} {

      // La identidad del municipio es pública: la app la necesita antes del login
      allow read: if true;
      allow write: if claims().rol == 'plataforma';

      match /config/{doc} {
        allow read:  if true;
        allow write: if esFuncionario(mid);
      }

      match /agua/{fecha} {
        allow read:  if true;
        allow write: if esFuncionario(mid);
      }

      match /reportes/{folio} {
        allow create: if delMunicipio(mid)
                      && request.resource.data.uid == request.auth.uid;
        allow read:   if esFuncionario(mid)
                      || (delMunicipio(mid) && resource.data.uid == request.auth.uid);
        allow update: if esFuncionario(mid);
        allow delete: if false;
      }

      match /{coleccion}/{doc} {
        allow read:  if true;
        allow write: if esFuncionario(mid);
      }
    }

    match /usuarios/{uid} {
      allow read, write: if autenticado() && request.auth.uid == uid;
    }
  }
}
```

Tres cosas que no son obvias:

- **El municipio es legible sin sesión.** La app necesita el nombre, el escudo y el tema
  antes de que alguien se registre.
- **Los reportes no se borran.** `allow delete: if false`. Un reporte ciudadano es
  evidencia; se cierra, no se desaparece.
- **`request.resource.data` vs `resource.data`.** El primero es lo que se está escribiendo,
  el segundo lo que ya existe. Confundirlos es el error más común aquí.

---

## 6. Storage

```
municipios/{municipioId}/escudo.png
municipios/{municipioId}/reportes/{folio}/{n}.jpg
municipios/{municipioId}/comercios/{comercioId}/portada.jpg
```

Mismo criterio que Firestore: la primera carpeta siempre es el municipio, y las reglas de
Storage validan el claim contra esa carpeta.

---

## 7. Cómo se da de alta un municipio nuevo

Debe tomar menos de media hora. Si toma más, algo se rompió del principio.

1. Crear el documento `municipios/{slug}` con nombre, estado y `activo: false`
2. Definir qué módulos contrató en `modulos`
3. Cargar `config/colonias` y `config/emergencias`
4. Subir el escudo y fijar los colores en `tema`
5. Crear las cuentas del personal y asignarles el claim `municipioId` + `rol`
6. Capacitar al personal en el panel — **esto es lo que de verdad toma tiempo**
7. Cargar el contenido inicial: comercios, primeras noticias
8. Poner `activo: true` y anunciarlo

Los primeros clientes se atienden a mano. El alta automática se construye cuando haya
suficientes municipios para que valga la pena, no antes.

---

## 8. Revisión de Pull Requests: qué tumba el multi-municipio

Cuatro preguntas para cualquier PR que toque datos. Si alguna falla, el PR no se aprueba.

- [ ] ¿Toda consulta a Firestore parte de `municipios/{municipioId}`? Una consulta sin
      municipio es una fuga de datos entre clientes.
- [ ] ¿El `municipioId` viene del token o del estado de sesión, y **no** de un parámetro
      que mandó el cliente?
- [ ] ¿Hay algún nombre, teléfono, colonia o color escrito literalmente en el código, en
      vez de leerse de la configuración?
- [ ] Si agrega una sección visible, ¿respeta la bandera de su módulo en `modulos`?

---

## 9. Lo que NO se construye todavía

Facturación, alta automática de municipios, panel de super-administrador, subdominios por
municipio, planes de precios en la app, y app con marca propia por cliente (*flavors* de
Flutter).

Todo eso se construye **cuando exista un segundo municipio que ya firmó**, no antes.
Generalizar contra clientes imaginarios produce abstracciones que no le sirven a nadie y es
la forma más segura de no entregar a tiempo.

---

## 10. Decisiones abiertas

| Decisión | Estado |
|----------|--------|
| Nombre de la plataforma, distinto de "MiTeocal" | Pendiente. *MiTeocal* es el despliegue en Teocaltiche, no el producto |
| ¿Una app con selector de municipio, o una app por cliente? | Se arranca con **una sola app**. Los *flavors* se evalúan con el segundo cliente |
| Manejo de estado en Flutter | Se decide en el sprint 1 y se documenta aquí |
