import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/agua.dart';
import '../datos/modelos/aviso.dart';
import '../datos/modelos/colonia.dart';
import '../datos/modelos/contenido.dart';
import '../datos/modelos/municipio.dart';
import '../datos/repositorio.dart';
import '../datos/sesion.dart';
import '../navegacion/modulos.dart';
import '../navegacion/pestanas.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/bento.dart';
import '../nucleo/widgets/shimmer_placeholders.dart';
import 'avisos/avisos_pagina.dart';
import 'elegir_colonia_pagina.dart';
import 'inicio/widgets/hero_agua.dart';

/// 01 · Inicio (Figma «01 · Inicio — Bento»): agua, basura y corte, cierres
/// cerca, escuelas y accesos directos. Solo los cuatro servicios del reto.
class InicioPagina extends StatefulWidget {
  const InicioPagina({super.key});

  @override
  State<InicioPagina> createState() => _InicioPaginaState();
}

class _InicioPaginaState extends State<InicioPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Stream<Municipio?> _municipio = _repo.municipio();
  late final Stream<EstadoAgua?> _agua = _repo.aguaDeHoy();
  late final Stream<List<Aviso>> _avisos = _repo.avisos();
  late final Future<List<CorteProgramado>> _cortes = _repo.cortesProgramados();
  late final Future<List<Cierre>> _cierres = _repo.cierres();
  late final Future<(List<Escuela>, List<AvisoEscolar>)> _escuelas =
      Future.wait([
        _repo.escuelas(),
        _repo.avisosEscolares(),
      ]).then((r) => (r[0] as List<Escuela>, r[1] as List<AvisoEscolar>));
  List<Colonia> _colonias = const [];
  Future<RutaBasura?>? _ruta;
  String? _rutaDe;

  @override
  void initState() {
    super.initState();
    _repo.colonias().then((c) {
      if (mounted) setState(() => _colonias = c);
    });
  }

  void _abrir(Modulo m, Municipio? municipio, Colonia? colonia) {
    final perfil = context.read<Sesion>().perfil;
    abrirModulo(
      context,
      m,
      municipio: municipio,
      colonia: colonia,
      perfil: perfil,
      alReportarBasura: () {
        Navigator.of(context).pop();
        context.read<Pestanas>().ir(Pestanas.servicios);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final perfil = context.watch<Sesion>().perfil;
    final colonia = _colonias
        .where((c) => c.id == perfil?.coloniaId)
        .firstOrNull;
    final coloniaId = colonia?.id ?? perfil?.coloniaId;
    if (coloniaId != null && coloniaId != _rutaDe) {
      _rutaDe = coloniaId;
      _ruta = _repo.rutaBasura(coloniaId);
    }
    final primary = Theme.of(context).colorScheme.primary;

    return StreamBuilder<Municipio?>(
      stream: _municipio,
      builder: (context, snapM) {
        final municipio = snapM.data;
        bool activo(Modulo m) => municipio?.tieneModulo(m.clave) ?? true;

        return SafeArea(
          bottom: false,
          child: ListView(
            padding: EdgeInsets.fromLTRB(
              14,
              8,
              14,
              110 + MediaQuery.paddingOf(context).bottom,
            ),
            children: [
              // ── Encabezado
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 6, 0, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            perfil != null
                                ? 'Hola, ${perfil.nombreCorto}'
                                : (municipio?.nombre ?? ''),
                            style: Tipografia.display,
                          ),
                          const SizedBox(height: 4),
                          GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const ElegirColoniaPagina(),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  LucideIcons.mapPin,
                                  size: 14,
                                  color: Colores.textoSecundario,
                                ),
                                const SizedBox(width: 5),
                                Flexible(
                                  child: Text(
                                    [
                                      if (perfil?.direccion.isNotEmpty ?? false)
                                        perfil!.direccion,
                                      if (colonia != null)
                                        colonia.nombre.replaceFirst(
                                          'Teocaltiche ',
                                          '',
                                        ),
                                    ].join(' · '),
                                    style: Tipografia.leyenda,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    StreamBuilder<List<Aviso>>(
                      stream: _avisos,
                      builder: (context, s) => BotonCirculo(
                        LucideIcons.bell,
                        punto: (s.data ?? const <Aviso>[]).any(
                          (a) => a.esPara(colonia?.nombre),
                        ),
                        alTocar: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                AvisosPagina(colonia: colonia?.nombre),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Agua
              if (activo(Modulo.agua))
                StreamBuilder<EstadoAgua?>(
                  stream: _agua,
                  builder: (context, s) {
                    if (s.connectionState == ConnectionState.waiting &&
                        !s.hasData) {
                      return const ShimmerHeroAgua();
                    }
                    return HeroAgua(
                      estado: s.data,
                      color: primary,
                      colonia: colonia,
                      alDetalle: () => _abrir(Modulo.agua, municipio, colonia),
                    );
                  },
                ),
              const SizedBox(height: 10),

              // ── Basura y corte programado
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (activo(Modulo.basura))
                      Expanded(
                        child: FutureBuilder<RutaBasura?>(
                          future: _ruta,
                          builder: (context, s) {
                            final r = s.data;
                            final llega = r?.minutos == null
                                ? null
                                : DateTime.now().add(
                                    Duration(minutes: r!.minutos!),
                                  );
                            return _Mitad(
                              icono: LucideIcons.truck,
                              enVivo: llega != null,
                              kicker: 'Basura · hoy',
                              titulo: llega == null
                                  ? 'Hoy no pasa'
                                  : r!.cuadras <= 0
                                  ? 'En tu calle'
                                  : 'A ${r.cuadras} cuadras',
                              detalle: llega == null
                                  ? (r == null
                                        ? 'Sin ruta asignada'
                                        : 'Revisa los días de tu ruta')
                                  : 'Llega ~${llega.hour}:${llega.minute.toString().padLeft(2, '0')} hrs',
                              alTocar: () =>
                                  _abrir(Modulo.basura, municipio, colonia),
                            );
                          },
                        ),
                      ),
                    if (activo(Modulo.basura) && activo(Modulo.agua))
                      const SizedBox(width: 10),
                    if (activo(Modulo.agua))
                      Expanded(
                        child: FutureBuilder<List<CorteProgramado>>(
                          future: _cortes,
                          builder: (context, s) {
                            final hoy = DateUtils.dateOnly(DateTime.now());
                            final corte = (s.data ?? const <CorteProgramado>[])
                                .where((c) => !c.fecha.isBefore(hoy))
                                .firstOrNull;
                            const dias = [
                              'Lun',
                              'Mar',
                              'Mié',
                              'Jue',
                              'Vie',
                              'Sáb',
                              'Dom',
                            ];
                            return _Mitad(
                              icono: LucideIcons.calendar,
                              kicker: 'Corte programado',
                              titulo: corte == null
                                  ? 'Sin cortes'
                                  : '${dias[corte.fecha.weekday - 1]} ${corte.fecha.day}',
                              detalle: corte == null
                                  ? 'Nada programado'
                                  : '${corte.horario} · ${corte.titulo}',
                              alTocar: () =>
                                  _abrir(Modulo.agua, municipio, colonia),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),

              // ── Cierres cerca
              if (activo(Modulo.cierres))
                FutureBuilder<List<Cierre>>(
                  future: _cierres,
                  builder: (context, s) {
                    final cierres = [...(s.data ?? const <Cierre>[])]
                      ..sort(
                        (a, b) => (a.distanciaM ?? 1 << 30).compareTo(
                          b.distanciaM ?? 1 << 30,
                        ),
                      );
                    if (cierres.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TituloBento(
                          'Cerca de ti',
                          accion: 'Ver mapa',
                          alTocar: () =>
                              _abrir(Modulo.cierres, municipio, colonia),
                        ),
                        Bento(
                          relleno: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 4,
                          ),
                          alTocar: () =>
                              _abrir(Modulo.cierres, municipio, colonia),
                          child: Column(
                            children: [
                              for (final (i, c) in cierres.take(2).indexed)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                  decoration: BoxDecoration(
                                    border: i == 0
                                        ? null
                                        : const Border(
                                            top: BorderSide(
                                              color: Colores.borde,
                                            ),
                                          ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Burbuja(LucideIcons.trafficCone),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              c.calle,
                                              style: Tipografia.cuerpo,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              [c.detalle, c.vigencia]
                                                  .where((x) => x.isNotEmpty)
                                                  .join(' · '),
                                              style: Tipografia.leyenda
                                                  .copyWith(fontSize: 12),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (c.distanciaM != null) ...[
                                        const SizedBox(width: 8),
                                        Text(
                                          c.distanciaM! >= 1000
                                              ? '${(c.distanciaM! / 1000).toStringAsFixed(1)} km'
                                              : '${c.distanciaM} m',
                                          style: Tipografia.etiqueta.copyWith(
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
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

              // ── Escuelas
              if (activo(Modulo.escuelas))
                FutureBuilder<(List<Escuela>, List<AvisoEscolar>)>(
                  future: _escuelas,
                  builder: (context, s) {
                    final escuelas = s.data?.$1 ?? const <Escuela>[];
                    final avisos = [...(s.data?.$2 ?? const <AvisoEscolar>[])]
                      ..sort((a, b) => b.fecha.compareTo(a.fecha));
                    if (avisos.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TituloBento(
                          'Tus escuelas',
                          accion: 'Gestionar',
                          alTocar: () =>
                              _abrir(Modulo.escuelas, municipio, colonia),
                        ),
                        IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final (i, a) in avisos.take(2).indexed) ...[
                                if (i > 0) const SizedBox(width: 10),
                                Expanded(
                                  child: _AvisoEscuela(
                                    aviso: a,
                                    escuela:
                                        escuelas
                                            .where((e) => e.id == a.escuelaId)
                                            .firstOrNull
                                            ?.nombre ??
                                        '',
                                    alTocar: () => _abrir(
                                      Modulo.escuelas,
                                      municipio,
                                      colonia,
                                    ),
                                  ),
                                ),
                              ],
                              if (avisos.length == 1)
                                const Expanded(child: SizedBox.shrink()),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),

              // ── Accesos directos
              const TituloBento('Accesos directos'),
              Row(
                children: [
                  Expanded(
                    child: _Acceso(
                      icono: LucideIcons.bellRing,
                      texto: 'Mis avisos',
                      destacado: true,
                      alTocar: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              AvisosPagina(colonia: colonia?.nombre),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Acceso(
                      icono: LucideIcons.triangleAlert,
                      texto: 'Reportar falla',
                      alTocar: () =>
                          context.read<Pestanas>().ir(Pestanas.servicios),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Media tarjeta: ícono, dato en vivo, etiqueta, cifra grande y detalle.
class _Mitad extends StatelessWidget {
  const _Mitad({
    required this.icono,
    required this.kicker,
    required this.titulo,
    required this.detalle,
    required this.alTocar,
    this.enVivo = false,
  });

  final IconData icono;
  final String kicker;
  final String titulo;
  final String detalle;
  final VoidCallback alTocar;
  final bool enVivo;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Bento(
      alTocar: alTocar,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Burbuja(icono),
              const Spacer(),
              if (enVivo) ...[
                Punto(primary, tam: 6),
                const SizedBox(width: 5),
                Text(
                  'En vivo',
                  style: Tipografia.micro.copyWith(color: primary),
                ),
              ],
            ],
          ),
          const SizedBox(height: 22),
          Kicker(kicker),
          const SizedBox(height: 4),
          Text(
            titulo,
            style: Tipografia.titulo.copyWith(
              fontSize: 22,
              letterSpacing: -0.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            detalle,
            style: Tipografia.leyenda.copyWith(fontSize: 12),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _AvisoEscuela extends StatelessWidget {
  const _AvisoEscuela({
    required this.aviso,
    required this.escuela,
    required this.alTocar,
  });
  final AvisoEscolar aviso;
  final String escuela;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final (texto, color) = switch (aviso.tipo) {
      TipoAvisoEscolar.suspension => ('Suspensión', Colores.peligro),
      TipoAvisoEscolar.examen => ('Examen', Colores.aviso),
      TipoAvisoEscolar.aviso => ('Aviso', Colores.textoSecundario),
    };
    return Bento(
      alTocar: alTocar,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Burbuja(LucideIcons.graduationCap),
              const Spacer(),
              Text(
                haceTiempo(aviso.fecha).replaceFirst('hace ', 'Hace '),
                style: Tipografia.micro,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Punto(color, tam: 6),
              const SizedBox(width: 5),
              Flexible(child: Kicker(texto, color: color)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            escuela,
            style: Tipografia.cuerpo.copyWith(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            aviso.texto,
            style: Tipografia.leyenda.copyWith(fontSize: 12),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _Acceso extends StatelessWidget {
  const _Acceso({
    required this.icono,
    required this.texto,
    required this.alTocar,
    this.destacado = false,
  });
  final IconData icono;
  final String texto;
  final VoidCallback alTocar;
  final bool destacado;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final tinta = destacado ? Colores.textoInverso : Colores.textoPrimario;
    return Bento(
      color: destacado ? primary : Colores.fondoTarjeta,
      alTocar: alTocar,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Burbuja(
                icono,
                fondo: destacado ? Colores.fondoTarjeta : Colores.fondoSutil,
                color: destacado ? primary : Colores.textoPrimario,
              ),
              const Spacer(),
              Icon(
                LucideIcons.arrowUpRight,
                size: 16,
                color: destacado ? tinta : Colores.textoSecundario,
              ),
            ],
          ),
          const SizedBox(height: 26),
          Text(
            texto,
            style: Tipografia.cuerpo.copyWith(
              color: tinta,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
