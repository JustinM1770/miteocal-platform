import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../datos/modelos/colonia.dart';
import '../datos/modelos/contacto.dart';
import '../datos/modelos/municipio.dart';
import '../datos/modelos/reporte.dart';
import '../datos/repositorio.dart';
import '../datos/sesion.dart';
import '../navegacion/modulos.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/campos.dart';
import 'servicios/reporte_ciudadano.dart';

/// 04 · Servicios
class ServiciosPagina extends StatefulWidget {
  const ServiciosPagina({super.key});

  @override
  State<ServiciosPagina> createState() => _ServiciosPaginaState();
}

class _ServiciosPaginaState extends State<ServiciosPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Stream<Municipio?> _municipio = _repo.municipio();
  final _claveReporte = GlobalKey<ReporteCiudadanoState>();
  final _claveSeccionReporte = GlobalKey();
  List<Colonia> _colonias = const [];
  List<ContactoEmergencia> _emergencias = const [];

  @override
  void initState() {
    super.initState();
    _repo.colonias().then((c) {
      if (mounted) setState(() => _colonias = c);
    });
    _repo.emergencias().then((e) {
      if (mounted) setState(() => _emergencias = e);
    });
  }

  void _irAReporte([TipoReporte? tipo]) {
    if (tipo != null) _claveReporte.currentState?.elegirTipo(tipo);
    final ctx = _claveSeccionReporte.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOut,
      );
    }
  }

  void _aviso(String texto) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(texto)));

  Future<void> _llamar(ContactoEmergencia c) async {
    final tel = c.telefono;
    if (tel == null) {
      _aviso(
        'El número de ${c.nombre} está pendiente de confirmar con el ayuntamiento. En una emergencia marca 911.',
      );
      return;
    }
    final ok = await launchUrl(
      Uri(scheme: 'tel', path: tel.replaceAll(' ', '')),
    );
    if (!ok) _aviso('No se pudo abrir el marcador. Marca $tel.');
  }

  @override
  Widget build(BuildContext context) {
    final directorio = _emergencias
        .where((e) => e.id != 'emergencias')
        .take(4)
        .toList();

    return SafeArea(
      bottom: false,
      child: StreamBuilder<Municipio?>(
        stream: _municipio,
        builder: (context, snap) {
          final municipio = snap.data;
          return SingleChildScrollView(
            padding: const EdgeInsets.only(top: 12, bottom: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    Medidas.margenLateral,
                    8,
                    Medidas.margenLateral,
                    0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Servicios', style: Tipografia.tituloPantalla),
                      const SizedBox(height: 3),
                      Text(
                        'Trámites, pagos y atención ciudadana',
                        style: Tipografia.leyenda,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Medidas.margenLateral,
                  ),
                  child: _Cuadricula(
                    hijos: [
                      _Servicio(
                        icono: LucideIcons.fileText,
                        titulo: 'Trámites y pagos',
                        detalle: 'Actas, licencias, predial',
                        alTocar: () => _aviso(
                          'Trámites en línea estará disponible muy pronto.',
                        ),
                      ),
                      _Servicio(
                        icono: LucideIcons.triangleAlert,
                        titulo: 'Reporte de fallas',
                        detalle: 'Baches, fugas, drenaje',
                        alTocar: () => _irAReporte(),
                      ),
                      _Servicio(
                        icono: LucideIcons.trash2,
                        titulo: 'Recolección de basura',
                        detalle: 'Horarios por colonia',
                        alTocar: () {
                          final perfil = context.read<Sesion>().perfil;
                          abrirModulo(
                            context,
                            Modulo.basura,
                            municipio: municipio,
                            perfil: perfil,
                            colonia: _colonias
                                .where((c) => c.id == perfil?.coloniaId)
                                .firstOrNull,
                            alReportarBasura: () {
                              Navigator.of(context).pop();
                              _irAReporte(TipoReporte.basura);
                            },
                          );
                        },
                      ),
                      _Servicio(
                        icono: LucideIcons.lightbulb,
                        titulo: 'Alumbrado público',
                        detalle: 'Reporta una luminaria',
                        alTocar: () => _irAReporte(TipoReporte.luminaria),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                Padding(
                  key: _claveSeccionReporte,
                  padding: const EdgeInsets.symmetric(
                    horizontal: Medidas.margenLateral,
                  ),
                  child: ReporteCiudadano(
                    key: _claveReporte,
                    colonias: _colonias,
                  ),
                ),
                const SizedBox(height: 22),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Medidas.margenLateral,
                  ),
                  child: _BannerPortal(
                    alAbrir: () async {
                      final url = municipio?.portal;
                      if (url == null ||
                          !await launchUrl(
                            Uri.parse(url),
                            mode: LaunchMode.externalApplication,
                          )) {
                        _aviso(
                          'El municipio aún no registra su portal oficial.',
                        );
                      }
                    },
                    alLlamar: () {
                      final tel = municipio?.telefonoAtencion;
                      _llamar(
                        ContactoEmergencia(
                          id: 'atencion',
                          nombre: 'Línea de atención',
                          telefono: tel,
                        ),
                      );
                    },
                  ),
                ),
                if (directorio.isNotEmpty) ...[
                  const SizedBox(height: 22),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: Medidas.margenLateral,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Directorio de emergencia',
                          style: Tipografia.titulo,
                        ),
                        const SizedBox(height: 3),
                        Text('Un toque para marcar', style: Tipografia.micro),
                        const SizedBox(height: 14),
                        _Cuadricula(
                          hijos: [
                            for (final (i, c) in directorio.indexed)
                              _Contacto(
                                contacto: c,
                                estilo: i,
                                alTocar: () => _llamar(c),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Cuadricula de 2 columnas con separacion de 10.
class _Cuadricula extends StatelessWidget {
  const _Cuadricula({required this.hijos});

  final List<Widget> hijos;

  @override
  Widget build(BuildContext context) {
    final filas = <Widget>[];
    for (var i = 0; i < hijos.length; i += 2) {
      if (i > 0) filas.add(const SizedBox(height: 10));
      filas.add(
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: hijos[i]),
              const SizedBox(width: 10),
              Expanded(
                child: i + 1 < hijos.length ? hijos[i + 1] : const SizedBox(),
              ),
            ],
          ),
        ),
      );
    }
    return Column(children: filas);
  }
}

class _Servicio extends StatelessWidget {
  const _Servicio({
    required this.icono,
    required this.titulo,
    required this.detalle,
    required this.alTocar,
  });

  final IconData icono;
  final String titulo;
  final String detalle;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colores.fondoSutil,
      borderRadius: BorderRadius.circular(Medidas.radioModulo),
      child: InkWell(
        borderRadius: BorderRadius.circular(Medidas.radioModulo),
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CuadroIcono(icono: icono, fondo: Colores.fondoTarjeta),
              const SizedBox(height: 11),
              Text(titulo, style: Tipografia.subtitulo),
              const SizedBox(height: 3),
              Text(detalle, style: Tipografia.micro),
            ],
          ),
        ),
      ),
    );
  }
}

class _BannerPortal extends StatelessWidget {
  const _BannerPortal({required this.alAbrir, required this.alLlamar});

  final VoidCallback alAbrir;
  final VoidCallback alLlamar;

  @override
  Widget build(BuildContext context) {
    Widget boton(
      String texto,
      Color fondo,
      Color color,
      VoidCallback alTocar, [
      IconData? icono,
    ]) => Expanded(
      child: Material(
        color: fondo,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: alTocar,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 11),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icono != null) ...[
                  Icon(icono, size: 15, color: color),
                  const SizedBox(width: 7),
                ],
                Text(texto, style: Tipografia.subtitulo.copyWith(color: color)),
              ],
            ),
          ),
        ),
      ),
    );

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colores.fondoInverso,
        borderRadius: BorderRadius.circular(Medidas.radioModulo),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Portal oficial del municipio',
            style: Tipografia.cuerpo.copyWith(color: Colors.white),
          ),
          const SizedBox(height: 5),
          Text(
            'Convocatorias, transparencia y el directorio completo de dependencias.',
            style: Tipografia.micro.copyWith(
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 15),
          Row(
            children: [
              boton(
                'Abrir portal',
                Colors.white,
                Colores.textoPrimario,
                alAbrir,
              ),
              const SizedBox(width: 9),
              boton(
                'Línea de atención',
                Colors.white.withValues(alpha: 0.14),
                Colors.white,
                alLlamar,
                LucideIcons.phone,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Contacto extends StatelessWidget {
  const _Contacto({
    required this.contacto,
    required this.estilo,
    required this.alTocar,
  });

  final ContactoEmergencia contacto;
  final int estilo;
  final VoidCallback alTocar;

  static const _estilos = [
    (Colores.soft, Colores.primary),
    (Colores.peligroSuave, Colores.peligro),
    (Colores.avisoSuave, Colores.aviso),
    (Colores.exitoSuave, Colores.exito),
  ];

  @override
  Widget build(BuildContext context) {
    final (fondo, color) = _estilos[estilo % _estilos.length];
    return Material(
      color: Colores.fondoTarjeta,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        side: const BorderSide(color: Colores.borde),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CuadroIcono(
                icono: LucideIcons.phone,
                fondo: fondo,
                color: color,
                tam: 36,
                tamIcono: 18,
                radio: 12,
              ),
              const SizedBox(height: 10),
              Text(contacto.nombre, style: Tipografia.subtitulo),
              const SizedBox(height: 2),
              Text(
                contacto.telefono != null
                    ? 'Toca para marcar'
                    : 'Número por confirmar',
                style: Tipografia.micro,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
