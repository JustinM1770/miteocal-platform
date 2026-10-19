import 'package:flutter/foundation.dart';

/// Pestana activa de la barra inferior. Vive en un Provider para que una
/// pantalla pueda mandar a otra (Inicio → "Reportar falla" → Servicios).
class Pestanas extends ChangeNotifier {
  static const inicio = 0;
  static const noticias = 1;
  static const comercio = 2;
  static const servicios = 3;

  int _actual = inicio;
  int get actual => _actual;

  void ir(int indice) {
    if (indice == _actual) return;
    _actual = indice;
    notifyListeners();
  }
}
