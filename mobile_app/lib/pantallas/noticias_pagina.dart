import 'package:flutter/material.dart';
import '../nucleo/tema/tema.dart';

/// Pantalla de Noticias. Andamio: la contenido real llega en su sprint.
class NoticiasPagina extends StatelessWidget {
  const NoticiasPagina({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(Medidas.margenLateral),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Noticias', style: Tipografia.titulo),
            const SizedBox(height: Medidas.e8),
            Text('Pendiente de construir.', style: Tipografia.subtitulo),
          ],
        ),
      ),
    );
  }
}
