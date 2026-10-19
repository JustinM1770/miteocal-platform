import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/agua.dart';
import '../../datos/modelos/colonia.dart';
import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/comunes.dart';

/// 13 · Agua: estado actual, bitacora del dia y cortes programados.
class AguaPagina extends StatefulWidget {
  const AguaPagina({super.key, this.colonia});

  final Colonia? colonia;

  @override
  State<AguaPagina> createState() => _AguaPaginaState();
}

class _AguaPaginaState extends State<AguaPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Stream<EstadoAgua?> _agua = _repo.aguaDeHoy();

  @override
  Widget build(BuildContext context) {
    final c = widget.colonia;
    final primary = Theme.of(context).colorScheme.primary;

    return PantallaModulo(
      titulo: 'Agua',
      subtitulo: c == null
          ? 'Servicio de agua potable'
          : [c.nombre, if (c.pozo.isNotEmpty) 'pozo ${c.pozo}'].join(' · '),
      hijos: [
        Lateral(
          child: StreamBuilder<EstadoAgua?>(
            stream: _agua,
            builder: (context, s) =>
                _EstadoActual(estado: s.data, colonia: c, color: primary),
          ),
        ),
        Cargar<List<PasoBitacora>>(
          futuro: _repo.bitacoraAgua,
          builder: (context, pasos) => (pasos ?? const []).isEmpty
              ? const SizedBox.shrink()
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const TituloSeccion(titulo: 'Qué ha pasado'),
                    const SizedBox(height: 14),
                    Lateral(child: _LineaDeTiempo(pasos: pasos!)),
                  ],
                ),
        ),
        const InterruptorAviso(
          titulo: 'Avísame cuando vuelva el agua',
          detalle: 'Notificación al restablecerse el servicio',
        ),
        Cargar<List<CorteProgramado>>(
          futuro: _repo.cortesProgramados,
          builder: (context, cortes) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const TituloSeccion(titulo: 'Cortes programados'),
              const SizedBox(height: 14),
              if ((cortes ?? const []).isEmpty)
                const Vacio(texto: 'No hay cortes programados.')
              else
                for (final corte in cortes!) ...[
                  Lateral(
                    child: TarjetaBorde(
                      relleno: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                      child: Row(
                        children: [
                          CajaFecha(
                            fecha: corte.fecha,
                            fondo: Colores.avisoSuave,
                            color: const Color(0xFF9A5B08),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(corte.titulo, style: Tipografia.subtitulo),
                                const SizedBox(height: 3),
                                Text(corte.horario, style: Tipografia.micro),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
            ],
          ),
        ),
      ],
    );
  }
}

class _EstadoActual extends StatelessWidget {
  const _EstadoActual({
    required this.estado,
    required this.colonia,
    required this.color,
  });

  final EstadoAgua? estado;
  final Colonia? colonia;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final e = estado;
    final horario = colonia != null && colonia!.horarioAgua.isNotEmpty
        ? colonia!.horarioAgua
        : e?.horario ?? '';
    final (titulo, insignia, punto, detalle) = switch (e) {
      null => (
        'Sin publicar',
        'Sin dato',
        Colors.white70,
        'El municipio aún no publica el estado de hoy.',
      ),
      _ when e.sinDato => (
        'Sin información',
        'Sin dato',
        Colors.white70,
        e.mensaje,
      ),
      _ when !e.activo => (
        e.horaEstimada != null
            ? 'Vuelve hoy ~${e.horaEstimada}'
            : 'Sin servicio',
        'Sin servicio',
        const Color(0xFFFBBF24),
        e.mensaje,
      ),
      _ => (
        horario,
        'Servicio activo',
        const Color(0xFF4ADE80),
        e.mensaje.isNotEmpty ? e.mensaje : 'Horario de servicio de hoy.',
      ),
    };

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Medidas.radioHero),
        gradient: LinearGradient(
          begin: const Alignment(-0.5, -1),
          end: const Alignment(0.5, 1),
          colors: [color, Color.lerp(color, Colores.primaryOscuro, 0.85)!],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ESTADO ACTUAL',
                style: Tipografia.etiqueta.copyWith(
                  color: Colors.white.withValues(alpha: 0.62),
                ),
              ),
              Container(
                padding: const EdgeInsets.fromLTRB(9, 5, 11, 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: punto,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      insignia,
                      style: Tipografia.micro.copyWith(
                        color: Colors.white.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(titulo, style: Tipografia.display.copyWith(color: Colors.white)),
          if (detalle.isNotEmpty) ...[
            const SizedBox(height: 5),
            Text(
              detalle,
              style: Tipografia.leyenda.copyWith(
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _LineaDeTiempo extends StatelessWidget {
  const _LineaDeTiempo({required this.pasos});

  final List<PasoBitacora> pasos;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Column(
      children: [
        for (final (i, p) in pasos.indexed)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 48,
                  child: Text(
                    p.hora,
                    style: Tipografia.micro.copyWith(
                      color: p.estimado ? primary : Colores.textoPrimario,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 14,
                  child: Column(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: p.estimado ? Colors.white : primary,
                          border: Border.all(
                            color: primary,
                            width: p.estimado ? 2 : 3.5,
                          ),
                        ),
                      ),
                      if (i < pasos.length - 1)
                        Expanded(
                          child: Container(width: 2, color: Colores.borde),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: i < pasos.length - 1 ? 18 : 0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p.titulo, style: Tipografia.subtitulo),
                        const SizedBox(height: 3),
                        Text(p.detalle, style: Tipografia.micro),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
