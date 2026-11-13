import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../tema/tema.dart';
import 'comunes.dart';

/// Piezas del estilo bento (Figma «01 · Inicio — Bento»): tarjetas blancas sin
/// filete sobre el gris, íconos de un solo color en círculo y etiquetas en
/// Geist Mono.

/// Tarjeta blanca redondeada; con [alTocar] responde al toque.
class Bento extends StatelessWidget {
  const Bento({
    super.key,
    required this.child,
    this.alTocar,
    this.relleno = const EdgeInsets.all(16),
    this.color = Colores.fondoTarjeta,
    this.radio = 24,
  });

  final Widget child;
  final VoidCallback? alTocar;
  final EdgeInsets relleno;
  final Color color;
  final double radio;

  @override
  Widget build(BuildContext context) => Material(
    color: color,
    borderRadius: BorderRadius.circular(radio),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: alTocar,
      child: Padding(padding: relleno, child: child),
    ),
  );
}

/// Ícono dentro de un círculo.
class Burbuja extends StatelessWidget {
  const Burbuja(
    this.icono, {
    super.key,
    this.tam = 36,
    this.fondo = Colores.fondoSutil,
    this.color = Colores.textoPrimario,
  });

  final IconData icono;
  final double tam;
  final Color fondo;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: tam,
    height: tam,
    decoration: BoxDecoration(color: fondo, shape: BoxShape.circle),
    child: Icon(icono, size: tam * 0.48, color: color),
  );
}

/// Etiqueta en mayúsculas y Geist Mono ("BASURA · HOY").
class Kicker extends StatelessWidget {
  const Kicker(this.texto, {super.key, this.color = Colores.textoSecundario});
  final String texto;
  final Color color;

  @override
  Widget build(BuildContext context) => Text(
    texto.toUpperCase(),
    style: Tipografia.etiqueta.copyWith(color: color, fontSize: 10.5),
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
  );
}

/// Punto de color para estados ("● Sin servicio").
class Punto extends StatelessWidget {
  const Punto(this.color, {super.key, this.tam = 7});
  final Color color;
  final double tam;

  @override
  Widget build(BuildContext context) => Container(
    width: tam,
    height: tam,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

/// "Cerca de ti ............ Ver mapa"
class TituloBento extends StatelessWidget {
  const TituloBento(this.titulo, {super.key, this.accion, this.alTocar});
  final String titulo;
  final String? accion;
  final VoidCallback? alTocar;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(6, 18, 6, 10),
    child: Row(
      children: [
        Expanded(child: Text(titulo, style: Tipografia.titulo)),
        if (accion != null)
          GestureDetector(
            onTap: alTocar,
            behavior: HitTestBehavior.opaque,
            child: Text(
              accion!,
              style: Tipografia.subtitulo.copyWith(
                color: Colores.textoSecundario,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
      ],
    ),
  );
}

/// Botón redondo blanco (regresar, campana).
class BotonCirculo extends StatelessWidget {
  const BotonCirculo(
    this.icono, {
    super.key,
    required this.alTocar,
    this.tam = 44,
    this.punto = false,
  });

  final IconData icono;
  final VoidCallback alTocar;
  final double tam;

  /// Puntito rojo de "hay algo nuevo"
  final bool punto;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: alTocar,
    child: Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: tam,
          height: tam,
          decoration: const BoxDecoration(
            color: Colores.fondoTarjeta,
            shape: BoxShape.circle,
          ),
          child: Icon(icono, size: tam * 0.45, color: Colores.textoPrimario),
        ),
        if (punto)
          const Positioned(
            right: 10,
            top: 10,
            child: Punto(Colores.peligro, tam: 8),
          ),
      ],
    ),
  );
}

/// Pantalla secundaria con regresar, título grande y contenido con scroll.
class PantallaBento extends StatelessWidget {
  const PantallaBento({
    super.key,
    required this.titulo,
    this.subtitulo,
    required this.hijos,
    this.pie,
  });

  final String titulo;
  final String? subtitulo;
  final List<Widget> hijos;

  /// Botón fijo abajo (por ejemplo "Guardar colonia")
  final Widget? pie;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colores.fondoPantalla,
    body: VeloSuperior(
      child: SafeArea(
        bottom: false,
        child: ListView(
          padding: EdgeInsets.fromLTRB(
            14,
            8,
            14,
            32 + MediaQuery.paddingOf(context).bottom + (pie == null ? 0 : 76),
          ),
          children: [
            Row(
              children: [
                BotonCirculo(
                  LucideIcons.chevronLeft,
                  tam: 42,
                  alTocar: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 18, 6, 6),
              child: Text(titulo, style: Tipografia.display),
            ),
            if (subtitulo != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 0, 6, 14),
                child: Text(subtitulo!, style: Tipografia.leyenda),
              ),
            ...hijos,
          ],
        ),
      ),
    ),
    bottomNavigationBar: pie == null
        ? null
        : SafeArea(
            minimum: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: pie!,
          ),
  );
}

/// Botón ancho tipo píldora (negro por defecto).
class BotonPildora extends StatelessWidget {
  const BotonPildora(
    this.texto, {
    super.key,
    required this.alTocar,
    this.fondo = Colores.fondoInverso,
    this.icono,
  });

  final String texto;
  final VoidCallback? alTocar;
  final Color fondo;
  final IconData? icono;

  @override
  Widget build(BuildContext context) => Material(
    color: alTocar == null ? Colores.textoSecundario : fondo,
    borderRadius: BorderRadius.circular(99),
    child: InkWell(
      borderRadius: BorderRadius.circular(99),
      onTap: alTocar,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              texto,
              style: Tipografia.cuerpo.copyWith(
                color: Colores.textoInverso,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (icono != null) ...[
              const SizedBox(width: 8),
              Icon(icono, size: 16, color: Colores.textoInverso),
            ],
          ],
        ),
      ),
    ),
  );
}

/// "hace 12 min", "hace 3 h", "ayer"
String haceTiempo(DateTime f) {
  final d = DateTime.now().difference(f);
  if (d.inMinutes < 1) return 'ahora';
  if (d.inMinutes < 60) return 'hace ${d.inMinutes} min';
  if (d.inHours < 24) return 'hace ${d.inHours} h';
  if (d.inDays == 1) return 'ayer';
  return 'hace ${d.inDays} días';
}
