import 'dart:io' show Platform;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'opciones_demo.dart';

/// Con `--dart-define=USAR_EMULADORES=true` la app habla con los emuladores
/// locales en vez de con el proyecto real.
const bool usarEmuladores =
    bool.fromEnvironment('USAR_EMULADORES', defaultValue: kDebugMode);

/// En el emulador de Android, `localhost` es el propio telefono; el equipo
/// anfitrion se alcanza en 10.0.2.2.
String get _anfitrion {
  if (kIsWeb) return 'localhost';
  return Platform.isAndroid ? '10.0.2.2' : 'localhost';
}

Future<void> arrancarFirebase() async {
  await Firebase.initializeApp(
    // TODO: cuando exista firebase_options.dart real, usarlo cuando
    // usarEmuladores sea falso.
    options: usarEmuladores ? OpcionesDemo.valores : null,
  );

  if (usarEmuladores) {
    FirebaseFirestore.instance.useFirestoreEmulator(_anfitrion, 8080);
  }
}
