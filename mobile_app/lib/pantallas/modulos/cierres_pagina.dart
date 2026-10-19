import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../datos/modelos/colonia.dart';
import '../../nucleo/widgets/comunes.dart';
import '../../nucleo/widgets/mapa.dart';

/// 15 · Cierres y obras
///
/// TODO(Mapbox): el mapa es la ilustracion del Figma. Con datos reales se
/// dibujan los trazos que el panel guarda en obras/{id}.geo.
class CierresPagina extends StatefulWidget {
  const CierresPagina({super.key, this.direccion = '', this.colonia});

  final String direccion;

  /// Centroide de la colonia del vecino ("Tu domicilio" en el mapa).
  final Colonia? colonia;

  @override
  State<CierresPagina> createState() => _CierresPaginaState();
}

class _CierresPaginaState extends State<CierresPagina> {
  late final Future<List<Cierre>> _cierres = _cargar();

  /// Trazos ajustados a las calles, por id de cierre.
  final Map<String, List<LatLng>> _calles = {};

  Future<List<Cierre>> _cargar() async {
    final lista = await context.read<Repositorio>().cierres();
    for (final c in lista.where((c) => c.trazo.length >= 2)) {
      trazarPorCalles(c.trazo).then((t) {
        if (mounted) setState(() => _calles[c.id] = t);
      });
    }
    return lista;
  }

  static Color colorDe(Cierre c) =>
      c.esObra ? const Color(0xFFD98A1A) : const Color(0xFFD93A3A);

