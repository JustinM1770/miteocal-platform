import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../tema/tema.dart';
import 'botones.dart';

/// Pantalla de modulo (13–16, 05, 06): regresar + titulo + subtitulo, y el
/// contenido con scroll debajo.
class PantallaModulo extends StatelessWidget {
  const PantallaModulo({
    super.key,
    required this.titulo,
    required this.subtitulo,
    required this.hijos,
  });

  final String titulo;
  final String subtitulo;
  final List<Widget> hijos;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colores.fondoPantalla,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(top: 12, bottom: 34),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  Medidas.margenLateral,
                  0,
                  Medidas.margenLateral,
                  0,
                ),
                child: Row(
                  children: [
                    const BotonVolver(),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(titulo, style: Tipografia.titulo),
                          const SizedBox(height: 2),
                          Text(
                            subtitulo,
                            style: Tipografia.micro,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              for (final h in hijos) ...[const SizedBox(height: 22), h],
            ],
          ),
        ),
      ),
    );
  }
}

/// Encabezado de pestaña (02, 03): titulo grande + leyenda.
class EncabezadoPestana extends StatelessWidget {
  const EncabezadoPestana({
    super.key,
    required this.titulo,
    required this.leyenda,
  });

  final String titulo;
  final String leyenda;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Medidas.margenLateral,
        8,
        Medidas.margenLateral,
        0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titulo, style: Tipografia.tituloPantalla),
          const SizedBox(height: 3),
          Text(leyenda, style: Tipografia.leyenda),
        ],
      ),
    );
  }
}

/// Margen lateral estandar de 20.
class Lateral extends StatelessWidget {
  const Lateral({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
    child: child,
  );
}

/// "Noticias ······ Ver todas"
class TituloSeccion extends StatelessWidget {
  const TituloSeccion({
    super.key,
    required this.titulo,
    this.accion,
    this.alTocar,
    this.etiqueta = false,
  });

  final String titulo;
  final String? accion;
  final VoidCallback? alTocar;

  /// Estilo "TUS ESCUELAS" (mayusculas grises) en vez de Heading.
  final bool etiqueta;

  @override
  Widget build(BuildContext context) {
    return Lateral(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              etiqueta ? titulo.toUpperCase() : titulo,
              style: etiqueta ? Tipografia.etiqueta : Tipografia.titulo,
            ),
          ),
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

/// Chips de filtro con scroll horizontal ("Todas · Obras · Salud").
class FiltroChips extends StatelessWidget {
  const FiltroChips({
    super.key,
    required this.opciones,
    required this.elegida,
    required this.alElegir,
  });

  final List<String> opciones;
  final String elegida;
  final ValueChanged<String> alElegir;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
      child: Row(
        children: [
          for (final (i, o) in opciones.indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            Builder(
              builder: (context) {
                final activa = o == elegida;
                return GestureDetector(
                  onTap: () => alElegir(o),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 15,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: activa ? primary : Colores.fondoSutil,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      o,
                      style: Tipografia.subtitulo.copyWith(
                        color: activa
                            ? Colores.textoInverso
                            : Colores.textoSecundario,
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

/// Etiqueta de color ("OBRAS", "Abierto", "Cierre total").
class Pastilla extends StatelessWidget {
  const Pastilla({
    super.key,
    required this.texto,
    required this.fondo,
    required this.color,
    this.radio = 6,
  });

  final String texto;
  final Color fondo;
  final Color color;
  final double radio;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(radio),
      ),
      child: Text(texto, style: Tipografia.micro.copyWith(color: color)),
    );
  }
}

/// Tarjeta blanca con filete gris.
class TarjetaBorde extends StatelessWidget {
  const TarjetaBorde({
    super.key,
    required this.child,
    this.relleno = const EdgeInsets.all(16),
    this.radio = 16,
    this.alTocar,
  });

  final Widget child;
  final EdgeInsets relleno;
  final double radio;
  final VoidCallback? alTocar;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colores.fondoTarjeta,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radio),
        side: const BorderSide(color: Colores.borde),
      ),
      child: InkWell(
        onTap: alTocar,
        child: Padding(padding: relleno, child: child),
      ),
    );
  }
}

/// Fila azul suave con interruptor ("Avísame cuando vuelva el agua").
///
/// TODO(FCM): hoy solo guarda la preferencia en pantalla; con notificaciones
/// se suscribe al tema correspondiente.
class InterruptorAviso extends StatefulWidget {
  const InterruptorAviso({
    super.key,
    required this.titulo,
    required this.detalle,
    this.inicial = true,
    this.sinMargen = false,
  });

