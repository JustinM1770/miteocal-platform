import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'modelos/perfil.dart';

/// Quien esta usando la app. Se guarda en el telefono para no pedir el
/// registro cada vez que se abre.
///
/// TODO(Firebase Auth): hoy el uid se genera en el telefono y la
/// verificacion por SMS es simulada. Con Auth, el uid sale de
/// FirebaseAuth.instance.currentUser y el perfil se copia a usuarios/{uid}.
/// Para el demo se usan numeros de prueba de Firebase (no mandan SMS).
class Sesion extends ChangeNotifier {
  static const _clave = 'perfil';
  static const _claveMunicipio = 'municipio_id';

  Perfil? _perfil;
  String? _municipioId;
  bool _cargada = false;

  Perfil? get perfil => _perfil;
  String? get municipioId => _municipioId;
  bool get cargada => _cargada;
  bool get registrado => _perfil != null;
  bool get municipioElegido => _municipioId != null;

  Future<void> cargar() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _municipioId = prefs.getString(_claveMunicipio);
      final crudo = prefs.getString(_clave);
      if (crudo != null) {
        _perfil = Perfil.desdeMapa(jsonDecode(crudo) as Map<String, dynamic>);
      }
    } catch (_) {
      // Un perfil ilegible no debe dejar la app en blanco: se vuelve a registrar.
      _perfil = null;
    }
    _cargada = true;
    notifyListeners();
  }

  Future<void> guardarMunicipio(String id) async {
    _municipioId = id;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_claveMunicipio, id);
  }

  Future<void> guardar(Perfil perfil) async {
    _perfil = perfil;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_clave, jsonEncode(perfil.aMapa()));
  }

  Future<void> cambiarColonia(String coloniaId) async {
    final p = _perfil;
    if (p == null) return;
    await guardar(p.copiarCon(coloniaId: coloniaId));
  }

  Future<void> resetearMunicipio() async {
    _municipioId = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_claveMunicipio);
  }

  Future<void> cerrar() async {
    _perfil = null;
    _municipioId = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_clave);
    await prefs.remove(_claveMunicipio);
  }

  static String nuevoUid() {
    final r = Random.secure();
    return List.generate(20, (_) => r.nextInt(36).toRadixString(36)).join();
  }
}
