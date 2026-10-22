import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../datos/sesion.dart';
import '../../nucleo/servicios/hapticos.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/animaciones.dart';
import '../../nucleo/widgets/comunes.dart';
import '../../nucleo/widgets/shimmer_placeholders.dart';
import 'evento_pagina.dart';

/// 05 · Feria: cartelera por escenario, mapa del recinto y pase digital.
///
/// La compra es SIMULADA: no se cobra nada. El QR lleva la misma carga que
/// valida el escaner del panel (MITEOCAL1|municipio|folio|pagoId).
class FeriaPagina extends StatefulWidget {
  const FeriaPagina({super.key, this.municipio = ''});

  final String municipio;

  @override
  State<FeriaPagina> createState() => _FeriaPaginaState();
}

class _FeriaPaginaState extends State<FeriaPagina> {
  late final Repositorio _repo = context.read<Repositorio>();
  final _clavePase = GlobalKey();
  List<EventoFeria> _eventos = const [];
  List<Pase> _pases = const [];
  static const _lugares = [
    'Todos',
    'Plaza principal',
    'Plaza de Toros',
    'Teatro del Pueblo',
  ];
  static const _tipos = [
    'Todos',
    'Musical',
    'Cultural',
    'Certamen',
    'Jaripeo',
    'Religioso',
    'Deportivo',
  ];

  /// null = todo el programa.
  DateTime? _dia;
  String _lugar = 'Todos';
  String _tipo = 'Todos';
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final perfil = context.read<Sesion>().perfil;
    final eventos = await _repo.eventosFeria();
    final pases = perfil == null ? <Pase>[] : await _repo.misPases(perfil);
    if (!mounted) return;
    final hoy = DateUtils.dateOnly(DateTime.now());
    setState(() {
      _eventos = eventos;
      _pases = pases;
      _cargando = false;
      if (eventos.any((e) => DateUtils.isSameDay(e.fecha, hoy))) _dia = hoy;
    });
  }

  Future<void> _abrirEvento(EventoFeria e) async {
    final mismaNoche = _eventos
        .where((x) => x.id != e.id && DateUtils.isSameDay(x.fecha, e.fecha))
        .toList();
    final comprado = await Navigator.of(context).push<Pase>(
      transicionDetalle(
        EventoPagina(
          evento: e,
          mismaNoche: mismaNoche,
          municipio: widget.municipio,
        ),
      ),
    );
    if (comprado == null || !mounted) return;
    setState(() => _pases = [comprado, ..._pases]);
    await Future<void>.delayed(const Duration(milliseconds: 300));
    final ctx = _clavePase.currentContext;
    if (ctx != null && ctx.mounted) {
      await Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final visibles = _eventos
        .where((e) => _dia == null || DateUtils.isSameDay(e.fecha, _dia))
        .where((e) => _lugar == 'Todos' || e.lugar == _lugar)
        .where((e) => _tipo == 'Todos' || e.tipo == _tipo)
        .toList();
    final dias = {
      for (final e in _eventos) DateUtils.dateOnly(e.fecha),
    }.toList()..sort();

    return PantallaModulo(
      titulo: 'Feria de Noviembre',
      subtitulo:
          'Recinto Ferial${widget.municipio.isNotEmpty ? ' · ${widget.municipio}' : ''}',
      hijos: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _TiraDias(
              dias: dias,
              elegido: _dia,
              alElegir: (d) => setState(() => _dia = d),
            ),
            const SizedBox(height: 14),
            FiltroChips(
              opciones: _lugares,
              elegida: _lugar,
              alElegir: (o) => setState(() => _lugar = o),
            ),
            const SizedBox(height: 8),
            FiltroChips(
              opciones: _tipos,
              elegida: _tipo,
              alElegir: (o) => setState(() => _tipo = o),
            ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Lateral(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      _dia == null ? 'Todo el programa' : _diaLargo(_dia!),
                      style: Tipografia.titulo,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      visibles.length == 1
                          ? '1 evento'
                          : '${visibles.length} eventos',
                      overflow: TextOverflow.ellipsis,
                      style: Tipografia.micro,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (_cargando)
              const Lateral(child: ShimmerLista(cantidad: 4))
            else if (visibles.isEmpty)
              Vacio(
                texto:
                    _lugar == 'Teatro del Pueblo' ||
                        _tipo == 'Religioso' ||
                        _tipo == 'Deportivo'
                    ? 'El programa de ${_tipo != 'Todos' ? _tipo.toLowerCase() : _lugar} se publica pronto.'
                    : 'No hay eventos con estos filtros.',
              )
            else
              Lateral(
                child: Column(
                  children: [
                    for (final (i, e) in visibles.indexed) ...[
                      // En "todo el programa" se agrupan por dia.
                      if (_dia == null &&
                          (i == 0 ||
                              !DateUtils.isSameDay(
                                visibles[i - 1].fecha,
                                e.fecha,
                              )))
                        Padding(
                          padding: EdgeInsets.only(
                            top: i == 0 ? 0 : 14,
                            bottom: 8,
                          ),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              _diaLargo(e.fecha).toUpperCase(),
                              style: Tipografia.etiqueta,
                            ),
                          ),
                        )
                      else if (i > 0)
                        const SizedBox(height: 10),
                      _TarjetaEvento(evento: e, alTocar: () => _abrirEvento(e)),
                    ],
                  ],
                ),
              ),
          ],
        ),
        const _Certamenes(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TituloSeccion(
              titulo: 'Mapa del recinto',
              accion: 'Ampliar',
              alTocar: () => avisoPronto(context, 'El mapa ampliado'),
            ),
            const SizedBox(height: 14),
            const Lateral(child: _PlanoRecinto()),
          ],
        ),
        Column(
          key: _clavePase,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TituloSeccion(
              titulo: _pases.length > 1
                  ? 'Tus pases digitales'
                  : 'Tu pase digital',
            ),
            const SizedBox(height: 14),
            if (_pases.isEmpty)
              const Vacio(
                texto:
                    'Compra un boleto de la cartelera y tu pase con código QR aparecerá aquí.',
              )
            else
              for (final p in _pases) ...[
                Lateral(child: _TarjetaPase(pase: p)),
                const SizedBox(height: 12),
              ],
          ],
        ),
      ],
    );
  }
}

