import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/municipio.dart';
import '../datos/repositorio.dart';
import '../datos/sesion.dart';
import '../nucleo/servicios/hapticos.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/animaciones.dart';
import '../nucleo/widgets/shimmer_placeholders.dart';

/// Modal para cambiar de municipio en cualquier momento (demo multi-municipio).
Future<Municipio?> mostrarSelectorMunicipio(BuildContext context) {
  return showModalBottomSheet<Municipio>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colores.fondoTarjeta,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => const SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(Medidas.margenLateral, 8, Medidas.margenLateral, 24),
        child: _ContenidoSelector(esModal: true),
      ),
    ),
  );
}

/// Pantalla completa de arranque si no se ha elegido municipio.
class SelectorMunicipioPagina extends StatelessWidget {
  const SelectorMunicipioPagina({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colores.fondoPantalla,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            Medidas.margenLateral,
            24,
            Medidas.margenLateral,
            24,
          ),
          child: const _ContenidoSelector(esModal: false),
        ),
      ),
    );
  }
}

class _ContenidoSelector extends StatefulWidget {
  const _ContenidoSelector({required this.esModal});
  final bool esModal;

  @override
  State<_ContenidoSelector> createState() => _ContenidoSelectorState();
}

class _ContenidoSelectorState extends State<_ContenidoSelector> {
  late final Future<List<Municipio>> _futuroMunicipios;

  @override
  void initState() {
    super.initState();
    _futuroMunicipios = context.read<Repositorio>().municipiosDisponibles();
  }

  Future<void> _elegir(Municipio m) async {
    await Hapticos.exito();
    if (!mounted) return;
    final sesion = context.read<Sesion>();
    final repo = context.read<Repositorio>();

    repo.cambiarMunicipio(m.id);
    await sesion.guardarMunicipio(m.id);

    if (widget.esModal && mounted) {
      Navigator.of(context).pop(m);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sesion = context.watch<Sesion>();
    final actualId = sesion.municipioId ?? 'teocaltiche';

    return Column(
      mainAxisSize: widget.esModal ? MainAxisSize.min : MainAxisSize.max,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!widget.esModal) const SizedBox(height: 16),
        Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colores.soft,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                LucideIcons.landmark,
                color: Colores.primary,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Elige tu municipio', style: Tipografia.tituloPantalla),
                  const SizedBox(height: 2),
                  Text(
                    'Demo multi-municipio en vivo',
                    style: Tipografia.micro.copyWith(color: Colores.textoSecundario),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'La app adapta su nombre, colores de marca, módulos y datos según el municipio seleccionado.',
          style: Tipografia.leyenda,
        ),
        const SizedBox(height: 20),
        Flexible(
          fit: widget.esModal ? FlexFit.loose : FlexFit.tight,
          child: FutureBuilder<List<Municipio>>(
            future: _futuroMunicipios,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const ShimmerLista(cantidad: 2, alto: 110);
              }
              final lista = snap.data ?? const [];
              if (lista.isEmpty) {
                return const Center(child: Text('No hay municipios disponibles.'));
              }

              return ListaEscalonada(
                children: [
                  for (final m in lista) ...[
                    _TarjetaMunicipio(
                      municipio: m,
                      seleccionado: m.id == actualId,
                      alTocar: () => _elegir(m),
                    ),
                    const SizedBox(height: 12),
                  ],
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TarjetaMunicipio extends StatelessWidget {
  const _TarjetaMunicipio({
    required this.municipio,
    required this.seleccionado,
    required this.alTocar,
  });

  final Municipio municipio;
  final bool seleccionado;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final primary = municipio.tema.primary;
    final esTeocal = municipio.id == 'teocaltiche';

    final modulosActivos = municipio.modulos.entries
        .where((e) => e.value)
        .map((e) => e.key)
        .toList();

    return Material(
      color: seleccionado ? municipio.tema.primarySoft : Colores.fondoTarjeta,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        side: BorderSide(
          color: seleccionado ? primary : Colores.borde,
          width: seleccionado ? 2 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 48,
                      height: 48,
                      color: primary.withValues(alpha: 0.12),
                      child: esTeocal
                          ? Image.asset(
                              'assets/imagenes/escudo.jpg',
                              fit: BoxFit.cover,
                            )
                          : Center(
                              child: Text(
                                municipio.nombre.substring(0, 1),
                                style: Tipografia.tituloPantalla.copyWith(
                                  color: primary,
                                ),
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          municipio.nombre,
                          style: Tipografia.titulo.copyWith(
                            color: Colores.textoPrimario,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${municipio.estado} · ${municipio.prefijoFolio}',
                          style: Tipografia.micro.copyWith(
                            color: Colores.textoSecundario,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (seleccionado)
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.check,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final mod in modulosActivos.take(5))
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: primary.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        mod,
                        style: Tipografia.micro.copyWith(
                          color: primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  if (modulosActivos.length > 5)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colores.fondoSutil,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '+${modulosActivos.length - 5}',
                        style: Tipografia.micro.copyWith(
                          color: Colores.textoSecundario,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
