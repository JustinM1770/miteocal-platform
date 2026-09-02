# Sistema de diseño

Valores extraídos de las variables del archivo de Figma. Son la fuente de verdad para el
tema de Flutter y para los tokens CSS del panel de administración.

## Color

| Token | Hex | Uso |
|-------|-----|-----|
| `brand/primary` | `#1552E0` | Botones primarios, enlaces, tarjeta de agua |
| `brand/soft` | `#EDF2FE` | Fondos informativos, chips activos |
| `text/primary` | `#0E1116` | Títulos y texto principal |
| `text/secondary` | `#6B7280` | Texto de apoyo y metadatos |
| `text/inverse` | `#FFFFFF` | Texto sobre fondo oscuro o de marca |
| `bg/canvas` | `#FFFFFF` | Superficie de tarjetas |
| `bg/subtle` | `#F5F6F8` | Fondo de pantalla |
| `bg/inverse` | `#0E1116` | Video en vivo, bloque del portal municipal |
| `border/hairline` | `#E8EAEE` | Bordes y separadores de 1 px |
| `status/success` | `#12A150` | "Servicio activo", "Disponible" |
| `status/successSoft` | `#E6F6EE` | Fondo de etiquetas positivas |
| `status/danger` | `#D93A3A` | Fallas, calles cerradas, badge "EN VIVO" |
| `accent/whatsapp` | `#25D366` | Botones "Contactar por WhatsApp" |

## Tipografía

Familia principal **Inter**; **DM Sans** para etiquetas de acento.

| Estilo | Tamaño / interlineado | Peso | Tracking |
|--------|----------------------|------|----------|
| Heading | 17 / 22 | 600 | −0.20 |
| Body Strong | 15 / 22 | 500 | −0.10 |
| Caption Strong | 13 / 18 | 600 | 0 |
| Micro | 11 / 14 | 500 | +0.20 |

## Layout

- Ancho base: 390 px (iPhone 14/15).
- Margen lateral: 20 px. Ancho de tarjeta: 350 px.
- Padding interno de tarjeta: 14–16 px.
- Espaciado en múltiplos de 4; separación entre secciones de 20–24 px.
- Radios: 12 px en listas, 16 px en tarjetas destacadas, píldora en chips y badges.

## Componentes recurrentes

- **Tarjeta de estado** — bloque azul de marca con horario grande y tres métricas
  (presión, calidad, cobertura).
- **Fila de lista** — icono en cuadro de 38 px, título, subtítulo y chevron de 16 px.
- **Chip de filtro** — píldora; activa en `brand/primary`, inactiva en `bg/subtle`.
- **Badge de estado** — texto Micro sobre `successSoft` o fondo `danger`.
- **Botón de WhatsApp** — ancho completo, 40 px de alto, `accent/whatsapp`, con icono.
- **Encabezado de sección** — título Heading a la izquierda, enlace "Ver todos" a la derecha.
- **Barra de pestañas** — cuatro destinos: Inicio, Noticias, Comercio, Servicios.
