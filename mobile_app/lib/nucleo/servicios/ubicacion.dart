import 'dart:math';

import 'package:geolocator/geolocator.dart';

import '../../datos/modelos/colonia.dart';

class Punto {
  const Punto(this.lat, this.lng);
  final double lat;
  final double lng;

  /// "21.4271° N, 102.5764° O"
  String get texto =>
      '${lat.abs().toStringAsFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, '
      '${lng.abs().toStringAsFixed(4)}° ${lng >= 0 ? 'E' : 'O'}';
}

/// GPS del telefono. Devuelve null si el vecino no da permiso o el GPS esta
/// apagado: la app sigue funcionando con la colonia que eligio.
class Ubicacion {
  const Ubicacion._();

  static Future<Punto?> actual() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var permiso = await Geolocator.checkPermission();
      if (permiso == LocationPermission.denied) {
        permiso = await Geolocator.requestPermission();
      }
      if (permiso == LocationPermission.denied ||
          permiso == LocationPermission.deniedForever) {
        return null;
      }
      final p = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      return Punto(p.latitude, p.longitude);
    } catch (_) {
      return null;
    }
  }

  /// Colonia con el centroide mas cercano, si esta a menos de [maxKm].
  /// Fuera del municipio (o sin centroides capturados) devuelve null y la
  /// app le pide al vecino que la elija.
  static Colonia? coloniaCercana(
    Punto punto,
    List<Colonia> colonias, {
    double maxKm = 3,
  }) {
    Colonia? mejor;
    var menor = double.infinity;
    for (final c in colonias.where((c) => c.tieneCentro)) {
      final d = distanciaKm(punto, Punto(c.lat!, c.lng!));
      if (d < menor) {
        menor = d;
        mejor = c;
      }
    }
    return menor <= maxKm ? mejor : null;
  }

  static double distanciaKm(Punto a, Punto b) {
    const r = 6371.0;
    double rad(double g) => g * pi / 180;
    final dLat = rad(b.lat - a.lat);
    final dLng = rad(b.lng - a.lng);
    final h =
        sin(dLat / 2) * sin(dLat / 2) +
        cos(rad(a.lat)) * cos(rad(b.lat)) * sin(dLng / 2) * sin(dLng / 2);
    return 2 * r * asin(sqrt(h));
  }
}
