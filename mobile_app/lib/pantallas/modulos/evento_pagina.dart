import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../datos/sesion.dart';
import '../../nucleo/servicios/hapticos.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';
import '../../nucleo/widgets/comunes.dart';

/// Colores del cartel por tipo de evento (cuando no hay foto).
(List<Color>, IconData) estiloTipo(String tipo) => switch (tipo) {
  'Certamen' => (
    const [Color(0xFFE04F8B), Color(0xFF8E2A6B)],
    LucideIcons.crown,
  ),
  'Cultural' => (
    const [Color(0xFFE59A2B), Color(0xFFA2541A)],
    LucideIcons.drama,
  ),
  'Jaripeo' => (
    const [Color(0xFFB0662F), Color(0xFF5E3313)],
    LucideIcons.sparkles,
  ),
  'Religioso' => (
    const [Color(0xFF4F7FD9), Color(0xFF263F8A)],
    LucideIcons.church,
  ),
  _ => (const [Color(0xFF5B3FD6), Color(0xFF1B1F5E)], LucideIcons.music),
};

const _dias = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];
const _meses = [
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

/// Eventos marcados con corazon. Se guardan en el telefono.
class AgendaFeria {
  static const _clave = 'agendaFeria';

  static Future<Set<String>> leer() async {
    try {
      final p = await SharedPreferences.getInstance();
      return (p.getStringList(_clave) ?? const []).toSet();
    } catch (_) {
      return {};
    }
  }

  static Future<void> guardar(Set<String> ids) async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setStringList(_clave, ids.toList());
    } catch (_) {}
  }
}

/// Detalle de un evento de la feria a pantalla completa. Devuelve el [Pase]
/// si el vecino aparto un boleto.
class EventoPagina extends StatefulWidget {
  const EventoPagina({
    super.key,
    required this.evento,
    this.mismaNoche = const [],
    this.municipio = '',
  });

  final EventoFeria evento;

  /// Otros eventos del mismo dia (certamen + artista, por ejemplo).
  final List<EventoFeria> mismaNoche;
  final String municipio;

  @override
  State<EventoPagina> createState() => _EventoPaginaState();
}

class _EventoPaginaState extends State<EventoPagina> {
  bool _enAgenda = false;
  bool _comprando = false;

  EventoFeria get e => widget.evento;

  @override
  void initState() {
    super.initState();
    AgendaFeria.leer().then((ids) {
      if (mounted) setState(() => _enAgenda = ids.contains(e.id));
    });
  }

