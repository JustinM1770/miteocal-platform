import 'package:firebase_core/firebase_core.dart';

/// Configuracion para trabajar contra los EMULADORES locales.
///
/// Estos valores son de mentiras a proposito: los emuladores no validan
/// credenciales, solo necesitan que el projectId coincida. Sirve para que
/// todo el equipo pueda programar sin que nadie les de acceso a la consola
/// de Firebase.
///
/// Para produccion se usa `firebase_options.dart`, que genera
/// `flutterfire configure` y NO se versiona. Ver mobile_app/README.md.
class OpcionesDemo {
  const OpcionesDemo._();

  static const FirebaseOptions valores = FirebaseOptions(
    apiKey: 'demo-emulador',
    appId: '1:000000000000:android:0000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'miteocal',
  );
}