  Widget _mapa(List<Cierre> visibles, Widget ilustracion) {
    final col = widget.colonia;
    final casa = col != null && col.tieneCentro
        ? LatLng(col.lat!, col.lng!)
        : centroMunicipio;
    return MapaMunicipio(
      centro: casa,
      zoom: 15.3,
      alto: 240,
      trazos: [
        for (final c in visibles)
          if ((_calles[c.id] ?? c.trazo).length >= 2)
            Polyline(
              points: _calles[c.id] ?? c.trazo,
              strokeWidth: 7,
              color: colorDe(c).withValues(alpha: 0.85),
            ),
      ],
      marcadores: [
        for (final c in visibles)
          if (c.trazo.length >= 2)
            Marker(
              point: puntoEnRuta(_calles[c.id] ?? c.trazo, 0.5),
              width: 26,
              height: 26,
              child: PuntoMapa(color: colorDe(c), tam: 24),
            ),
        Marker(
          point: casa,
          width: 110,
          height: 56,
          alignment: Alignment.topCenter,
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              EtiquetaMapa(texto: 'Tu domicilio'),
              SizedBox(height: 4),
              PuntoMapa(color: Colores.primary),
            ],
          ),
        ),
      ],
      respaldo: ilustracion,
    );
  }

  String _filtro = 'Todos';

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Cierre>>(
      future: _cierres,
      builder: (context, s) {
        final todos = s.data ?? const <Cierre>[];
        final visibles = switch (_filtro) {
          'Cierres' => todos.where((c) => !c.esObra).toList(),
          'Obras' => todos.where((c) => c.esObra).toList(),
          _ => todos,
        };
        return PantallaModulo(
          titulo: 'Cierres y obras',
          subtitulo: widget.direccion.isNotEmpty
              ? 'A menos de 1 km de ${widget.direccion}'
              : 'Cerca de tu domicilio',
          hijos: [
            Lateral(
              child: _mapa(
                visibles,
                ClipRRect(
                  borderRadius: BorderRadius.circular(Medidas.radioModulo),
                  child: SizedBox(
                    height: 218,
                    child: CustomPaint(
                      painter: _MapaCierres(cierres: todos),
                      child: Align(
                        alignment: Alignment.bottomLeft,
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(10, 6, 11, 6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(999),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x1F000000),
                                  blurRadius: 6,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: const BoxDecoration(
                                    color: Colores.primary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 7),
                                Text(
                                  'Tu domicilio',
                                  style: Tipografia.micro.copyWith(
                                    color: Colores.textoPrimario,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            FiltroChips(
              opciones: const ['Todos', 'Cierres', 'Obras'],
              elegida: _filtro,
              alElegir: (f) => setState(() => _filtro = f),
            ),
            if (s.connectionState != ConnectionState.done)
              const Center(child: CircularProgressIndicator())
            else if (visibles.isEmpty)
              const Vacio(texto: 'No hay cierres ni obras cerca de ti. 🎉')
            else
              Lateral(
                child: Column(
                  children: [
                    for (final (i, c) in visibles.indexed) ...[
                      if (i > 0) const SizedBox(height: 10),
                      _TarjetaCierre(cierre: c),
                    ],
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _TarjetaCierre extends StatelessWidget {
  const _TarjetaCierre({required this.cierre});

  final Cierre cierre;

  @override
  Widget build(BuildContext context) {
    final c = cierre;
    final primary = Theme.of(context).colorScheme.primary;
    final (etiqueta, fondo, color) = switch (c.tipo) {
      TipoCierre.total => (
        'Cierre total',
        Colores.peligroSuave,
        const Color(0xFFB32020),
      ),
      TipoCierre.temporal => (
        'Cierre temporal',
        Colores.peligroSuave,
        const Color(0xFFB32020),
      ),
      TipoCierre.obra => ('Obra', Colores.avisoSuave, const Color(0xFF9A5B08)),
    };
    return TarjetaBorde(
      relleno: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Pastilla(texto: etiqueta, fondo: fondo, color: color, radio: 7),
              if (c.distanciaM != null)
                Text('${c.distanciaM} m', style: Tipografia.micro),
            ],
          ),
          const SizedBox(height: 10),
          Text(c.calle, style: Tipografia.cuerpo),
          if (c.detalle.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(c.detalle, style: Tipografia.micro),
          ],
          if (c.vigencia.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(
                  LucideIcons.calendar,
                  size: 15,
                  color: Colores.textoSecundario,
                ),
                const SizedBox(width: 7),
                Text(c.vigencia, style: Tipografia.micro),
              ],
            ),
          ],
          if (c.rutaAlterna.isNotEmpty) ...[
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () => showModalBottomSheet<void>(
                context: context,
                showDragHandle: true,
                builder: (_) => SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Ruta alterna', style: Tipografia.titulo),
                        const SizedBox(height: 8),
                        Text(c.rutaAlterna, style: Tipografia.cuerpoNormal),
                      ],
                    ),
                  ),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Ver ruta alterna',
                    style: Tipografia.subtitulo.copyWith(color: primary),
                  ),
                  const SizedBox(width: 5),
                  Icon(LucideIcons.chevronRight, size: 13, color: primary),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Ilustracion de calles con los tramos cerrados (rojo) y obras (ambar).
class _MapaCierres extends CustomPainter {
  _MapaCierres({required this.cierres});

  final List<Cierre> cierres;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFFEDEFF3),
    );
    final calle = Paint()..color = Colors.white;
    final manzana = Paint()..color = const Color(0xFFDFE3EA);
    final xs = [size.width * 0.27, size.width * 0.74];
    final ys = [size.height * 0.30, size.height * 0.68];
    for (final x in xs) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 14, size.height), calle);
    }
    for (final y in ys) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 12), calle);
    }
    final cx = [0.0, xs[0] + 14, xs[1] + 14];
    final fx = [xs[0], xs[1], size.width];
    final cy = [0.0, ys[0] + 12, ys[1] + 12];
    final fy = [ys[0], ys[1], size.height];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        final r = Rect.fromLTRB(cx[i] + 12, cy[j] + 12, fx[i] - 12, fy[j] - 12);
        if (r.width > 0 && r.height > 0) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(r, const Radius.circular(6)),
            manzana,
          );
        }
      }
    }

    void tramo(Rect r, Color color) {
      canvas.drawRect(r, Paint()..color = color.withValues(alpha: 0.85));
      canvas.drawCircle(r.center, 11, Paint()..color = color);
      canvas.drawCircle(
        r.center,
        11,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3,
      );
    }

    final hayCierre = cierres.any((c) => !c.esObra);
    final hayObra = cierres.any((c) => c.esObra);
    if (hayCierre) {
      tramo(
        Rect.fromLTWH(xs[0] + 50, ys[0], xs[1] - xs[0] - 50, 12),
        const Color(0xFFD93A3A),
      );
    }
    if (hayObra) {
      tramo(
        Rect.fromLTWH(xs[1] - 10, ys[1], size.width - xs[1] - 10, 12),
        const Color(0xFFD98A1A),
      );
    }

    final casa = Offset(xs[0] + 7, (ys[0] + ys[1]) / 2 + 6);
    canvas.drawCircle(casa, 9, Paint()..color = const Color(0xFF1552E0));
    canvas.drawCircle(
      casa,
      9,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(_MapaCierres old) => old.cierres != cierres;
}
