import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/contenido.dart';
import '../datos/repositorio.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/comunes.dart';
import '../nucleo/widgets/shimmer_placeholders.dart';
import 'inicio/widgets/carrusel_noticias.dart' show haceCuanto;

/// 03 · Comercio y Empleo
class ComercioPagina extends StatefulWidget {
  const ComercioPagina({super.key});

  @override
  State<ComercioPagina> createState() => _ComercioPaginaState();
}

class _ComercioPaginaState extends State<ComercioPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  final _buscar = TextEditingController();
  List<Comercio> _comercios = const [];
  bool _cargando = true;
  String _filtro = 'Todos';

  static const _categorias = [
    'Todos',
    'Restaurantes',
    'Servicios',
    'Salud',
    'Tiendas',
  ];

  @override
  void initState() {
    super.initState();
    _repo.comercios().then((c) {
      if (mounted) {
        setState(() {
          _comercios = c;
          _cargando = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _buscar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _buscar.text.trim().toLowerCase();
    final visibles = _comercios
        .where((c) => _filtro == 'Todos' || c.categoria == _filtro)
        .where(
          (c) =>
              q.isEmpty ||
              '${c.nombre} ${c.categoria} ${c.direccion}'
                  .toLowerCase()
                  .contains(q),
        )
        .toList();

    return SafeArea(
      bottom: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(top: 12, bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const EncabezadoPestana(
              titulo: 'Comercio',
              leyenda: 'Negocios, empleo y clasificados',
            ),
            const SizedBox(height: 20),
            Lateral(
              child: TextField(
                controller: _buscar,
                onChanged: (_) => setState(() {}),
                style: Tipografia.leyenda.copyWith(
                  color: Colores.textoPrimario,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Buscar negocio o servicio',
                  hintStyle: Tipografia.leyenda,
                  prefixIcon: const Icon(
                    LucideIcons.search,
                    size: 18,
                    color: Colores.textoSecundario,
                  ),
                  filled: true,
                  fillColor: Colores.fondoSutil,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            FiltroChips(
              opciones: _categorias,
              elegida: _filtro,
              alElegir: (f) => setState(() => _filtro = f),
            ),
            const SizedBox(height: 20),
            if (_cargando)
              const Lateral(child: ShimmerLista(cantidad: 3, alto: 110))
            else if (visibles.isEmpty)
              Vacio(
                texto: q.isEmpty
                    ? 'Todavía no hay negocios registrados en esta categoría.'
                    : 'Ningún negocio coincide con "$q".',
              )
            else
              Lateral(
                child: Column(
                  children: [
                    for (final (i, c) in visibles.indexed) ...[
                      if (i > 0) const SizedBox(height: 14),
                      TarjetaComercio(comercio: c),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: 20),
            Cargar<List<Vacante>>(
              futuro: _repo.vacantes,
              builder: (context, vacantes) => _Seccion(
                titulo: 'Bolsa de trabajo',
                accion: 'Publicar vacante',
                vacio: 'Sin vacantes por ahora.',
                hijos: [
                  for (final v in vacantes ?? const <Vacante>[])
                    _TarjetaVacante(vacante: v),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Cargar<List<Clasificado>>(
              futuro: _repo.clasificados,
              builder: (context, clasificados) => _Seccion(
                titulo: 'Clasificados',
                accion: 'Publicar gratis',
                vacio: 'Sin clasificados por ahora.',
                hijos: [
                  for (final c in clasificados ?? const <Clasificado>[])
                    _TarjetaClasificado(clasificado: c),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Seccion extends StatelessWidget {
  const _Seccion({
    required this.titulo,
    required this.accion,
    required this.vacio,
    required this.hijos,
  });

  final String titulo;
  final String accion;
  final String vacio;
  final List<Widget> hijos;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TituloSeccion(
          titulo: titulo,
          accion: accion,
          alTocar: () => avisoPronto(context, accion),
        ),
        const SizedBox(height: 14),
        if (hijos.isEmpty)
          Vacio(texto: vacio)
        else
          Lateral(
            child: Column(
              children: [
                for (final (i, h) in hijos.indexed) ...[
                  if (i > 0) const SizedBox(height: 10),
                  h,
                ],
              ],
            ),
          ),
      ],
    );
  }
}

/// Tarjeta de negocio con foto, calificacion y WhatsApp.
class TarjetaComercio extends StatelessWidget {
  const TarjetaComercio({super.key, required this.comercio});

  final Comercio comercio;

  static Color fondoCategoria(String categoria) => switch (categoria) {
    'Salud' => Colores.exitoSuave,
    'Restaurantes' => Colores.avisoSuave,
    'Servicios' => Colores.soft,
    _ => const Color(0xFFF3EEFC),
  };

  @override
  Widget build(BuildContext context) {
    final c = comercio;
    return TarjetaBorde(
      relleno: EdgeInsets.zero,
      radio: Medidas.radioModulo,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 132,
            width: double.infinity,
            color: fondoCategoria(c.categoria),
            child: Icon(
              _iconoCategoria(c.categoria),
              size: 34,
              color: Colores.textoSecundario.withValues(alpha: 0.35),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(c.nombre, style: Tipografia.titulo)),
                    c.abierto
                        ? const Pastilla(
                            texto: 'Abierto',
                            fondo: Colores.exitoSuave,
                            color: Colores.exito,
                          )
                        : const Pastilla(
                            texto: 'Cerrado',
                            fondo: Colores.fondoSutil,
                            color: Colores.textoSecundario,
                          ),
                  ],
                ),
                if (c.calificacion > 0) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      for (var i = 0; i < 5; i++)
                        Padding(
                          padding: const EdgeInsets.only(right: 2),
                          child: Icon(
                            LucideIcons.star,
                            size: 12,
                            color: i < c.calificacion.round()
                                ? const Color(0xFFF5A524)
                                : Colores.borde,
                          ),
                        ),
                      const SizedBox(width: 5),
                      Text(
                        c.calificacion.toStringAsFixed(1),
                        style: Tipografia.subtitulo,
                      ),
                      Text(
                        '  ·  ${c.resenas} reseñas',
                        style: Tipografia.micro,
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 10),
                Text(
                  '${c.direccion} · ${c.categoria}',
                  style: Tipografia.micro,
                ),
                const SizedBox(height: 10),
                BotonWhatsApp(
                  numero: c.whatsapp,
                  mensaje: 'Hola, te encontré en MiTeocal.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static IconData _iconoCategoria(String categoria) => switch (categoria) {
    'Salud' => LucideIcons.pill,
    'Restaurantes' => LucideIcons.utensils,
    'Servicios' => LucideIcons.wrench,
    _ => LucideIcons.store,
  };
}

class _TarjetaVacante extends StatelessWidget {
  const _TarjetaVacante({required this.vacante});

  final Vacante vacante;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return TarjetaBorde(
      relleno: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(vacante.puesto, style: Tipografia.cuerpo),
          const SizedBox(height: 2),
          Text(vacante.empresa, style: Tipografia.micro),
          const SizedBox(height: 9),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Pastilla(
                texto: vacante.jornada,
                fondo: Colores.fondoSutil,
                color: Colores.textoSecundario,
                radio: 7,
              ),
              Pastilla(
                texto: vacante.sueldo,
                fondo: Colores.soft,
                color: primary,
                radio: 7,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TarjetaClasificado extends StatelessWidget {
  const _TarjetaClasificado({required this.clasificado});

  final Clasificado clasificado;

  @override
  Widget build(BuildContext context) {
    final c = clasificado;
    final icono = switch (c.categoria) {
      'Vehículo' => LucideIcons.car,
      'Inmueble' => LucideIcons.house,
      _ => LucideIcons.tag,
    };
    return TarjetaBorde(
      relleno: const EdgeInsets.fromLTRB(12, 12, 14, 12),
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: Colores.fondoSutil,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icono, size: 24, color: Colores.textoSecundario),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(c.titulo, style: Tipografia.subtitulo),
                const SizedBox(height: 4),
                Text(
                  c.precio,
                  style: Tipografia.cuerpo.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${c.categoria} · ${haceCuanto(c.publicado)}',
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
