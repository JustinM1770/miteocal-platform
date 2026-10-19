import 'package:flutter/material.dart';

import '../../nucleo/servicios/ubicacion.dart';
import 'bienvenida_pagina.dart';

/// Lo que se va juntando a lo largo del registro (09 → 12).
class BorradorRegistro {
  String nombre = '';
  String direccion = '';
  String telefono = '';
  Punto? punto;
}

/// Registro con su propio Navigator: al terminar, la app cambia la raiz a la
/// concha principal y todas estas pantallas desaparecen de una vez.
class FlujoRegistro extends StatelessWidget {
  const FlujoRegistro({super.key});

  @override
  Widget build(BuildContext context) {
    return Navigator(
      onGenerateRoute: (_) =>
          MaterialPageRoute(builder: (_) => const BienvenidaPagina()),
    );
  }
}

/// Esqueleto comun: margen de 24, contenido arriba y acciones abajo.
class PantallaRegistro extends StatelessWidget {
  const PantallaRegistro({
    super.key,
    required this.contenido,
    required this.acciones,
  });

  final List<Widget> contenido;
  final List<Widget> acciones;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
              sliver: SliverFillRemaining(
                hasScrollBody: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ...contenido,
                    const Spacer(),
                    const SizedBox(height: 24),
                    ...acciones,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
