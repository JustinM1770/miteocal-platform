import 'package:flutter/material.dart';
import 'navegacion/concha_principal.dart';
import 'nucleo/tema/tema.dart';

void main() {
  runApp(const AppMiTeocal());
}

class AppMiTeocal extends StatelessWidget {
  const AppMiTeocal({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MiTeocal',
      debugShowCheckedModeBanner: false,
      // TODO: construir el tema con los colores del documento del municipio,
      // no con los valores por defecto.
      theme: TemaMiTeocal.claro(),
      home: const ConchaPrincipal(),
    );
  }
}
