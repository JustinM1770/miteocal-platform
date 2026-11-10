import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../nucleo/tema/tema.dart';
import '../nucleo/widgets/vidrio.dart';
import '../pantallas/comercio_pagina.dart';
import '../pantallas/inicio_pagina.dart';
import '../pantallas/noticias_pagina.dart';
import '../pantallas/servicios_pagina.dart';
import 'pestanas.dart';

/// Las cuatro pestanas principales: Inicio, Noticias, Comercio, Servicios.
///
/// TODO: filtrar estos destinos contra el mapa `modulos` del municipio. Un
/// municipio sin comercio contratado no debe ver esa pestana. Ver
/// docs/arquitectura-multimunicipio.md seccion 3.
class ConchaPrincipal extends StatelessWidget {
  const ConchaPrincipal({super.key});

  static const _paginas = <Widget>[
    InicioPagina(),
    NoticiasPagina(),
    ComercioPagina(),
    ServiciosPagina(),
  ];

  static const _destinos = <(String, IconData)>[
    ('Inicio', LucideIcons.house),
    ('Noticias', LucideIcons.newspaper),
    ('Comercio', LucideIcons.shoppingBag),
    ('Servicios', LucideIcons.layoutGrid),
  ];

  @override
  Widget build(BuildContext context) {
    final pestanas = context.watch<Pestanas>();
    if (usaVidrio(context)) {
      final primary = Theme.of(context).colorScheme.primary;
      return Scaffold(
        backgroundColor: Colores.fondoPantalla,
        // El contenido corre por debajo de la barra para que el cristal lo refracte
        extendBody: true,
        body: IndexedStack(index: pestanas.actual, children: _paginas),
        bottomNavigationBar: GlassTabBar.bottom(
          tabs: [
            for (final (etiqueta, icono) in _destinos)
              GlassTab(icon: Icon(icono), label: etiqueta),
          ],
          selectedIndex: pestanas.actual,
          onTabSelected: pestanas.ir,
          selectedIconColor: primary,
          selectedLabelColor: primary,
          unselectedIconColor: Colores.textoSecundario,
          unselectedLabelColor: Colores.textoSecundario,
        ),
      );
    }
    return Scaffold(
      backgroundColor: Colores.fondoPantalla,
      body: IndexedStack(index: pestanas.actual, children: _paginas),
      bottomNavigationBar: _BarraPestanas(
        actual: pestanas.actual,
        destinos: _destinos,
        alElegir: pestanas.ir,
      ),
    );
  }
}

/// "Tab Bar" del Figma: filete arriba, icono de 24 y etiqueta de 10.5.
class _BarraPestanas extends StatelessWidget {
  const _BarraPestanas({
    required this.actual,
    required this.destinos,
    required this.alElegir,
  });

  final int actual;
  final List<(String, IconData)> destinos;
  final ValueChanged<int> alElegir;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colores.fondoTarjeta,
        border: Border(top: BorderSide(color: Colores.borde)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.only(top: 9, bottom: 6),
          child: Row(
            children: [
              for (final (i, (etiqueta, icono)) in destinos.indexed)
                Expanded(
                  child: Semantics(
                    selected: i == actual,
                    button: true,
                    child: InkResponse(
                      onTap: () => alElegir(i),
                      radius: 36,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            icono,
                            size: 24,
                            color: i == actual
                                ? primary
                                : Colores.textoSecundario,
                          ),
                          const SizedBox(height: 5),
                          Text(
                            etiqueta,
                            style: i == actual
                                ? Tipografia.pestana.copyWith(
                                    color: primary,
                                    fontWeight: FontWeight.w600,
                                  )
                                : Tipografia.pestana,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
