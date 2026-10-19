import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'datos/repositorio.dart';
import 'datos/repositorio_demo.dart';
import 'datos/repositorio_firestore.dart';
import 'datos/sesion.dart';
import 'navegacion/concha_principal.dart';
import 'navegacion/pestanas.dart';
import 'nucleo/firebase/arranque.dart';
import 'nucleo/tema/tema.dart';
import 'pantallas/registro/flujo_registro.dart';

/// De donde salen los datos:
///
///   flutter run                              → demo (sin Firebase)
///   flutter run --dart-define=FUENTE=firebase → proyecto real
///
/// El modo demo existe para que el equipo pueda trabajar en las pantallas
/// sin acceso a la consola de Firebase, y para presentar sin depender de
/// internet.
const String fuente = String.fromEnvironment('FUENTE', defaultValue: 'demo');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final Repositorio repositorio;
  if (fuente == 'firebase') {
    await arrancarFirebase();
    repositorio = RepositorioFirestore();
  } else {
    repositorio = RepositorioDemo();
  }

  final sesion = Sesion();
  await sesion.cargar();

  runApp(AppMiTeocal(repositorio: repositorio, sesion: sesion));
}

class AppMiTeocal extends StatelessWidget {
  const AppMiTeocal({
    super.key,
    required this.repositorio,
    required this.sesion,
  });

  final Repositorio repositorio;
  final Sesion sesion;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<Repositorio>.value(value: repositorio),
        ChangeNotifierProvider<Sesion>.value(value: sesion),
        ChangeNotifierProvider<Pestanas>(create: (_) => Pestanas()),
      ],
      child: MaterialApp(
        title: 'MiTeocal',
        debugShowCheckedModeBanner: false,
        // TODO: construir el tema con los colores del documento del municipio
        // (municipio.tema), no con los valores por defecto.
        theme: TemaMiTeocal.claro(),
        home: Consumer<Sesion>(
          builder: (context, s, _) =>
              s.registrado ? const ConchaPrincipal() : const FlujoRegistro(),
        ),
      ),
    );
  }
}
