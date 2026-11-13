import 'dart:async';
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../datos/modelos/colonia.dart';
import '../datos/repositorio.dart';
import '../datos/sesion.dart';
import '../nucleo/servicios/notificaciones.dart';
import '../pantallas/avisos/aviso_pagina.dart';

import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/comunes.dart';
import '../pantallas/comercio_pagina.dart';
import '../pantallas/inicio_pagina.dart';
import '../pantallas/noticias_pagina.dart';
import '../pantallas/servicios_pagina.dart';
import 'pestanas.dart';

/// Pestañas de la entrega del hackathon: Inicio y Servicios, en una píldora
/// flotante (Figma «01 · Inicio — Bento»). Noticias y Comercio siguen en el
/// código; se vuelven a mostrar agregándolos a [_destinos].
class ConchaPrincipal extends StatefulWidget {
  const ConchaPrincipal({super.key});

  @override
  State<ConchaPrincipal> createState() => _ConchaPrincipalState();
}

class _ConchaPrincipalState extends State<ConchaPrincipal> {
  static const _paginas = <Widget>[
    InicioPagina(),
    NoticiasPagina(),
    ComercioPagina(),
    ServiciosPagina(),
  ];

  /// (etiqueta, ícono, índice de la página)
  static const _destinos = <(String, IconData, int)>[
    ('Inicio', LucideIcons.house, Pestanas.inicio),
    ('Servicios', LucideIcons.layoutGrid, Pestanas.servicios),
  ];

  StreamSubscription<String>? _toques;

  @override
  void initState() {
    super.initState();
    _arrancarAvisos();
  }

  /// Notificaciones locales de los avisos de la colonia del vecino
  Future<void> _arrancarAvisos() async {
    final repo = context.read<Repositorio>();
    final coloniaId = context.read<Sesion>().perfil?.coloniaId;
    final n = Notificaciones.instancia;
    await n.iniciar();
    await n.pedirPermiso();
    final colonias = await repo.colonias().catchError((_) => <Colonia>[]);
    final nombre = colonias.where((c) => c.id == coloniaId).firstOrNull?.nombre;
    await n.escuchar(repo.avisos(), nombre);
    _toques = n.toques.listen((id) {
      final aviso = n.aviso(id);
      if (aviso == null) return;
      llaveNavegador.currentState?.push(
        MaterialPageRoute(builder: (_) => AvisoPagina(aviso: aviso)),
      );
    });
  }

  @override
  void dispose() {
    _toques?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pestanas = context.watch<Pestanas>();
    return Scaffold(
      backgroundColor: Colores.fondoPantalla,
      extendBody: true,
      body: VeloSuperior(
        child: IndexedStack(index: pestanas.actual, children: _paginas),
      ),
      bottomNavigationBar: _PildoraPestanas(
        actual: pestanas.actual,
        destinos: _destinos,
        alElegir: pestanas.ir,
      ),
    );
  }
}

/// Píldora flotante: la pestaña activa en negro con su nombre; las demás,
/// solo el ícono. Fondo translúcido con desenfoque.
class _PildoraPestanas extends StatelessWidget {
  const _PildoraPestanas({
    required this.actual,
    required this.destinos,
    required this.alElegir,
  });

  final int actual;
  final List<(String, IconData, int)> destinos;
  final ValueChanged<int> alElegir;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colores.fondoTarjeta.withValues(alpha: 0.78),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: Colores.fondoTarjeta),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1A0E1116),
                      blurRadius: 24,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final (etiqueta, icono, indice) in destinos)
                      Semantics(
                        button: true,
                        selected: indice == actual,
                        label: etiqueta,
                        child: GestureDetector(
                          onTap: () => alElegir(indice),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            padding: EdgeInsets.symmetric(
                              horizontal: indice == actual ? 18 : 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              color: indice == actual
                                  ? Colores.fondoInverso
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  icono,
                                  size: 20,
                                  color: indice == actual
                                      ? Colores.textoInverso
                                      : Colores.textoPrimario,
                                ),
                                if (indice == actual) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    etiqueta,
                                    style: Tipografia.cuerpo.copyWith(
                                      color: Colores.textoInverso,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
