import 'package:flutter/material.dart';
import '../nucleo/tema/tema.dart';
import '../datos/repositorio.dart';
import '../pantallas/inicio_pagina.dart';
import '../pantallas/noticias_pagina.dart';
import '../pantallas/comercio_pagina.dart';
import '../pantallas/servicios_pagina.dart';

/// Las cuatro pestanas principales: Inicio, Noticias, Comercio, Servicios.
///
/// TODO: cuando exista la configuracion del municipio, filtrar estos destinos
/// contra el mapa `modulos`. Un municipio sin comercio contratado no debe ver
/// esa pestana. Ver docs/arquitectura-multimunicipio.md seccion 3.
class ConchaPrincipal extends StatefulWidget {
  const ConchaPrincipal({super.key, this.repositorio});

  /// Se inyecta en las pruebas para no depender de Firebase.
  final Repositorio? repositorio;

  @override
  State<ConchaPrincipal> createState() => _ConchaPrincipalState();
}

class _ConchaPrincipalState extends State<ConchaPrincipal> {
  int _indice = 0;

  late final List<Widget> _paginas = [
    InicioPagina(repositorio: widget.repositorio),
    const NoticiasPagina(),
    const ComercioPagina(),
    const ServiciosPagina(),
  ];

  static const _destinos = <_Destino>[
    _Destino('Inicio', Icons.home_outlined, Icons.home),
    _Destino('Noticias', Icons.article_outlined, Icons.article),
    _Destino('Comercio', Icons.storefront_outlined, Icons.storefront),
    _Destino('Servicios', Icons.grid_view_outlined, Icons.grid_view),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _indice, children: _paginas),
      bottomNavigationBar: DecoratedBox(
        // Filete de 1 px arriba, como en el Figma.
        decoration: const BoxDecoration(
          color: Colores.fondoTarjeta,
          border: Border(top: BorderSide(color: Colores.borde)),
        ),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: Colores.fondoTarjeta,
            indicatorColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            labelTextStyle: WidgetStateProperty.resolveWith(
              (estados) => estados.contains(WidgetState.selected)
                  ? Tipografia.micro.copyWith(
                      color: Colores.primary, fontWeight: FontWeight.w600)
                  : Tipografia.micro,
            ),
          ),
          child: NavigationBar(
            height: 64,
            selectedIndex: _indice,
            onDestinationSelected: (i) => setState(() => _indice = i),
            destinations: [
              for (final d in _destinos)
                NavigationDestination(
                  icon: Icon(d.icono, color: Colores.textoSecundario, size: 24),
                  selectedIcon:
                      Icon(d.iconoActivo, color: Colores.primary, size: 24),
                  label: d.etiqueta,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Destino {
  const _Destino(this.etiqueta, this.icono, this.iconoActivo);
  final String etiqueta;
  final IconData icono;
  final IconData iconoActivo;
}
