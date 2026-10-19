import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../tema/tema.dart';

export 'package:latlong2/latlong.dart' show LatLng;

/// Token publico de Mapbox (pk.…). Se pasa al compilar y NO se sube al repo:
///
///   flutter run --dart-define-from-file=.env     (con MAPBOX_TOKEN=pk.…)
///
/// Es el mismo que usa el panel (NEXT_PUBLIC_MAPBOX_TOKEN). Conviene
/// restringirlo en la cuenta de Mapbox.
const String mapboxToken = String.fromEnvironment('MAPBOX_TOKEN');

bool get hayMapbox => mapboxToken.startsWith('pk.');

/// Centro de Teocaltiche (respaldo cuando una colonia no tiene centroide).
const centroMunicipio = LatLng(21.4271, -102.5764);

/// Mapa de Mapbox con trazos y marcadores. Sin token muestra [respaldo]
/// (la ilustracion del Figma), para que la app corra igual en pruebas y
/// para quien no tenga el token.
class MapaMunicipio extends StatelessWidget {
  const MapaMunicipio({
    super.key,
    required this.centro,
    this.zoom = 15.5,
    this.trazos = const [],
    this.marcadores = const [],
    this.alto = 260,
    this.respaldo,
    this.interactivo = true,
  });

  final LatLng centro;
  final double zoom;
  final List<Polyline> trazos;
  final List<Marker> marcadores;
  final double alto;
  final Widget? respaldo;
  final bool interactivo;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(Medidas.radioModulo),
      child: SizedBox(
        height: alto,
        child: !hayMapbox && respaldo != null
            ? respaldo
            : FlutterMap(
                options: MapOptions(
                  initialCenter: centro,
                  initialZoom: zoom,
                  backgroundColor: const Color(0xFFEDEFF3),
                  interactionOptions: InteractionOptions(
                    flags: interactivo
                        ? InteractiveFlag.all & ~InteractiveFlag.rotate
                        : InteractiveFlag.none,
                  ),
                ),
                children: [
                  if (hayMapbox)
                    TileLayer(
                      urlTemplate:
                          'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token={token}',
                      additionalOptions: const {'token': mapboxToken},
                      tileDimension: 512,
                      zoomOffset: -1,
                      maxZoom: 20,
                      userAgentPackageName: 'mx.miteocal.app',
                    ),
                  if (trazos.isNotEmpty) PolylineLayer(polylines: trazos),
                  if (marcadores.isNotEmpty) MarkerLayer(markers: marcadores),
                  // Mapbox exige mostrar la atribucion.
                  const SimpleAttributionWidget(
                    source: Text('© Mapbox © OpenStreetMap'),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Punto redondo con borde blanco (tu casa, el camion, un cierre).
class PuntoMapa extends StatelessWidget {
  const PuntoMapa({super.key, required this.color, this.tam = 18, this.icono});

  final Color color;
  final double tam;
  final IconData? icono;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: tam,
      height: tam,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: icono == null
          ? null
          : Icon(icono, size: tam * 0.5, color: Colors.white),
    );
  }
}

/// Etiqueta blanca o de color sobre el mapa ("Tu casa", "Llega ~7:25").
class EtiquetaMapa extends StatelessWidget {
  const EtiquetaMapa({
    super.key,
    required this.texto,
    this.fondo = Colors.white,
    this.color = Colores.textoPrimario,
  });

  final String texto;
  final Color fondo;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x24000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Text(texto, style: Tipografia.micro.copyWith(color: color)),
    );
  }
}

/// Punto a una fraccion [t] (0..1) del recorrido de [puntos].
LatLng puntoEnRuta(List<LatLng> puntos, double t) {
  if (puntos.length < 2) return puntos.isEmpty ? centroMunicipio : puntos.first;
  const d = Distance();
  final tramos = [
    for (var i = 0; i < puntos.length - 1; i++) d(puntos[i], puntos[i + 1]),
  ];
  final total = tramos.fold<double>(0, (a, b) => a + b);
  var objetivo = total * t.clamp(0, 1);
  for (var i = 0; i < tramos.length; i++) {
    if (objetivo <= tramos[i] || i == tramos.length - 1) {
      final f = tramos[i] == 0 ? 0.0 : (objetivo / tramos[i]).clamp(0.0, 1.0);
      final a = puntos[i], b = puntos[i + 1];
      return LatLng(
        a.latitude + (b.latitude - a.latitude) * f,
        a.longitude + (b.longitude - a.longitude) * f,
      );
    }
    objetivo -= tramos[i];
  }
  return puntos.last;
}

/// Ajusta un recorrido a las calles con Mapbox Directions (igual que el
/// panel). Sin token o sin red devuelve los puntos tal cual.
Future<List<LatLng>> trazarPorCalles(List<LatLng> puntos) async {
  if (!hayMapbox || puntos.length < 2) return puntos;
  final coords = puntos.map((p) => '${p.longitude},${p.latitude}').join(';');
  final url = Uri.parse(
    'https://api.mapbox.com/directions/v5/mapbox/driving/$coords'
    '?geometries=geojson&overview=full&access_token=$mapboxToken',
  );
  try {
    final r = await http.get(url).timeout(const Duration(seconds: 8));
    if (r.statusCode != 200) return puntos;
    final rutas =
        (jsonDecode(r.body) as Map<String, dynamic>)['routes'] as List?;
    final linea =
        (rutas?.firstOrNull as Map?)?['geometry']?['coordinates'] as List?;
    if (linea == null || linea.length < 2) return puntos;
    return [
      for (final c in linea)
        LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()),
    ];
  } catch (_) {
    return puntos;
  }
}
