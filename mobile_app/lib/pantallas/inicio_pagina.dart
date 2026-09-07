import 'package:flutter/material.dart';
import '../nucleo/tema/tema.dart';

/// Pantalla de Inicio. Andamio: la contenido real llega en su sprint.
class InicioPagina extends StatelessWidget {
  const InicioPagina({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(Medidas.margenLateral),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Inicio', style: Tipografia.titulo),
            const SizedBox(height: Medidas.e8),
            Text('Pendiente de construir.', style: Tipografia.subtitulo),
          ],
        ),
      ),
    );
  }
}