  Future<void> _alternarAgenda() async {
    final ids = await AgendaFeria.leer();
    final nuevo = !ids.contains(e.id);
    nuevo ? ids.add(e.id) : ids.remove(e.id);
    await AgendaFeria.guardar(ids);
    if (!mounted) return;
    setState(() => _enAgenda = nuevo);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          nuevo ? 'Agregado a tu agenda de la feria.' : 'Quitado de tu agenda.',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String get _fechaLarga =>
      '${_dias[e.fecha.weekday - 1]} ${e.fecha.day} de ${_meses[e.fecha.month - 1]}';

  Future<void> _compartir() async {
    final m = widget.municipio.isEmpty ? '' : ' de ${widget.municipio}';
    await SharePlus.instance.share(
      ShareParams(
        text:
            '${e.titulo}${e.artista.isNotEmpty ? ' con ${e.artista}' : ''}\n'
            '${_fechaLarga[0].toUpperCase()}${_fechaLarga.substring(1)} · ${e.lugarYHora}\n'
            'Feria$m 2026 · Míralo en la app MiTeocal',
      ),
    );
  }

  Future<void> _comoLlegar() async {
    final q = Uri.encodeComponent('${e.lugar} ${widget.municipio} Jalisco');
    await launchUrl(
      Uri.parse('https://www.google.com/maps/search/?api=1&query=$q'),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _apartar() async {
    final perfil = context.read<Sesion>().perfil;
    if (perfil == null) return;
    setState(() => _comprando = true);
    try {
      final pase = await context.read<Repositorio>().comprarBoleto(e, perfil);
      await Hapticos.exito();
      if (mounted) Navigator.of(context).pop(pase);
    } catch (err) {
      if (!mounted) return;
      setState(() => _comprando = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('No se pudo apartar: $err')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final (colores, icono) = estiloTipo(e.tipo);
    final arriba = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: Colores.fondoPantalla,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _Cartel(
              evento: e,
              colores: colores,
              icono: icono,
              arriba: arriba,
              enAgenda: _enAgenda,
              alAgenda: _alternarAgenda,
              alCompartir: _compartir,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(
              Medidas.margenLateral,
              20,
              Medidas.margenLateral,
              24,
            ),
            sliver: SliverList.list(
              children: [
                Row(
                  children: [
                    _Dato(
                      icono: LucideIcons.calendar,
                      titulo: 'Fecha',
                      valor:
                          '${_dias[e.fecha.weekday - 1].substring(0, 3)} ${e.fecha.day} ${_meses[e.fecha.month - 1]}',
                    ),
                    const SizedBox(width: 10),
                    _Dato(
                      icono: LucideIcons.clock,
                      titulo: 'Hora',
                      valor: e.hora.isEmpty ? 'Por confirmar' : '${e.hora} hrs',
                    ),
                    const SizedBox(width: 10),
                    _Dato(
                      icono: LucideIcons.mapPin,
                      titulo: 'Lugar',
                      valor: e.lugar,
                    ),
                  ],
                ),
                if (e.descripcion.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text('Acerca del evento', style: Tipografia.titulo),
                  const SizedBox(height: 8),
                  Text(
                    e.descripcion,
                    style: Tipografia.cuerpoNormal.copyWith(
                      color: Colores.textoSecundario,
                    ),
                  ),
                ],
                if (widget.mismaNoche.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text('Esa misma noche', style: Tipografia.titulo),
                  const SizedBox(height: 10),
                  for (final otro in widget.mismaNoche) ...[
                    TarjetaBorde(
                      relleno: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      alTocar: () => Navigator.of(context).pushReplacement(
                        MaterialPageRoute(
                          builder: (_) => EventoPagina(
                            evento: otro,
                            mismaNoche: [
                              e,
                              ...widget.mismaNoche.where(
                                (x) => x.id != otro.id,
                              ),
                            ],
                            municipio: widget.municipio,
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            estiloTipo(otro.tipo).$2,
                            size: 18,
                            color: estiloTipo(otro.tipo).$1.first,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              otro.titulo,
                              style: Tipografia.subtitulo,
                            ),
                          ),
                          Text(
                            otro.hora.isEmpty ? otro.lugar : '${otro.hora} hrs',
                            style: Tipografia.micro,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ],
                const SizedBox(height: 16),
                TarjetaBorde(
                  relleno: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 14,
                  ),
                  alTocar: _comoLlegar,
                  child: Row(
                    children: [
                      Icon(
                        LucideIcons.navigation,
                        size: 18,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Cómo llegar a ${e.lugar}',
                          style: Tipografia.subtitulo,
                        ),
                      ),
                      const Icon(
                        LucideIcons.chevronRight,
                        size: 16,
                        color: Colores.textoSecundario,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const InterruptorAviso(
                  titulo: 'Avísame 1 hora antes',
                  detalle: 'Te mandamos un recordatorio',
                  inicial: false,
                  sinMargen: true,
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _BarraAccion(
        evento: e,
        enAgenda: _enAgenda,
        comprando: _comprando,
        alApartar: _apartar,
        alAgenda: _alternarAgenda,
      ),
    );
  }
}

class _Cartel extends StatelessWidget {
  const _Cartel({
    required this.evento,
    required this.colores,
    required this.icono,
    required this.arriba,
    required this.enAgenda,
    required this.alAgenda,
    required this.alCompartir,
  });

  final EventoFeria evento;
  final List<Color> colores;
  final IconData icono;
  final double arriba;
  final bool enAgenda;
  final VoidCallback alAgenda;
  final VoidCallback alCompartir;

  @override
  Widget build(BuildContext context) {
    final e = evento;
    Widget circulo(
      IconData i,
      VoidCallback alTocar, {
      Color color = Colors.white,
    }) => Material(
      color: Colors.black.withValues(alpha: 0.28),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: alTocar,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(i, size: 19, color: color),
        ),
      ),
    );

    return Hero(
      tag: 'evento-${e.id}',
      child: Material(
        type: MaterialType.transparency,
        child: Container(
          height: 300 + arriba,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colores,
        ),
        image: e.foto != null && e.foto!.startsWith('http')
            ? DecorationImage(image: NetworkImage(e.foto!), fit: BoxFit.cover)
            : null,
      ),
      child: Stack(
        children: [
          if (e.foto == null)
            Positioned(
              right: -30,
              top: arriba + 20,
              child: Icon(
                icono,
                size: 220,
                color: Colors.white.withValues(alpha: 0.10),
              ),
            ),
          // Velo inferior para que el titulo se lea sobre cualquier foto.
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x00000000),
                    Color(0x00000000),
                    Color(0x8C000000),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            top: arriba + 8,
            child: Row(
              children: [
                circulo(
                  LucideIcons.chevronLeft,
                  () => Navigator.of(context).maybePop(),
                ),
                const Spacer(),
                circulo(
                  LucideIcons.heart,
                  alAgenda,
                  color: enAgenda ? const Color(0xFFFF6B8B) : Colors.white,
                ),
                const SizedBox(width: 8),
                circulo(LucideIcons.share2, alCompartir),
              ],
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${e.tipo} · ${e.lugar}'.toUpperCase(),
                  style: Tipografia.etiqueta.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  e.titulo,
                  style: Tipografia.display.copyWith(color: Colors.white),
                ),
                if (e.artista.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Con ${e.artista}',
                    style: Tipografia.cuerpo.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  ),
);
  }
}

class _Dato extends StatelessWidget {
  const _Dato({required this.icono, required this.titulo, required this.valor});

  final IconData icono;
  final String titulo;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colores.fondoSutil,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icono, size: 18, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 8),
            Text(titulo, style: Tipografia.micro),
            const SizedBox(height: 2),
            Text(
              valor,
              style: Tipografia.subtitulo,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _BarraAccion extends StatelessWidget {
  const _BarraAccion({
    required this.evento,
    required this.enAgenda,
    required this.comprando,
    required this.alApartar,
    required this.alAgenda,
  });

  final EventoFeria evento;
  final bool enAgenda;
  final bool comprando;
  final VoidCallback alApartar;
  final VoidCallback alAgenda;

  @override
  Widget build(BuildContext context) {
    final e = evento;
    final agotado = e.disponibilidad == Disponibilidad.agotado;
    final (precio, nota) = e.gratuito
        ? ('Gratis', 'Sin boleto · ${e.lugar}')
        : e.precio == null
        ? ('Por confirmar', 'Pago simulado · no se cobra')
        : ('\$${e.precio} MXN', 'Pago simulado · no se cobra');

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colores.fondoTarjeta,
        border: Border(top: BorderSide(color: Colores.borde)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(precio, style: Tipografia.titulo),
                    const SizedBox(height: 2),
                    Text(
                      nota,
                      style: Tipografia.micro,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: e.gratuito
                    ? BotonPrimario(
                        texto: enAgenda
                            ? 'En mi agenda'
                            : 'Agregar a mi agenda',
                        icono: enAgenda ? LucideIcons.check : LucideIcons.heart,
                        relleno: 14,
                        alPresionar: alAgenda,
                      )
                    : BotonPrimario(
                        texto: agotado
                            ? 'Agotado'
                            : e.precio == null
                            ? 'Apartar boleto'
                            : 'Comprar boleto',
                        relleno: 14,
                        cargando: comprando,
                        alPresionar: agotado ? null : alApartar,
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
