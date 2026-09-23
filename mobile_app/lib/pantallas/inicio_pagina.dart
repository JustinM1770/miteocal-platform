import 'package:flutter/material.dart';
import '../datos/modelos/agua.dart';
import '../datos/modelos/municipio.dart';
import '../datos/repositorio.dart';
import '../nucleo/tema/tema.dart';
import 'inicio/widgets/hero_agua.dart';

class InicioPagina extends StatelessWidget {
  const InicioPagina({super.key, this.repositorio});

  /// Se inyecta en las pruebas con una instancia apuntada a un Firestore falso.
  final Repositorio? repositorio;

  @override
  Widget build(BuildContext context) {
    final repo = repositorio ?? Repositorio();

    return SafeArea(
      child: StreamBuilder<Municipio?>(
        stream: repo.municipio(),
        builder: (context, snapMunicipio) {
          final municipio = snapMunicipio.data;

          return ListView(
            padding: const EdgeInsets.all(Medidas.margenLateral),
            children: [
              Text(
                municipio?.nombre ?? '',
                style: Tipografia.titulo,
              ),
              Text(
                municipio == null ? 'Cargando...' : municipio.estado,
                style: Tipografia.subtitulo,
              ),
              const SizedBox(height: Medidas.separacionSeccion),

              // Un modulo apagado no se dibuja y sus datos no se consultan.
              // Ver docs/arquitectura-multimunicipio.md seccion 3.
              if (municipio?.tieneModulo('agua') ?? false)
                StreamBuilder<EstadoAgua?>(
                  stream: repo.aguaDeHoy(),
                  builder: (context, snapAgua) => HeroAgua(
                    estado: snapAgua.data,
                    color: municipio!.tema.primary,
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
