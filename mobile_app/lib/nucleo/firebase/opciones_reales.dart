import 'package:firebase_core/firebase_core.dart';

/// Configuración del proyecto real (miteocal). Los valores llegan por
/// `--dart-define-from-file=.env` para no versionarlos; ver mobile_app/README.md.
class OpcionesReales {
  const OpcionesReales._();

  static const _apiKey = String.fromEnvironment('FIREBASE_API_KEY');

  /// Sin .env la app se queda en modo demo en vez de tronar.
  static bool get configuradas => _apiKey.isNotEmpty;

  static const FirebaseOptions valores = FirebaseOptions(
    apiKey: _apiKey,
    appId: String.fromEnvironment('FIREBASE_APP_ID'),
    messagingSenderId: String.fromEnvironment('FIREBASE_SENDER_ID'),
    projectId: String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'miteocal',
    ),
    storageBucket: String.fromEnvironment('FIREBASE_BUCKET'),
    iosBundleId: 'mx.miteocal.app',
  );
}