const _diasSemana = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
const _mesesLargos = [
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

String _diaLargo(DateTime d) =>
    '${_diasSemana[d.weekday - 1]} ${d.day} de ${_mesesLargos[d.month - 1]}';

/// "Todo · JUE 30 · VIE 31 · SÁB 1 …" con scroll horizontal.
class _TiraDias extends StatelessWidget {
  const _TiraDias({
    required this.dias,
    required this.elegido,
    required this.alElegir,
  });

  final List<DateTime> dias;
  final DateTime? elegido;
  final ValueChanged<DateTime?> alElegir;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final hoy = DateUtils.dateOnly(DateTime.now());
    Widget celda({
      required bool activa,
      required VoidCallback alTocar,
      required Widget hijo,
    }) => GestureDetector(
      onTap: alTocar,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 54,
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(
          color: activa ? primary : Colores.fondoSutil,
          borderRadius: BorderRadius.circular(14),
        ),
        child: hijo,
      ),
    );

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
      child: Row(
        children: [
          celda(
            activa: elegido == null,
            alTocar: () => alElegir(null),
            hijo: Center(
              child: Text(
                'Todo',
                style: Tipografia.subtitulo.copyWith(
                  color: elegido == null ? Colors.white : Colores.textoPrimario,
                ),
              ),
            ),
          ),
          for (final d in dias) ...[
            const SizedBox(width: 8),
            celda(
              activa: elegido != null && DateUtils.isSameDay(d, elegido),
              alTocar: () => alElegir(d),
              hijo: Builder(
                builder: (context) {
                  final activa =
                      elegido != null && DateUtils.isSameDay(d, elegido);
                  final color = activa ? Colors.white : Colores.textoPrimario;
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        DateUtils.isSameDay(d, hoy)
                            ? 'HOY'
                            : _diasSemana[d.weekday - 1]
                                  .substring(0, 3)
                                  .toUpperCase(),
                        style: Tipografia.micro.copyWith(
                          color: activa
                              ? Colors.white70
                              : Colores.textoSecundario,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${d.day}',
                        style: Tipografia.titulo.copyWith(color: color),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Control segmentado (Srita. Teocaltiche | Miss Chiquitita).
class _Segmentos extends StatelessWidget {
  const _Segmentos({
    required this.opciones,
    required this.elegida,
    required this.alElegir,
  });

  final List<String> opciones;
  final String elegida;
  final ValueChanged<String> alElegir;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: Colores.fondoSutil,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        children: [
          for (final o in opciones)
            Expanded(
              child: GestureDetector(
                onTap: () => alElegir(o),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: o == elegida ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: o == elegida
                        ? const [
                            BoxShadow(
                              color: Color(0x12000000),
                              blurRadius: 3,
                              offset: Offset(0, 1),
                            ),
                          ]
                        : null,
                  ),
                  child: Text(
                    o,
                    style: Tipografia.subtitulo.copyWith(
                      color: o == elegida
                          ? Colores.textoPrimario
                          : Colores.textoSecundario,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

(String, Color, Color) _estado(Disponibilidad d) => switch (d) {
  Disponibilidad.disponible => (
    'Disponible',
    Colores.exitoSuave,
    Colores.exito,
  ),
  Disponibilidad.ultimos => (
    'Últimos lugares',
    Colores.avisoSuave,
    const Color(0xFFC77700),
  ),
  Disponibilidad.agotado => (
    'Agotado',
    Colores.fondoSutil,
    Colores.textoSecundario,
  ),
};

String _precio(int? p) => p == null
    ? 'Por confirmar'
    : p == 0
    ? 'Gratis'
    : '\$$p';

/// Etiqueta del evento: gratuito, precio por confirmar o disponibilidad.
(String, Color, Color) _etiquetaEvento(EventoFeria e) => e.gratuito
    ? ('Gratuito', Colores.exitoSuave, Colores.exito)
    : e.precio == null
    ? ('Precio por confirmar', Colores.avisoSuave, const Color(0xFFC77700))
    : _estado(e.disponibilidad);

class _TarjetaEvento extends StatelessWidget {
  const _TarjetaEvento({required this.evento, required this.alTocar});

  final EventoFeria evento;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final e = evento;
    final (texto, fondo, color) = _etiquetaEvento(e);
    return Hero(
      tag: 'evento-${e.id}',
      child: TarjetaBorde(
        relleno: const EdgeInsets.fromLTRB(12, 12, 14, 12),
        alTocar: alTocar,
        child: Row(
          children: [
            CajaFecha(fecha: e.fecha),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(e.titulo, style: Tipografia.cuerpo),
                  if (e.artista.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text('Con ${e.artista}', style: Tipografia.leyenda),
                  ],
                  const SizedBox(height: 5),
                  Text('${e.tipo} · ${e.lugarYHora}', style: Tipografia.micro),
                  const SizedBox(height: 5),
                  Pastilla(texto: texto, fondo: fondo, color: color),
                ],
              ),
            ),
            if (e.precio != null && e.precio! > 0) ...[
              const SizedBox(width: 8),
              Text(_precio(e.precio), style: Tipografia.cuerpo),
            ],
          ],
        ),
      ),
    );
  }
}

class _PlanoRecinto extends StatelessWidget {
  const _PlanoRecinto();

  @override
  Widget build(BuildContext context) {
    Widget zona(
      String texto,
      Color fondo,
      Color color, {
      int flex = 1,
      double? alto,
    }) => Expanded(
      flex: flex,
      child: Container(
        height: alto,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(
          color: fondo,
          borderRadius: BorderRadius.circular(11),
        ),
        child: Text(
          texto,
          textAlign: TextAlign.center,
          style: Tipografia.micro.copyWith(color: color),
        ),
      ),
    );
    const gris = Color(0xFFE4E7EC);
    const grisTexto = Color(0xFF5B6472);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 212,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colores.fondoSutil,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Expanded(
                flex: 82,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    zona(
                      'Plaza de Toros',
                      const Color(0xFFDDE7FC),
                      Colores.primary,
                      flex: 152,
                    ),
                    const SizedBox(width: 8),
                    zona(
                      'Plaza principal',
                      const Color(0xFFEADFF9),
                      const Color(0xFF6B36C9),
                      flex: 162,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                flex: 94,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    zona(
                      'Zona gastronómica',
                      const Color(0xFFF8E7CE),
                      const Color(0xFF9A5B08),
                      flex: 118,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 100,
                      child: Column(
                        children: [
                          zona('Estac. A', gris, grisTexto),
                          const SizedBox(height: 6),
                          zona('Estac. B', gris, grisTexto),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 88,
                      child: Column(
                        children: [
                          zona('Sanitarios', gris, grisTexto),
                          const SizedBox(height: 6),
                          zona(
                            'Cruz Roja',
                            const Color(0xFFFADADA),
                            const Color(0xFFB32020),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (t, c) in const [
              ('Escenarios', Colores.primary),
              ('Comida', Color(0xFFC77700)),
              ('Estacionamiento', Color(0xFF5B6472)),
              ('Cruz Roja', Color(0xFFB32020)),
            ])
              Container(
                padding: const EdgeInsets.fromLTRB(10, 6, 11, 6),
                decoration: BoxDecoration(
                  color: Colores.fondoSutil,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: c,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(t, style: Tipografia.micro),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _TarjetaPase extends StatelessWidget {
  const _TarjetaPase({required this.pase});

  final Pase pase;

  @override
  Widget build(BuildContext context) {
    final e = pase.evento;
    final f = e.fecha;
    final fecha =
        '${f.day.toString().padLeft(2, '0')} ${CajaFecha.meses[f.month - 1]} ${f.year}';
    return TarjetaBorde(
      relleno: const EdgeInsets.all(20),
      radio: Medidas.radioModulo,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e.titulo, style: Tipografia.cuerpo),
                    const SizedBox(height: 2),
                    Text(
                      e.hora.isEmpty
                          ? '$fecha · ${e.lugar}'
                          : '$fecha · ${e.hora} hrs',
                      style: Tipografia.micro,
                    ),
                  ],
                ),
              ),
              Pastilla(
                texto: e.escenario,
                fondo: Colores.soft,
                color: Colores.primary,
                radio: 7,
              ),
            ],
          ),
          const SizedBox(height: 16),
          QrImageView(
            data: pase.carga,
            size: 161,
            padding: EdgeInsets.zero,
            backgroundColor: Colors.white,
          ),
          const SizedBox(height: 16),
          Text(
            'Boleto válido · Presenta en la entrada',
            style: Tipografia.subtitulo.copyWith(color: Colores.exito),
          ),
          const SizedBox(height: 3),
          Text(
            'Folio ${pase.folio} · ${pase.accesos} acceso general',
            style: Tipografia.micro,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: Material(
              color: Colores.fondoInverso,
              borderRadius: BorderRadius.circular(13),
              child: InkWell(
                borderRadius: BorderRadius.circular(13),
                onTap: () => avisoPronto(context, 'Guardar en Wallet'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  child: Center(
                    child: Text(
                      'Guardar en Wallet',
                      style: Tipografia.subtitulo.copyWith(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Votacion de Srita. Teocaltiche y Miss Chiquitita: un voto gratis por
/// vecino y certamen (votar otra vez lo cambia).
class _Certamenes extends StatefulWidget {
  const _Certamenes();

  @override
  State<_Certamenes> createState() => _CertamenesState();
}

class _CertamenesState extends State<_Certamenes> {
  static const _nombres = {
    'reina': 'Srita. Teocaltiche',
    'miss': 'Miss Chiquitita',
  };
  late final Repositorio _repo = context.read<Repositorio>();
  String _certamen = 'reina';
  final Map<String, List<Candidata>> _candidatas = {};
  final Map<String, String?> _votos = {};
  String? _enviando;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final perfil = context.read<Sesion>().perfil;
    for (final c in _nombres.keys) {
      final lista = await _repo.candidatas(c);
      final voto = perfil == null ? null : await _repo.miVoto(c, perfil);
      if (!mounted) return;
      setState(() {
        _candidatas[c] = lista;
        _votos[c] = voto;
      });
    }
  }

  Future<void> _votar(Candidata c) async {
    final perfil = context.read<Sesion>().perfil;
    if (perfil == null || _votos[c.certamen] == c.id) return;
    final cambiar = _votos[c.certamen] != null;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          cambiar ? '¿Cambiar tu voto?' : '¿Votar por ${c.nombre}?',
          style: Tipografia.titulo,
        ),
        content: Text(
          'Tienes un voto gratis para ${_nombres[c.certamen]}. ${cambiar ? 'Tu voto anterior se reemplaza.' : 'Puedes cambiarlo después.'}',
          style: Tipografia.leyenda,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Votar'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _enviando = c.id);
    try {
      await _repo.votar(c, perfil);
      Hapticos.exito();
      if (!mounted) return;
      setState(() => _votos[c.certamen] = c.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('¡Listo! Votaste por ${c.nombre}.')),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo registrar tu voto.')),
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final lista = _candidatas[_certamen] ?? const <Candidata>[];
    final voto = _votos[_certamen];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const TituloSeccion(titulo: 'Vota por tu reina'),
        const SizedBox(height: 14),
        Lateral(
          child: _Segmentos(
            opciones: _nombres.values.toList(),
            elegida: _nombres[_certamen]!,
            alElegir: (n) => setState(
              () => _certamen = _nombres.entries
                  .firstWhere((e) => e.value == n)
                  .key,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Lateral(
          child: Column(
            children: [
              for (final c in lista) ...[
                TarjetaBorde(
                  relleno: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  alTocar: () => _votar(c),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: c.id == voto ? primary : Colores.soft,
                        child: Text(
                          c.nombre.characters.first,
                          style: Tipografia.titulo.copyWith(
                            color: c.id == voto ? Colors.white : primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(c.nombre, style: Tipografia.cuerpo)),
                      if (_enviando == c.id)
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else if (c.id == voto)
                        Pastilla(
                          texto: 'Tu voto',
                          fondo: Colores.soft,
                          color: primary,
                          radio: 7,
                        )
                      else
                        Text(
                          'Votar',
                          style: Tipografia.subtitulo.copyWith(color: primary),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 4),
              Text(
                'Un voto gratis por vecino registrado. La coronación es el día del certamen.',
                style: Tipografia.micro,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