  final String titulo;
  final String detalle;
  final bool inicial;

  /// true cuando el padre ya aplica el margen de 20.
  final bool sinMargen;

  @override
  State<InterruptorAviso> createState() => _InterruptorAvisoState();
}

class _InterruptorAvisoState extends State<InterruptorAviso> {
  late bool _activo = widget.inicial;

  @override
  Widget build(BuildContext context) {
    final fila = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colores.soft,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.titulo, style: Tipografia.subtitulo),
                const SizedBox(height: 2),
                Text(widget.detalle, style: Tipografia.micro),
              ],
            ),
          ),
          Switch.adaptive(
            value: _activo,
            activeTrackColor: Theme.of(context).colorScheme.primary,
            onChanged: (v) => setState(() => _activo = v),
          ),
        ],
      ),
    );
    return widget.sinMargen ? fila : Lateral(child: fila);
  }
}

/// Cuadro de fecha ("01 / NOV").
class CajaFecha extends StatelessWidget {
  const CajaFecha({
    super.key,
    required this.fecha,
    this.fondo = Colores.soft,
    this.color,
  });

  final DateTime fecha;
  final Color fondo;
  final Color? color;

  static const meses = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ];

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      width: 50,
      height: 52,
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            fecha.day.toString().padLeft(2, '0'),
            style: Tipografia.titulo.copyWith(color: c),
          ),
          Text(
            meses[fecha.month - 1],
            style: Tipografia.micro.copyWith(color: c),
          ),
        ],
      ),
    );
  }
}

/// Boton verde "Contactar por WhatsApp".
class BotonWhatsApp extends StatelessWidget {
  const BotonWhatsApp({super.key, required this.numero, this.mensaje = ''});

  /// 10 digitos. null en el demo: avisa en vez de abrir un chat a un numero falso.
  final String? numero;
  final String mensaje;

  Future<void> _abrir(BuildContext context) async {
    final n = numero;
    if (n == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Este negocio aún no comparte su WhatsApp (datos de demo).',
          ),
        ),
      );
      return;
    }
    final url = Uri.parse(
      'https://wa.me/52$n${mensaje.isEmpty ? '' : '?text=${Uri.encodeComponent(mensaje)}'}',
    );
    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colores.whatsapp,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _abrir(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 11),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                LucideIcons.messageCircle,
                size: 17,
                color: Colors.white,
              ),
              const SizedBox(width: 8),
              Text(
                'Contactar por WhatsApp',
                style: Tipografia.subtitulo.copyWith(color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Estado vacio honesto para listas sin datos todavia.
class Vacio extends StatelessWidget {
  const Vacio({super.key, required this.texto});
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Lateral(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colores.fondoSutil,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(texto, style: Tipografia.leyenda),
      ),
    );
  }
}

/// Carga una lista del repositorio una vez y la entrega al builder.
class Cargar<T> extends StatefulWidget {
  const Cargar({super.key, required this.futuro, required this.builder});

  final Future<T> Function() futuro;
  final Widget Function(BuildContext context, T? datos) builder;

  @override
  State<Cargar<T>> createState() => _CargarState<T>();
}

class _CargarState<T> extends State<Cargar<T>> {
  late final Future<T> _f = widget.futuro();

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: _f,
    builder: (context, s) => widget.builder(context, s.data),
  );
}

void avisoPronto(BuildContext context, String que) {
  ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text('$que estará disponible muy pronto.')));
}
