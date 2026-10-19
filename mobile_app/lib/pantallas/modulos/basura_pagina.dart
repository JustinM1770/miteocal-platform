import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/colonia.dart';
import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/comunes.dart';

/// 14 · Basura en vivo
///
/// TODO(Mapbox): hoy el mapa es la ilustracion del Figma con el camion
/// avanzando simulado. Con la ubicacion real de la unidad se cambia por un
/// mapa de Mapbox (mismo token que el panel).
class BasuraPagina extends StatefulWidget {
  const BasuraPagina({
    super.key,
    this.colonia,
    this.direccion = '',
    this.alReportar,
  });

  final Colonia? colonia;
  final String direccion;

  /// "¿No pasó el camión? Reportar" → reporte tipo basura.
  final VoidCallback? alReportar;

  @override
  State<BasuraPagina> createState() => _BasuraPaginaState();
}

class _BasuraPaginaState extends State<BasuraPagina>
    with SingleTickerProviderStateMixin {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Future<RutaBasura?> _ruta = _repo.rutaBasura(
    widget.colonia?.id ?? '',
  );

  // Demo: el camion recorre la ruta en un ciclo para que se vea "en vivo".
  late final AnimationController _avance = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 40),
  )..repeat();

  @override
  void dispose() {
    _avance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<RutaBasura?>(
      future: _ruta,
      builder: (context, s) {
        final r = s.data;
        return PantallaModulo(
          titulo: 'Camión de basura',
          subtitulo: r == null
              ? 'Recolección en tu colonia'
              : '${r.nombre} · ${r.unidad}',
          hijos: [
            Lateral(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Medidas.radioModulo),
                child: SizedBox(
                  height: 296,
                  child: AnimatedBuilder(
                    animation: _avance,
                    builder: (context, _) => CustomPaint(
                      painter: _MapaRuta(
                        avance: r?.minutos == null ? 0 : _avance.value,
                      ),
                      child: Stack(
                        children: [
                          const Positioned(
                            left: 66,
                            top: 95,
                            child: _Marcador(texto: 'Tu casa'),
                          ),
                          if (r?.minutos != null)
                            Positioned(
                              left: 196,
                              top: 26,
                              child: _Marcador(
                                texto: 'Llega ~${_horaLlegada(r!.minutos!)}',
                                verde: true,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            if (r != null)
              Lateral(
                child: _Llegada(ruta: r, direccion: widget.direccion),
              ),
            const InterruptorAviso(
              titulo: 'Avísame 10 minutos antes',
              detalle: 'Para que saques la basura a tiempo',
            ),
            if (r != null)
              Lateral(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DÍAS DE RECOLECCIÓN EN TU CALLE',
                      style: Tipografia.etiqueta,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        for (final (i, d) in const [
                          'L',
                          'M',
                          'X',
                          'J',
                          'V',
                          'S',
                          'D',
                        ].indexed) ...[
                          if (i > 0) const SizedBox(width: 8),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: r.dias.contains(i + 1)
                                    ? Colores.exito
                                    : Colores.fondoSutil,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                d,
                                style: Tipografia.subtitulo.copyWith(
                                  color: r.dias.contains(i + 1)
                                      ? Colors.white
                                      : Colores.textoSecundario,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: widget.alReportar,
                      child: Text.rich(
                        TextSpan(
                          style: Tipografia.micro,
                          children: [
                            const TextSpan(text: '¿No pasó el camión?  '),
                            TextSpan(
                              text: 'Reportar',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else if (s.connectionState == ConnectionState.done)
              const Vacio(
                texto:
                    'El municipio aún no registra la ruta de recolección de tu colonia.',
              ),
          ],
        );
      },
    );
  }

  static String _horaLlegada(int minutos) {
    final t = DateTime.now().add(Duration(minutes: minutos));
    return '${t.hour}:${t.minute.toString().padLeft(2, '0')}';
  }
}

class _Llegada extends StatelessWidget {
  const _Llegada({required this.ruta, required this.direccion});

  final RutaBasura ruta;
  final String direccion;

  @override
  Widget build(BuildContext context) {
    final m = ruta.minutos;
    final dias = const [
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ];
    final proximo = ruta.dias.isEmpty
        ? null
        : ruta.dias.firstWhere(
            (d) => d > DateTime.now().weekday,
            orElse: () => ruta.dias.first,
          );

    return TarjetaBorde(
      relleno: const EdgeInsets.all(18),
      radio: Medidas.radioModulo,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('LLEGA A TU CALLE', style: Tipografia.etiqueta),
              if (m != null)
                Container(
                  padding: const EdgeInsets.fromLTRB(8, 4, 9, 4),
                  decoration: BoxDecoration(
                    color: Colores.peligroSuave,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 5,
                        height: 5,
                        decoration: const BoxDecoration(
                          color: Colores.peligro,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'EN VIVO',
                        style: Tipografia.micro.copyWith(
                          color: Colores.peligro,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            m != null
                ? 'En ~$m minutos'
                : proximo != null
                ? 'Pasa el ${dias[proximo - 1]}'
                : 'Sin ruta hoy',
            style: Tipografia.display,
          ),
          const SizedBox(height: 4),
          Text(
            m != null
                ? 'A ${ruta.cuadras} cuadras${direccion.isNotEmpty ? ' de $direccion' : ''} · avanza por ${ruta.avanzaPor}'
                : 'Hoy no hay recolección en ${ruta.llegaA.isNotEmpty ? ruta.llegaA : 'tu colonia'}.',
            style: Tipografia.leyenda,
          ),
        ],
      ),
    );
  }
}

class _Marcador extends StatelessWidget {
  const _Marcador({required this.texto, this.verde = false});

  final String texto;
  final bool verde;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: verde ? Colores.exito : Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x24000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        texto,
        style: Tipografia.micro.copyWith(
          color: verde ? Colors.white : Colores.textoPrimario,
        ),
      ),
    );
  }
}

/// Ilustracion de calles del Figma con la ruta del camion.
class _MapaRuta extends CustomPainter {
  _MapaRuta({required this.avance});

  /// 0..1 a lo largo de la ruta.
  final double avance;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFFEDEFF3),
    );
    final calle = Paint()..color = Colors.white;
    final manzana = Paint()..color = const Color(0xFFDFE3EA);

    // Calles: 2 verticales y 3 horizontales, como en el Figma.
    final xs = [size.width * 0.27, size.width * 0.66];
    final ys = [size.height * 0.24, size.height * 0.53, size.height * 0.84];
    for (final x in xs) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 14, size.height), calle);
    }
    for (final y in ys) {
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 12), calle);
    }
    // Manzanas
    final bordesX = [0.0, xs[0] + 14, xs[1] + 14, size.width];
    final finX = [xs[0], xs[1], size.width];
    final bordesY = [0.0, ys[0] + 12, ys[1] + 12];
    final finY = [ys[0], ys[1], ys[2]];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        final r = Rect.fromLTRB(
          bordesX[i] + 12,
          bordesY[j] + 12,
          finX[i] - 12,
          finY[j] - 12,
        );
        if (r.width > 0 && r.height > 0) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(r, const Radius.circular(6)),
            manzana,
          );
        }
      }
    }

    // Ruta: sube por la calle izquierda y dobla a la derecha hacia la casa.
    final verde = const Color(0xFF12A150);
    final casa = Offset(xs[0] + 7, ys[0] + 6);
    final ruta = Path()
      ..moveTo(xs[0] + 7, size.height)
      ..lineTo(xs[0] + 7, ys[1] + 6)
      ..lineTo(xs[1] + 7, ys[1] + 6)
      ..lineTo(xs[1] + 7, ys[0] + 6);
    canvas.drawPath(
      ruta,
      Paint()
        ..color = verde
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round,
    );

    // Tramo que falta: punteado del camion a la casa.
    final camion = ruta.computeMetrics().first;
    final punto = camion
        .getTangentForOffset(camion.length * (0.55 + 0.45 * avance))!
        .position;
    final pinturaPunto = Paint()..color = verde.withValues(alpha: 0.5);
    final dx = punto.dx - casa.dx;
    for (var t = 0.08; t < 0.95; t += 0.09) {
      canvas.drawCircle(Offset(casa.dx + dx * t, casa.dy), 2.5, pinturaPunto);
    }

    canvas.drawCircle(casa, 9, Paint()..color = const Color(0xFF1552E0));
    canvas.drawCircle(
      casa,
      9,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    canvas.drawCircle(punto, 12, Paint()..color = verde);
    canvas.drawCircle(
      punto,
      12,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
  }

  @override
  bool shouldRepaint(_MapaRuta old) => old.avance != avance;
}
