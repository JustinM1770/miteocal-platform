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
import '../nucleo/widgets/hoja_colonias.dart';
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
            padding: const EdgeInsets.only(top: 12, bottom: 24),
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
                      builder: (context, snapAgua) => GestureDetector(
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
                      ),
                    ),
                  ),
                  const SizedBox(height: Medidas.separacionSeccion),
                ],

                if (municipio != null) ...[
                  const _TituloSeccion(titulo: 'Tu municipio'),
                  const SizedBox(height: 14),
                  _Modulos(
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
                ],

                StreamBuilder<List<Noticia>>(
                  stream: _noticias,
                  builder: (context, snap) {
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
                const _AccesosDirectos(),
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
              color: Colores.fondoSutil,
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
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Cuadricula de 3 columnas con los modulos contratados por el municipio.
class _Modulos extends StatelessWidget {
  const _Modulos({required this.modulos, required this.alAbrir});

  final List<Modulo> modulos;
  final ValueChanged<Modulo> alAbrir;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
      child: LayoutBuilder(
        builder: (context, c) {
          final ancho = (c.maxWidth - 20) / 3;
          return Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final m in modulos)
                SizedBox(
                  width: ancho,
                  child: Material(
                    color: Colores.fondoTarjeta,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
                      side: const BorderSide(color: Colores.borde),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
                      onTap: () => alAbrir(m),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 14,
                        ),
                        child: Column(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colores.soft,
                                borderRadius: BorderRadius.circular(13),
                              ),
                              child: Icon(m.icono, size: 20, color: primary),
                            ),
                            const SizedBox(height: 9),
                            Text(
                              m.nombre,
                              textAlign: TextAlign.center,
                              style: Tipografia.micro.copyWith(
                                color: Colores.textoPrimario,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
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

    Widget acceso((IconData, String, VoidCallback) a) => Expanded(
      child: Material(
        color: Colores.fondoSutil,
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        child: InkWell(
          borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
          onTap: a.$3,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  a.$1,
                  size: 22,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 12),
                Text(a.$2, style: Tipografia.subtitulo),
              ],
            ),
          ),
        ),
      ),
    );

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
