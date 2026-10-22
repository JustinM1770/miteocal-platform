import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/comunes.dart';
import '../../nucleo/widgets/shimmer_placeholders.dart';
import '../inicio/widgets/carrusel_noticias.dart' show haceCuanto;

/// 16 · Escuelas: el vecino sigue planteles y ve sus avisos.
///
/// Los planteles seguidos se guardan en el telefono. TODO(FCM): suscribir a
/// un tema por plantel para que el aviso llegue como notificacion.
class EscuelasPagina extends StatefulWidget {
  const EscuelasPagina({super.key, this.municipio = ''});

  final String municipio;

  @override
  State<EscuelasPagina> createState() => _EscuelasPaginaState();
}

class _EscuelasPaginaState extends State<EscuelasPagina> {
  static const _clave = 'escuelasSeguidas';
  late final Repositorio _repo = context.read<Repositorio>();
  final _buscar = TextEditingController();
  List<Escuela> _escuelas = const [];
  List<AvisoEscolar> _avisos = const [];
  Set<String> _seguidas = {};
  final Set<String> _silenciadas = {};
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final r = await Future.wait([_repo.escuelas(), _repo.avisosEscolares()]);
    Set<String> seguidas;
    try {
      final prefs = await SharedPreferences.getInstance();
      seguidas = (prefs.getStringList(_clave) ?? const []).toSet();
    } catch (_) {
      seguidas = {};
    }
    final escuelas = r[0] as List<Escuela>;
    // Primera vez en el demo: sigue las dos primeras para que se vea la pantalla.
    if (seguidas.isEmpty && escuelas.length >= 2) {
      seguidas = {escuelas[0].id, escuelas[1].id};
    }
    if (!mounted) return;
    setState(() {
      _escuelas = escuelas;
      _avisos = r[1] as List<AvisoEscolar>;
      _seguidas = seguidas;
      _cargando = false;
    });
  }

  Future<void> _seguir(String id, bool seguir) async {
    setState(() => seguir ? _seguidas.add(id) : _seguidas.remove(id));
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_clave, _seguidas.toList());
    } catch (_) {}
  }

  @override
  void dispose() {
    _buscar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final mias = _escuelas.where((e) => _seguidas.contains(e.id)).toList();
    final q = _buscar.text.trim().toLowerCase();
    final sugerencias = _escuelas
        .where(
          (e) =>
              !_seguidas.contains(e.id) &&
              (q.isEmpty || e.nombre.toLowerCase().contains(q)),
        )
        .toList();
    final avisos = _avisos
        .where(
          (a) =>
              _seguidas.contains(a.escuelaId) &&
              !_silenciadas.contains(a.escuelaId),
        )
        .toList();
    String nombreDe(String id) =>
        _escuelas.where((e) => e.id == id).firstOrNull?.nombre ?? id;

    if (_cargando) {
      return const PantallaModulo(
        titulo: 'Escuelas',
        subtitulo: 'Avisos de los planteles que sigues',
        hijos: [Lateral(child: ShimmerLista(cantidad: 3))],
      );
    }

    return PantallaModulo(
      titulo: 'Escuelas',
      subtitulo: 'Avisos de los planteles que sigues',
      hijos: [
        Lateral(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('TUS ESCUELAS', style: Tipografia.etiqueta),
              const SizedBox(height: 11),
              if (mias.isEmpty)
                Text(
                  'Aún no sigues ninguna escuela.',
                  style: Tipografia.leyenda,
                )
              else
                for (final e in mias) ...[
                  TarjetaBorde(
                    relleno: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 13,
                    ),
                    child: Row(
                      children: [
                        _Escudo(),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e.nombre, style: Tipografia.subtitulo),
                              const SizedBox(height: 2),
                              Text(e.nivel, style: Tipografia.micro),
                            ],
                          ),
                        ),
                        Switch.adaptive(
                          value: !_silenciadas.contains(e.id),
                          activeTrackColor: primary,
                          onChanged: (v) => setState(
                            () => v
                                ? _silenciadas.remove(e.id)
                                : _silenciadas.add(e.id),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
            ],
          ),
        ),
        Lateral(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('AGREGAR OTRA ESCUELA', style: Tipografia.etiqueta),
              const SizedBox(height: 11),
              TextField(
                controller: _buscar,
                onChanged: (_) => setState(() {}),
                style: Tipografia.leyenda.copyWith(
                  color: Colores.textoPrimario,
                ),
                decoration: InputDecoration(
                  isDense: true,
                  hintText:
                      'Buscar plantel${widget.municipio.isNotEmpty ? ' en ${widget.municipio}' : ''}',
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
              for (final e in sugerencias) ...[
                const SizedBox(height: 11),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colores.fondoSutil,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(e.nombre, style: Tipografia.subtitulo),
                            const SizedBox(height: 2),
                            Text(e.nivel, style: Tipografia.micro),
                          ],
                        ),
                      ),
                      Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          onTap: () => _seguir(e.id, true),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(12, 7, 13, 7),
                            child: Row(
                              children: [
                                Icon(
                                  LucideIcons.plus,
                                  size: 13,
                                  color: primary,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  'Seguir',
                                  style: Tipografia.micro.copyWith(
                                    color: primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Lateral(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('AVISOS RECIENTES', style: Tipografia.etiqueta),
              const SizedBox(height: 11),
              if (avisos.isEmpty)
                Text('Sin avisos de tus escuelas.', style: Tipografia.leyenda)
              else
                for (final a in avisos) ...[
                  _TarjetaAviso(aviso: a, escuela: nombreDe(a.escuelaId)),
                  const SizedBox(height: 10),
                ],
            ],
          ),
        ),
      ],
    );
  }
}

class _Escudo extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 38,
    height: 38,
    decoration: BoxDecoration(
      color: Colores.fondoSutil,
      borderRadius: BorderRadius.circular(12),
    ),
    child: const Icon(
      LucideIcons.graduationCap,
      size: 20,
      color: Colores.textoSecundario,
    ),
  );
}

class _TarjetaAviso extends StatelessWidget {
  const _TarjetaAviso({required this.aviso, required this.escuela});

  final AvisoEscolar aviso;
  final String escuela;

  @override
  Widget build(BuildContext context) {
    final (texto, fondo, color) = switch (aviso.tipo) {
      TipoAvisoEscolar.suspension => (
        'Suspensión de clases',
        Colores.peligroSuave,
        const Color(0xFFB32020),
      ),
      TipoAvisoEscolar.examen => (
        'Examen',
        Colores.exitoSuave,
        const Color(0xFF0B7A3E),
      ),
      TipoAvisoEscolar.aviso => ('Aviso', Colores.soft, Colores.primary),
    };
    return TarjetaBorde(
      relleno: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                LucideIcons.graduationCap,
                size: 16,
                color: Colores.textoSecundario,
              ),
              const SizedBox(width: 7),
              Expanded(child: Text(escuela, style: Tipografia.subtitulo)),
              Text(haceCuanto(aviso.fecha), style: Tipografia.micro),
            ],
          ),
          const SizedBox(height: 9),
          Pastilla(texto: texto, fondo: fondo, color: color, radio: 7),
          const SizedBox(height: 9),
          Text(aviso.texto, style: Tipografia.micro),
        ],
      ),
    );
  }
}
