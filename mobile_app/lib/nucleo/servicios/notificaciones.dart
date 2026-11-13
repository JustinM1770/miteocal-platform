import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../datos/modelos/aviso.dart';

/// Notificaciones LOCALES: la app escucha los avisos que publica el panel y,
/// cuando llega uno nuevo para la colonia del vecino, lo muestra como
/// notificación del sistema.
///
/// No usa APNs/FCM: funciona con la cuenta gratuita de Apple, pero solo
/// mientras la app está abierta o recién pasó a segundo plano. Las push de
/// verdad (con la app cerrada) requieren Apple Developer de pago y un
/// servidor que las envíe.
class Notificaciones {
  Notificaciones._();
  static final instancia = Notificaciones._();

  final _plugin = FlutterLocalNotificationsPlugin();
  final _toques = StreamController<String>.broadcast();
  bool _listo = false;
  StreamSubscription<List<Aviso>>? _sub;
  final _porId = <String, Aviso>{};

  static const _claveVistos = 'avisos_vistos';

  /// Id del aviso que el vecino tocó en una notificación.
  Stream<String> get toques => _toques.stream;
  Aviso? aviso(String id) => _porId[id];

  Future<void> iniciar() async {
    if (_listo || kIsWeb) return;
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(
          iOS: DarwinInitializationSettings(),
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        ),
        onDidReceiveNotificationResponse: (r) {
          if (r.payload != null) _toques.add(r.payload!);
        },
      );
      _listo = true;
    } catch (e) {
      debugPrint('No se pudieron iniciar las notificaciones: $e');
    }
  }

  Future<void> pedirPermiso() async {
    if (!_listo) return;
    await _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >()
        ?.requestPermissions(alert: true, badge: true, sound: true);
    await _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();
  }

  /// Escucha los avisos y notifica los nuevos de la colonia del vecino. La
  /// primera vez solo los marca como vistos, para no llenar la pantalla con
  /// todo lo que ya estaba publicado.
  Future<void> escuchar(Stream<List<Aviso>> avisos, String? colonia) async {
    await _sub?.cancel();
    final prefs = await SharedPreferences.getInstance();
    final yaHabia = prefs.containsKey(_claveVistos);
    final vistos = {...prefs.getStringList(_claveVistos) ?? const <String>[]};
    var primera = !yaHabia;
    _sub = avisos.listen((lista) async {
      for (final a in lista) {
        _porId[a.id] = a;
      }
      final nuevos = lista
          .where((a) => a.esPara(colonia) && !vistos.contains(a.id))
          .toList();
      vistos.addAll(lista.map((a) => a.id));
      await prefs.setStringList(_claveVistos, vistos.toList());
      if (primera) {
        primera = false;
        return;
      }
      for (final a in nuevos.take(3)) {
        await mostrar(a);
      }
    }, onError: (Object e) => debugPrint('Avisos no disponibles: $e'));
  }

  Future<void> mostrar(Aviso a) async {
    if (!_listo) return;
    await _plugin.show(
      id: a.id.hashCode & 0x7fffffff,
      title: '${a.servicio.nombre} · ${a.titulo}',
      body: [a.mensaje, a.vigencia].where((x) => x.isNotEmpty).join(' · '),
      payload: a.id,
      notificationDetails: const NotificationDetails(
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBanner: true,
          presentSound: true,
        ),
        android: AndroidNotificationDetails(
          'avisos',
          'Avisos del municipio',
          channelDescription: 'Agua, basura, cierres viales y escuelas',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
    );
  }

  /// Para probar desde la app: muestra el aviso como si acabara de llegar.
  Future<void> probar(Aviso a) => mostrar(a);

  @visibleForTesting
  Future<void> detener() async => _sub?.cancel();
}

/// Llave del navegador raíz, para abrir un aviso al tocar su notificación.
final llaveNavegador = GlobalKey<NavigatorState>();
