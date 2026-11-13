import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/agua.dart';
import '../../datos/modelos/aviso.dart';
import '../../datos/modelos/colonia.dart';
import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/bento.dart';
import '../../nucleo/widgets/comunes.dart';
import '../avisos/avisos_pagina.dart';
import '../inicio/widgets/hero_agua.dart';

/// Detalle de servicio · Agua: estado de hoy, datos del servicio en la
/// colonia, qué ha pasado, avisos vigentes y cortes programados.
class DetalleAguaPagina extends StatefulWidget {
  const DetalleAguaPagina({super.key, this.colonia});
  final Colonia? colonia;

  @override
  State<DetalleAguaPagina> createState() => _DetalleAguaPaginaState();
}

class _DetalleAguaPaginaState extends State<DetalleAguaPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Stream<EstadoAgua?> _agua = _repo.aguaDeHoy();
  late final Stream<List<Aviso>> _avisos = _repo.avisos();
  late final Future<List<PasoBitacora>> _bitacora = _repo.bitacoraAgua();
  late final Future<List<CorteProgramado>> _cortes = _repo.cortesProgramados();

  static const _dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  @override
  Widget build(BuildContext context) {
    final c = widget.colonia;
    final primary = Theme.of(context).colorScheme.primary;
    return PantallaBento(
      titulo: 'Agua',
      subtitulo: c == null
          ? 'Servicio de agua potable'
          : [c.nombre, if (c.pozo.isNotEmpty) 'pozo ${c.pozo}'].join(' · '),
      hijos: [
        StreamBuilder<EstadoAgua?>(
          stream: _agua,
          builder: (context, s) {
            final e = s.data;
            return Column(
              children: [
                HeroAgua(estado: e, color: primary, colonia: c),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _Dato(
                        'Horario',
                        c?.horarioAgua.isNotEmpty == true
                            ? c!.horarioAgua
                            : (e?.horario.isNotEmpty == true
                                  ? e!.horario
                                  : '—'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Dato(
                        'Pozo',
                        c?.pozo.isNotEmpty == true ? c!.pozo : '—',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _Dato(
                        'Presión',
                        e != null && e.presion > 0 ? '${e.presion} bar' : '—',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _Dato(
                        'Calidad',
                        e?.calidad.isNotEmpty == true ? e!.calidad : '—',
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
        StreamBuilder<List<Aviso>>(
          stream: _avisos,
          builder: (context, s) {
            final deAgua = (s.data ?? const <Aviso>[])
                .where(
                  (a) => a.servicio == Servicio.agua && a.esPara(c?.nombre),
                )
                .toList();
            if (deAgua.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TituloBento('Avisos vigentes'),
                for (final a in deAgua) ...[
                  TarjetaAviso(aviso: a),
                  const SizedBox(height: 10),
                ],
              ],
            );
          },
        ),
        FutureBuilder<List<PasoBitacora>>(
          future: _bitacora,
          builder: (context, s) {
            final pasos = s.data ?? const <PasoBitacora>[];
            if (pasos.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TituloBento('Qué ha pasado'),
                Bento(
                  child: Column(
                    children: [
                      for (final (i, p) in pasos.indexed)
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            border: i == 0
                                ? null
                                : const Border(
                                    top: BorderSide(color: Colores.borde),
                                  ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 52,
                                child: Text(
                                  p.hora,
                                  style: Tipografia.etiqueta.copyWith(
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(p.titulo, style: Tipografia.cuerpo),
                                    if (p.detalle.isNotEmpty)
                                      Text(
                                        p.detalle,
                                        style: Tipografia.leyenda,
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 10),
        const InterruptorAviso(
          titulo: 'Avísame cuando vuelva el agua',
          detalle: 'Notificación al restablecerse el servicio',
          sinMargen: true,
        ),
        FutureBuilder<List<CorteProgramado>>(
          future: _cortes,
          builder: (context, s) {
            final cortes = s.data ?? const <CorteProgramado>[];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TituloBento('Cortes programados'),
                if (cortes.isEmpty)
                  const Vacio(texto: 'No hay cortes programados.')
                else
                  for (final corte in cortes) ...[
                    Bento(
                      child: Row(
                        children: [
                          Container(
                            width: 52,
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colores.fondoSutil,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _dias[corte.fecha.weekday - 1].toUpperCase(),
                                  style: Tipografia.etiqueta.copyWith(
                                    fontSize: 9.5,
                                  ),
                                ),
                                Text(
                                  '${corte.fecha.day}',
                                  style: Tipografia.titulo,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  corte.titulo,
                                  style: Tipografia.cuerpo.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(corte.horario, style: Tipografia.leyenda),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Dato extends StatelessWidget {
  const _Dato(this.etiqueta, this.valor);
  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) => Bento(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Kicker(etiqueta),
        const SizedBox(height: 6),
        Text(
          valor,
          style: Tipografia.titulo.copyWith(fontSize: 18),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    ),
  );
}
