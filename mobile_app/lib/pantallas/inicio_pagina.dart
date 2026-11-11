import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/agua.dart';
import '../datos/modelos/colonia.dart';
import '../datos/modelos/municipio.dart';
import '../datos/modelos/noticia.dart';
import '../datos/repositorio.dart';
import '../datos/sesion.dart';
import '../navegacion/modulos.dart';
import '../navegacion/pestanas.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/animaciones.dart';
import '../nucleo/widgets/hoja_colonias.dart';
import '../nucleo/widgets/shimmer_placeholders.dart';
import 'inicio/widgets/carrusel_noticias.dart';
import 'inicio/widgets/hero_agua.dart';

/// 01 · Inicio
class InicioPagina extends StatefulWidget {
  const InicioPagina({super.key});

  @override
  State<InicioPagina> createState() => _InicioPaginaState();
}

class _InicioPaginaState extends State<InicioPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Stream<Municipio?> _municipio = _repo.municipio();
  late final Stream<EstadoAgua?> _agua = _repo.aguaDeHoy();
  late final Stream<List<Noticia>> _noticias = _repo.noticias(max: 5);
  List<Colonia> _colonias = const [];

  @override
  void initState() {
    super.initState();
    _repo.colonias().then((c) {
      if (mounted) setState(() => _colonias = c);
    });
  }

  Future<void> _cambiarColonia() async {
    final sesion = context.read<Sesion>();
    if (_colonias.isEmpty) return;
    final elegida = await elegirColonia(
      context,
      colonias: _colonias,
      actualId: sesion.perfil?.coloniaId,
    );
    if (elegida != null) await sesion.cambiarColonia(elegida.id);
  }

  @override
  Widget build(BuildContext context) {
    final perfil = context.watch<Sesion>().perfil;
    final colonia = _colonias
        .where((c) => c.id == perfil?.coloniaId)
        .firstOrNull;

    return StreamBuilder<Municipio?>(
      stream: _municipio,
      builder: (context, snapMunicipio) {
        final municipio = snapMunicipio.data;

        return SafeArea(
          bottom: false,
          child: SingleChildScrollView(
            // En iPhone la barra de pestañas flota sobre el contenido
            padding: EdgeInsets.only(
              top: 12,
              bottom: 24 + MediaQuery.paddingOf(context).bottom,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Encabezado(
                  saludo: perfil != null
                      ? 'Hola, ${perfil.nombreCorto}'
                      : (municipio?.nombre ?? ''),
                  ubicacion: [
                    if (perfil != null && perfil.direccion.isNotEmpty)
                      perfil.direccion,
                    if (colonia != null) colonia.nombre,
                    if (perfil == null && municipio != null) municipio.estado,
                  ].join(' · '),
                  alTocarUbicacion: perfil != null ? _cambiarColonia : null,
                ),
                const SizedBox(height: Medidas.separacionSeccion),

                // Un modulo apagado no se dibuja y sus datos no se consultan.
                // Ver docs/arquitectura-multimunicipio.md seccion 3.
                if (municipio?.tieneModulo('agua') ?? false) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: Medidas.margenLateral,
                    ),
                    child: StreamBuilder<EstadoAgua?>(
                      stream: _agua,
                      builder: (context, snapAgua) {
                        if (snapAgua.connectionState ==
                                ConnectionState.waiting &&
                            !snapAgua.hasData) {
                          return const ShimmerHeroAgua();
                        }
                        return GestureDetector(
                          onTap: () => abrirModulo(
                            context,
                            Modulo.agua,
                            municipio: municipio,
                            colonia: colonia,
                            perfil: perfil,
                          ),
                          child: HeroAgua(
                            estado: snapAgua.data,
                            color: municipio!.tema.primary,
                            colonia: colonia,
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: Medidas.separacionSeccion),
                ],

                if (municipio != null) ...[
                  const _TituloSeccion(titulo: 'Tu municipio'),
                  const SizedBox(height: 14),
                  _Modulos(
                    coloniaId: colonia?.id ?? perfil?.coloniaId,
                    modulos: [
                      for (final m in Modulo.values)
                        if (m != Modulo.agua && municipio.tieneModulo(m.clave))
                          m,
                    ],
                    alAbrir: (m) => abrirModulo(
                      context,
                      m,
                      municipio: municipio,
                      colonia: colonia,
                      perfil: perfil,
                      alReportarBasura: () {
                        Navigator.of(context).pop();
                        context.read<Pestanas>().ir(Pestanas.servicios);
                      },
                    ),
                  ),
                  const SizedBox(height: Medidas.separacionSeccion),
                ] else ...[
                  const ShimmerModulos(),
                  const SizedBox(height: Medidas.separacionSeccion),
                ],

                StreamBuilder<List<Noticia>>(
                  stream: _noticias,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting &&
                        !snap.hasData) {
                      return const Padding(
                        padding: EdgeInsets.only(
                          bottom: Medidas.separacionSeccion,
                        ),
                        child: ShimmerNoticias(),
                      );
                    }
                    final noticias = snap.data ?? const [];
                    if (noticias.isEmpty) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(
                        bottom: Medidas.separacionSeccion,
                      ),
                      child: Column(
                        children: [
                          _TituloSeccion(
                            titulo: 'Noticias',
                            accion: 'Ver todas',
                            alTocar: () =>
                                context.read<Pestanas>().ir(Pestanas.noticias),
                          ),
                          const SizedBox(height: 14),
                          CarruselNoticias(noticias: noticias),
                        ],
                      ),
                    );
                  },
                ),

                const _TituloSeccion(titulo: 'Accesos directos'),
                const SizedBox(height: 14),
                const ListaEscalonada(children: [_AccesosDirectos()]),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Encabezado extends StatelessWidget {
  const _Encabezado({
    required this.saludo,
    required this.ubicacion,
    this.alTocarUbicacion,
  });

  final String saludo;
  final String ubicacion;
  final VoidCallback? alTocarUbicacion;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Medidas.margenLateral,
        8,
        Medidas.margenLateral,
        0,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(saludo, style: Tipografia.tituloPantalla),
                if (ubicacion.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  GestureDetector(
                    onTap: alTocarUbicacion,
                    behavior: HitTestBehavior.opaque,
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
                            ubicacion,
                            style: Tipografia.leyenda,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (alTocarUbicacion != null) ...[
                          const SizedBox(width: 5),
                          const Icon(
                            LucideIcons.chevronRight,
                            size: 13,
                            color: Colores.textoSecundario,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          // TODO: bandeja de avisos. El punto rojo indica avisos sin leer.
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(
              color: Colores.fondoTarjeta,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.bell,
              size: 20,
              color: Colores.textoPrimario,
            ),
          ),
        ],
      ),
    );
  }
}

class _TituloSeccion extends StatelessWidget {
  const _TituloSeccion({required this.titulo, this.accion, this.alTocar});

  final String titulo;
  final String? accion;
  final VoidCallback? alTocar;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(titulo, style: Tipografia.titulo),
          if (accion != null)
            GestureDetector(
              onTap: alTocar,
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
}

/// Carrusel de los módulos contratados por el municipio. Caben tres a lo
/// ancho, repartidos de orilla a orilla; si hay más, se deslizan. Cada
/// tarjeta trae un dato en vivo de su módulo.
class _Modulos extends StatefulWidget {
  const _Modulos({
    required this.modulos,
    required this.alAbrir,
    this.coloniaId,
  });

  final List<Modulo> modulos;
  final ValueChanged<Modulo> alAbrir;
  final String? coloniaId;

  @override
  State<_Modulos> createState() => _ModulosState();
}

class _ModulosState extends State<_Modulos> {
  static const _separacion = 10.0;
  final _datos = <Modulo, Future<(String, bool)?>>{};

  static const _meses = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];

  /// (texto, enVivo). null si no hay nada que decir.
  Future<(String, bool)?> _dato(Modulo m) async {
    final repo = context.read<Repositorio>();
    try {
      switch (m) {
        case Modulo.basura:
          final id = widget.coloniaId;
          if (id == null) return null;
          final r = await repo.rutaBasura(id);
          if (r == null || r.minutos == null) return ('Hoy no pasa', false);
          return r.minutos! <= 2
              ? ('Llegando a tu calle', true)
              : ('Llega en ${r.minutos} min', true);
        case Modulo.cierres:
          final n = (await repo.cierres()).length;
          return (
            n == 0
                ? 'Sin cierres'
                : n == 1
                ? '1 activo'
                : '$n activos',
            false,
          );
        case Modulo.escuelas:
          final n = (await repo.avisosEscolares()).length;
          return (
            n == 0
                ? 'Sin avisos'
                : n == 1
                ? '1 aviso'
                : '$n avisos',
            false,
          );
        case Modulo.feria:
          final hoy = DateUtils.dateOnly(DateTime.now());
          final eventos = [...await repo.eventosFeria()]
            ..sort((a, b) => a.fecha.compareTo(b.fecha));
          final deHoy = eventos.where((e) => DateUtils.isSameDay(e.fecha, hoy));
          if (deHoy.isNotEmpty) {
            final e = deHoy.last;
            return (
              'Hoy: ${e.artista.isNotEmpty ? e.artista : e.titulo}',
              true,
            );
          }
          final prox = eventos.where((e) => e.fecha.isAfter(hoy));
          if (prox.isEmpty) return ('Ver programa', false);
          final f = prox.first.fecha;
          return ('Inicia ${f.day} ${_meses[f.month - 1]}', false);
        case Modulo.paisanos:
          final t = await repo.transmisionEnVivo();
          if (t != null && t.enVivo) return ('Transmisión en vivo', true);
          final c = await repo.comunidadPaisana();
          return c == null ? null : ('${c.conectados} conectados', false);
        case Modulo.agua:
          return null;
      }
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final util = c.maxWidth - Medidas.margenLateral * 2;
        final ancho = (util - _separacion * 2) / 3;
        return SizedBox(
          height: 128,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: Medidas.margenLateral,
            ),
            itemCount: widget.modulos.length,
            separatorBuilder: (_, _) => const SizedBox(width: _separacion),
            itemBuilder: (context, i) {
              final m = widget.modulos[i];
              final dato = _datos.putIfAbsent(m, () => _dato(m));
              return SizedBox(
                width: ancho,
                child: _TarjetaModulo(
                  modulo: m,
                  dato: dato,
                  alTocar: () => widget.alAbrir(m),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _TarjetaModulo extends StatelessWidget {
  const _TarjetaModulo({
    required this.modulo,
    required this.dato,
    required this.alTocar,
  });

  final Modulo modulo;
  final Future<(String, bool)?> dato;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Material(
      color: Colores.fondoTarjeta,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: const BoxDecoration(
                      color: Colores.fondoSutil,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      modulo.icono,
                      size: 17,
                      color: Colores.textoPrimario,
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    LucideIcons.arrowUpRight,
                    size: 15,
                    color: Colores.textoSecundario,
                  ),
                ],
              ),
              const Spacer(),
              Text(
                modulo.nombre,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Tipografia.cuerpo.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 3),
              FutureBuilder<(String, bool)?>(
                future: dato,
                builder: (context, snap) {
                  final d = snap.data;
                  if (d == null) {
                    return Text(' ', style: Tipografia.micro);
                  }
                  final (texto, enVivo) = d;
                  return Row(
                    children: [
                      if (enVivo) ...[
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                      ],
                      Flexible(
                        child: Text(
                          texto,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Tipografia.micro.copyWith(
                            color: enVivo ? primary : Colores.textoSecundario,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccesosDirectos extends StatelessWidget {
  const _AccesosDirectos();

  void _pronto(BuildContext context, String que) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$que estará disponible muy pronto.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pestanas = context.read<Pestanas>();
    final accesos = <(IconData, String, VoidCallback)>[
      (
        LucideIcons.wallet,
        'Pagar agua',
        () => _pronto(context, 'El pago de agua'),
      ),
      (
        LucideIcons.triangleAlert,
        'Reportar falla',
        () => pestanas.ir(Pestanas.servicios),
      ),
      (
        LucideIcons.fileText,
        'Trámites',
        () => _pronto(context, 'Trámites en línea'),
      ),
      (LucideIcons.siren, 'Emergencias', () => pestanas.ir(Pestanas.servicios)),
    ];

    final primary = Theme.of(context).colorScheme.primary;
    Widget acceso((IconData, String, VoidCallback) a) {
      final destacado = identical(a, accesos.first);
      final tinta = destacado ? Colores.textoInverso : Colores.textoPrimario;
      return Expanded(
        child: Material(
          color: destacado ? primary : Colores.fondoTarjeta,
          borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
          child: InkWell(
            borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
            onTap: a.$3,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: destacado
                              ? Colores.fondoTarjeta
                              : Colores.fondoSutil,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          a.$1,
                          size: 18,
                          color: destacado ? primary : Colores.textoPrimario,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        LucideIcons.arrowUpRight,
                        size: 16,
                        color: destacado ? tinta : Colores.textoSecundario,
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  Text(
                    a.$2,
                    style: Tipografia.cuerpo.copyWith(
                      color: tinta,
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
      child: Column(
        children: [
          Row(
            children: [
              acceso(accesos[0]),
              const SizedBox(width: 10),
              acceso(accesos[1]),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              acceso(accesos[2]),
              const SizedBox(width: 10),
              acceso(accesos[3]),
            ],
          ),
        ],
      ),
    );
  }
}
