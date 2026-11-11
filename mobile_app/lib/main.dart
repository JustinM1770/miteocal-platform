import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';
import 'package:provider/provider.dart';

import 'datos/modelos/municipio.dart';
import 'datos/repositorio.dart';
import 'datos/repositorio_demo.dart';
import 'datos/repositorio_firestore.dart';
import 'datos/sesion.dart';
import 'navegacion/concha_principal.dart';
import 'navegacion/pestanas.dart';
import 'nucleo/firebase/arranque.dart';
import 'nucleo/firebase/opciones_reales.dart';
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
  // Precarga los shaders de Liquid Glass para que no parpadeen al aparecer
  await LiquidGlassWidgets.initialize();

  final Repositorio repositorio;
  if (fuente == 'firebase' && (usarEmuladores || OpcionesReales.configuradas)) {
    await arrancarFirebase();
    repositorio = RepositorioFirestore();
  } else {
    repositorio = RepositorioDemo();
  }

  final sesion = Sesion();
  await sesion.cargar();

  repositorio.cambiarMunicipio(municipioId);

  runApp(
    LiquidGlassWidgets.wrap(
      child: AppMiTeocal(repositorio: repositorio, sesion: sesion),
    ),
  );
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
      child: StreamBuilder<Municipio?>(
        stream: repositorio.municipio(),
        builder: (context, snap) {
          final m = snap.data;
          final tema = m != null
              ? TemaMiTeocal.claro(
                  primary: m.tema.primary,
                  primarySoft: m.tema.primarySoft,
                  success: m.tema.success,
                  danger: m.tema.danger,
                )
              : TemaMiTeocal.claro();

          return MaterialApp(
            title: m?.nombre ?? 'MiTeocal',
            debugShowCheckedModeBanner: false,
            theme: tema,
            home: Consumer<Sesion>(
              builder: (context, s, _) {
                return s.registrado
                    ? const ConchaPrincipal()
                    : const FlujoRegistro();
              },
            ),
          );
        },
      ),
    );
  }
}
