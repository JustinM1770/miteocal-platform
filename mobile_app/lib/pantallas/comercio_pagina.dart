import 'package:flutter/material.dart';
import '../nucleo/tema/tema.dart';

/// Pantalla de Comercio. Andamio: la contenido real llega en su sprint.
class ComercioPagina extends StatelessWidget {
  const ComercioPagina({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(Medidas.margenLateral),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Comercio', style: Tipografia.titulo),
            const SizedBox(height: Medidas.e8),
            Text('Pendiente de construir.', style: Tipografia.subtitulo),
          ],
        ),
      ),
    );
  }
}
