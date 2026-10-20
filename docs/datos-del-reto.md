# Datos del reto · plan para el 3 de noviembre

Responsable: Jona. Los datos y directrices del Reto 01 llegan el **3 nov**; este
documento dice qué hacer con ellos ese día para no empezar de cero.

## 1. Primer vistazo (30 min)

Con el archivo en la mano, antes de programar nada, anotar aquí abajo:

- [ ] Formato (CSV, Excel, JSON, API) y tamaño (renglones, periodo que cubre).
- [ ] De qué municipio o municipios son. Si no es Teocaltiche, las colonias no
      coinciden con `config/colonias` y el mapa usa el GPS de cada renglón.
- [ ] Qué columnas trae y cuáles corresponden a lo que la app ya maneja
      (tabla de la sección 3).
- [ ] Datos personales (nombres, teléfonos, CURP): **no** se suben a Firestore
      ni al repo; se quitan antes de cualquier otra cosa.
- [ ] Calidad: renglones sin fecha, colonias escritas de varias formas,
      coordenadas en 0,0 o fuera del municipio.

## 2. Análisis inmediato, sin programar

El panel ya lo hace: **Vecinos → Zonas críticas → «Analizar un CSV externo»**.

1. Si viene en Excel, guardarlo como CSV (UTF-8).
2. Subirlo. El archivo se lee solo en el navegador; no se guarda en ningún lado.
3. El aviso azul dice qué columna usó para cada dato y qué renglones descartó.
   Si una columna no se reconoció, renombrar el encabezado en el CSV
   (ver sinónimos en `panel_nodex/lib/zonas.ts`, `SINONIMOS`).
4. Con 26 o 52 semanas, revisar: zonas críticas, tendencia por semana, tipos,
   tiempo de respuesta y de solución. «Exportar por colonia» baja la tabla para
   el documento técnico.

Columnas mínimas: una **fecha** y la **colonia** o las **coordenadas**.
Opcionales: tipo, estado, fecha de primera respuesta y fecha de cierre.

## 3. Cómo encaja con lo que ya existe

| Si el reto trae… | Entra en | Qué se ve |
|---|---|---|
| Reportes o quejas ciudadanas (fecha, colonia, tipo, estado) | `municipios/{id}/reportes` (mismo formato que los de la app) | Reportes, Zonas críticas, métricas de impacto |
| Cortes o tandeo de agua por colonia | `publicaciones` tipo `agua` / `corte` y `config/colonias` (horario, pozo) | Agua en la app: «Vuelve hoy ~16:00», cortes programados |
| Rutas o frecuencias de recolección | `rutasBasura` | Basura en vivo, días de recolección |
| Obras, cierres viales | `obras` | Cierres y obras con mapa |
| Escuelas / planteles | Importar CSV → Escuelas | Avisos de los planteles que sigue el vecino |
| Colonias con coordenadas o polígonos | Importar CSV → Colonias y barrios | Centros del mapa de calor y avisos por colonia |
| Población por colonia | `config/estadisticas` | Reportes por cada 1 000 habitantes (ver sección 4) |

Si un dato no cabe en esta tabla, se propone en la sección 5 antes de crear
colecciones nuevas.

## 4. Propuestas según lo que llegue

- **Tasa por habitante.** Si traen población por colonia, la zona crítica se
  calcula por cada 1 000 habitantes, no por conteo bruto, para que el Centro no
  salga siempre primero solo por ser el más poblado.
- **Línea base contra la app.** Los datos históricos del reto (antes de la app)
  son la referencia: comparar tiempo de respuesta y reportes atendidos antes y
  después es la métrica de impacto del video y del documento técnico.
- **Avisos preventivos.** Una colonia que lleva 2 semanas al alza en fugas o
  drenaje recibe un aviso en la app («Estamos revisando la red de tu colonia»)
  antes de que lleguen más reportes.
- **Prioridad de cuadrillas.** El orden de la lista «Zonas críticas» sirve como
  agenda semanal de Obras Públicas y SAPAS.

Todo lo anterior es estadística simple (conteos, promedios, desviación
estándar) para que cualquiera del Ayuntamiento pueda revisarlo a mano. La
clasificación con IA de cada reporte es la parte de Omar.

## 5. Hallazgos del 3 nov

_(llenar ese día)_

- Fuente y periodo:
- Colonias o zonas críticas:
- Tendencia:
- Tiempo de respuesta / solución:
- Qué entra a la app y cómo:
