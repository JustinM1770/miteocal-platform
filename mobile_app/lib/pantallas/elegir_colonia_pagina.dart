import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/colonia.dart';
import '../datos/repositorio.dart';
import '../datos/sesion.dart';
import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/bento.dart';
import '../nucleo/widgets/comunes.dart';

/// Elegir colonia: de ella dependen los avisos, el horario del agua y la ruta
/// del camión que ve el vecino.
class ElegirColoniaPagina extends StatefulWidget {
  const ElegirColoniaPagina({super.key});

  @override
  State<ElegirColoniaPagina> createState() => _ElegirColoniaPaginaState();
}

class _ElegirColoniaPaginaState extends State<ElegirColoniaPagina> {
  late final Future<List<Colonia>> _colonias = context
      .read<Repositorio>()
      .colonias();
  late String? _elegida = context.read<Sesion>().perfil?.coloniaId;
  String _buscar = '';
  bool _guardando = false;

  String _sinAcentos(String s) => s
      .toLowerCase()
      .replaceAll(RegExp('[áà]'), 'a')
      .replaceAll(RegExp('[éè]'), 'e')
      .replaceAll(RegExp('[íì]'), 'i')
      .replaceAll(RegExp('[óò]'), 'o')
      .replaceAll(RegExp('[úùü]'), 'u');

  Future<void> _guardar() async {
    final id = _elegida;
    if (id == null) return;
    setState(() => _guardando = true);
    await context.read<Sesion>().cambiarColonia(id);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final actual = context.read<Sesion>().perfil?.coloniaId;
    return FutureBuilder<List<Colonia>>(
      future: _colonias,
      builder: (context, snap) {
        final todas = snap.data ?? const <Colonia>[];
        final q = _sinAcentos(_buscar.trim());
        final visibles = todas
            .where(
              (c) =>
                  q.isEmpty || _sinAcentos('${c.nombre} ${c.zona}').contains(q),
            )
            .toList();
        final zonas = <String, List<Colonia>>{};
        for (final c in visibles) {
          zonas
              .putIfAbsent(c.zona.isEmpty ? 'Sin zona' : c.zona, () => [])
              .add(c);
        }
        return PantallaBento(
          titulo: '¿En qué colonia vives?',
          subtitulo: 'Así te avisamos solo de lo que pasa en tu zona.',
          pie: BotonPildora(
            _elegida == actual ? 'Listo' : 'Guardar colonia',
            alTocar: _elegida == null || _guardando
                ? null
                : _elegida == actual
                ? () => Navigator.of(context).pop()
                : _guardar,
          ),
          hijos: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colores.fondoTarjeta,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Row(
                children: [
                  const Icon(
                    LucideIcons.search,
                    size: 18,
                    color: Colores.textoSecundario,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _buscar = v),
                      style: Tipografia.cuerpoNormal,
                      decoration: InputDecoration(
                        hintText: 'Buscar colonia o barrio',
                        hintStyle: Tipografia.cuerpoNormal.copyWith(
                          color: Colores.textoSecundario,
                        ),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (snap.connectionState == ConnectionState.waiting)
              const Padding(
                padding: EdgeInsets.all(30),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (visibles.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 14),
                child: Vacio(texto: 'No encontramos esa colonia.'),
              ),
            for (final MapEntry(key: zona, value: lista) in zonas.entries) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 20, 6, 8),
                child: Kicker(zona),
              ),
              Bento(
                relleno: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 4,
                ),
                child: Column(
                  children: [
                    for (final (i, c) in lista.indexed)
                      InkWell(
                        onTap: () => setState(() => _elegida = c.id),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            border: i == 0
                                ? null
                                : const Border(
                                    top: BorderSide(color: Colores.borde),
                                  ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(c.nombre, style: Tipografia.cuerpo),
                                    const SizedBox(height: 2),
                                    Text(
                                      [
                                        c.tipo,
                                        if (c.horarioAgua.isNotEmpty)
                                          'Agua ${c.horarioAgua}',
                                      ].join(' · '),
                                      style: Tipografia.leyenda.copyWith(
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _elegida == c.id
                                      ? Colores.fondoInverso
                                      : Colores.fondoSutil,
                                ),
                                child: _elegida == c.id
                                    ? const Icon(
                                        LucideIcons.check,
                                        size: 14,
                                        color: Colores.textoInverso,
                                      )
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}
