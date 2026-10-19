import 'package:flutter/material.dart';

import '../../../datos/modelos/noticia.dart';
import '../../../nucleo/tema/tema.dart';

/// Colores de portada y etiqueta por categoria (Figma: Obras, Salud, Cultura).
(Color, Color) colorCategoria(String categoria) {
  switch (categoria.toLowerCase()) {
    case 'salud':
      return (const Color(0xFFE6F6EE), const Color(0xFF0B7A3E));
    case 'cultura':
    case 'feria':
      return (const Color(0xFFF3EEFC), const Color(0xFF6B36C9));
    case 'seguridad':
    case 'emergencia':
      return (Colores.peligroSuave, Colores.peligro);
    case 'agua':
      return (const Color(0xFFE8F4FD), const Color(0xFF1B6FB5));
    default:
      return (Colores.soft, Colores.primary);
  }
}

/// "Hace 2 horas", "Ayer", "12 oct"
String haceCuanto(DateTime fecha, [DateTime? ahora]) {
  final d = (ahora ?? DateTime.now()).difference(fecha);
  if (d.inMinutes < 1) return 'Ahora';
  if (d.inMinutes < 60) return 'Hace ${d.inMinutes} min';
  if (d.inHours < 24) {
    return d.inHours == 1 ? 'Hace 1 hora' : 'Hace ${d.inHours} horas';
  }
  if (d.inDays == 1) return 'Ayer';
  if (d.inDays < 7) return 'Hace ${d.inDays} días';
  const meses = [
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
  return '${fecha.day} ${meses[fecha.month - 1]}';
}

class CarruselNoticias extends StatefulWidget {
  const CarruselNoticias({super.key, required this.noticias});

  final List<Noticia> noticias;

  @override
  State<CarruselNoticias> createState() => _CarruselNoticiasState();
}

class _CarruselNoticiasState extends State<CarruselNoticias> {
  static const _ancho = 248.0;
  static const _separacion = 12.0;
  final _scroll = ScrollController();
  int _pagina = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      final p = (_scroll.offset / (_ancho + _separacion)).round().clamp(
        0,
        widget.noticias.length - 1,
      );
      if (p != _pagina) setState(() => _pagina = p);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final noticias = widget.noticias;
    final primary = Theme.of(context).colorScheme.primary;

    return Column(
      children: [
        SizedBox(
          height: 250,
          child: ListView.separated(
            controller: _scroll,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: Medidas.margenLateral,
            ),
            itemCount: noticias.length,
            separatorBuilder: (_, _) => const SizedBox(width: _separacion),
            itemBuilder: (context, i) => _TarjetaNoticia(noticia: noticias[i]),
          ),
        ),
        if (noticias.length > 1) ...[
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < noticias.length; i++) ...[
                if (i > 0) const SizedBox(width: 5),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: i == _pagina ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _pagina ? primary : const Color(0xFFD8DCE3),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ],
            ],
          ),
        ],
      ],
    );
  }
}

class _TarjetaNoticia extends StatelessWidget {
  const _TarjetaNoticia({required this.noticia});

  final Noticia noticia;

  @override
  Widget build(BuildContext context) {
    final (fondo, texto) = colorCategoria(noticia.categoria);
    return Container(
      width: 248,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colores.fondoTarjeta,
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        border: Border.all(color: Colores.borde),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 124,
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
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (noticia.categoria.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: fondo,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      noticia.categoria.toUpperCase(),
                      style: Tipografia.micro.copyWith(color: texto),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  noticia.titulo,
                  style: Tipografia.cuerpo,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Text(haceCuanto(noticia.publicadaEn), style: Tipografia.micro),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
