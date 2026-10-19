import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/contenido.dart';
import '../datos/modelos/municipio.dart';
import '../datos/modelos/noticia.dart';
import '../datos/repositorio.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/comunes.dart';
import 'inicio/widgets/carrusel_noticias.dart';

/// 02 · Noticias y Comunidad
class NoticiasPagina extends StatefulWidget {
  const NoticiasPagina({super.key});

  @override
  State<NoticiasPagina> createState() => _NoticiasPaginaState();
}

class _NoticiasPaginaState extends State<NoticiasPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  late final Stream<List<Noticia>> _noticias = _repo.noticias(max: 30);
  late final Stream<Municipio?> _municipio = _repo.municipio();
  String _filtro = 'Todas';

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: StreamBuilder<List<Noticia>>(
        stream: _noticias,
        builder: (context, snap) {
          final todas = snap.data ?? const <Noticia>[];
          final categorias = {
            for (final n in todas)
              if (n.categoria.isNotEmpty) n.categoria,
          }.toList();
          final visibles = _filtro == 'Todas'
              ? todas
              : todas.where((n) => n.categoria == _filtro).toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.only(top: 12, bottom: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                StreamBuilder<Municipio?>(
                  stream: _municipio,
                  builder: (context, m) => EncabezadoPestana(
                    titulo: 'Noticias',
                    leyenda:
                        'Lo que pasa en ${m.data?.nombre ?? 'tu municipio'}',
                  ),
                ),
                const SizedBox(height: 20),
                if (categorias.isNotEmpty) ...[
                  FiltroChips(
                    opciones: ['Todas', ...categorias],
                    elegida: _filtro,
                    alElegir: (f) => setState(() => _filtro = f),
                  ),
                  const SizedBox(height: 20),
                ],
                if (snap.connectionState == ConnectionState.waiting &&
                    todas.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (visibles.isEmpty)
                  const Vacio(
                    texto: 'El municipio todavía no publica noticias.',
                  )
                else
                  Lateral(
                    child: Column(
                      children: [
                        for (final (i, n) in visibles.indexed) ...[
                          if (i > 0) const SizedBox(height: 14),
                          _Nota(noticia: n),
                        ],
                      ],
                    ),
                  ),
                const SizedBox(height: 20),
                Cargar<List<AvisoParroquial>>(
                  futuro: _repo.avisosParroquiales,
                  builder: (context, avisos) => (avisos ?? const []).isEmpty
                      ? const SizedBox.shrink()
                      : Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const TituloSeccion(
                                titulo: 'Avisos parroquiales',
                              ),
                              const SizedBox(height: 14),
                              for (final a in avisos!) ...[
                                Lateral(child: _AvisoParroquial(aviso: a)),
                                const SizedBox(height: 10),
                              ],
                            ],
                          ),
                        ),
                ),
                Cargar<List<Esquela>>(
                  futuro: _repo.esquelas,
                  builder: (context, esquelas) => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TituloSeccion(
                        titulo: 'Esquelas',
                        accion: 'Publicar',
                        alTocar: () =>
                            avisoPronto(context, 'Publicar una esquela'),
                      ),
                      const SizedBox(height: 14),
                      if ((esquelas ?? const []).isEmpty)
                        const Vacio(texto: 'Sin esquelas publicadas.')
                      else
                        for (final e in esquelas!) ...[
                          Lateral(child: _TarjetaEsquela(esquela: e)),
                          const SizedBox(height: 10),
                        ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Nota extends StatelessWidget {
  const _Nota({required this.noticia});

  final Noticia noticia;

  @override
  Widget build(BuildContext context) {
    final (fondo, texto) = colorCategoria(noticia.categoria);
    return TarjetaBorde(
      relleno: EdgeInsets.zero,
      alTocar: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => DetalleNoticia(noticia: noticia)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 148,
            width: double.infinity,
            color: fondo,
            child: noticia.imagen.startsWith('http')
                ? Image.network(
                    noticia.imagen,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox(),
                  )
                : null,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (noticia.categoria.isNotEmpty) ...[
                  Pastilla(
                    texto: noticia.categoria.toUpperCase(),
                    fondo: fondo,
                    color: texto,
                  ),
                  const SizedBox(height: 9),
                ],
                Text(noticia.titulo, style: Tipografia.titulo),
                const SizedBox(height: 9),
                Text(
                  [
                    haceCuanto(noticia.publicadaEn),
                    if (noticia.fuente.isNotEmpty) noticia.fuente,
                  ].join(' · '),
                  style: Tipografia.micro,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Nota completa.
class DetalleNoticia extends StatelessWidget {
  const DetalleNoticia({super.key, required this.noticia});

  final Noticia noticia;

  @override
  Widget build(BuildContext context) {
    final (fondo, texto) = colorCategoria(noticia.categoria);
    return PantallaModulo(
      titulo: noticia.categoria.isEmpty ? 'Noticia' : noticia.categoria,
      subtitulo: [
        haceCuanto(noticia.publicadaEn),
        if (noticia.fuente.isNotEmpty) noticia.fuente,
      ].join(' · '),
      hijos: [
        Lateral(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 190,
              color: fondo,
              child: noticia.imagen.startsWith('http')
                  ? Image.network(noticia.imagen, fit: BoxFit.cover)
                  : null,
            ),
          ),
        ),
        Lateral(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (noticia.categoria.isNotEmpty) ...[
                Pastilla(
                  texto: noticia.categoria.toUpperCase(),
                  fondo: fondo,
                  color: texto,
                ),
                const SizedBox(height: 10),
              ],
              Text(noticia.titulo, style: Tipografia.tituloPantalla),
              const SizedBox(height: 14),
              Text(
                noticia.cuerpo.isNotEmpty
                    ? noticia.cuerpo
                    : 'Sin más detalles por ahora.',
                style: Tipografia.cuerpoNormal.copyWith(
                  color: Colores.textoPrimario,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AvisoParroquial extends StatelessWidget {
  const _AvisoParroquial({required this.aviso});

  final AvisoParroquial aviso;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        color: Colores.fondoSutil,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Colores.fondoTarjeta,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              LucideIcons.church,
              size: 20,
              color: Colores.textoPrimario,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(aviso.titulo, style: Tipografia.subtitulo),
                const SizedBox(height: 3),
                Text(aviso.detalle, style: Tipografia.micro),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TarjetaEsquela extends StatelessWidget {
  const _TarjetaEsquela({required this.esquela});

  final Esquela esquela;

  static const _meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  @override
  Widget build(BuildContext context) {
    final f = esquela.fallecio;
    return TarjetaBorde(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(esquela.nombre, style: Tipografia.cuerpo),
          const SizedBox(height: 3),
          Text(
            'Falleció el ${f.day} de ${_meses[f.month - 1]} de ${f.year}',
            style: Tipografia.micro,
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Text(esquela.misa, style: Tipografia.subtitulo),
          const SizedBox(height: 3),
          Text(esquela.lugar, style: Tipografia.micro),
        ],
      ),
    );
  }
}
