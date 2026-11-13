import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Los cuatro servicios que cubre Nodex en la entrega del hackathon.
enum Servicio {
  agua('Agua', LucideIcons.droplet),
  basura('Basura', LucideIcons.truck),
  cierres('Cierres viales', LucideIcons.trafficCone),
  escuelas('Escuelas', LucideIcons.graduationCap);

  const Servicio(this.nombre, this.icono);
  final String nombre;
  final IconData icono;

  /// Tipo de publicación del panel → servicio. null = no es de los cuatro.
  static Servicio? deTipo(String tipo) => switch (tipo) {
    'agua' || 'corte' || 'incidente' => Servicio.agua,
    'basura' => Servicio.basura,
    'cierre' => Servicio.cierres,
    'escuela' => Servicio.escuelas,
    _ => null,
  };
}

/// Aviso que publica el municipio desde el panel (municipios/{id}/publicaciones).
/// Siempre trae servicio, colonia (o todo el municipio) y vigencia: es la
/// tesis del proyecto, nada de avisos sueltos sin caducidad.
class Aviso {
  const Aviso({
    required this.id,
    required this.servicio,
    required this.tipo,
    required this.titulo,
    required this.mensaje,
    required this.publicadoEn,
    this.colonia,
    this.caducaEn,
    this.estado,
    this.horaEstimada,
  });

  final String id;
  final Servicio servicio;

  /// agua | corte | incidente | basura | cierre | escuela
  final String tipo;
  final String titulo;
  final String mensaje;
  final DateTime publicadoEn;

  /// null = todo el municipio
  final String? colonia;
  final DateTime? caducaEn;

  /// activo | sin_servicio | sin_dato (solo agua)
  final String? estado;
  final String? horaEstimada;

  bool vigenteEn(DateTime ahora) =>
      !publicadoEn.isAfter(ahora) && (caducaEn == null || caducaEn!.isAfter(ahora));

  /// ¿Le toca a quien vive en esta colonia?
  bool esPara(String? coloniaVecino) =>
      colonia == null || coloniaVecino == null || colonia == coloniaVecino;

  /// "Vigente hasta 16:00", "Hasta mar 18" o "Vigente"
  String get vigencia {
    final c = caducaEn;
    if (c == null) return 'Vigente';
    final hoy = DateTime.now();
    final hh = '${c.hour}:${c.minute.toString().padLeft(2, '0')}';
    if (c.year == hoy.year && c.month == hoy.month && c.day == hoy.day) {
      return 'Vigente hasta $hh';
    }
    const dias = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    return 'Hasta ${dias[c.weekday - 1]} ${c.day}';
  }

  static DateTime? _fecha(dynamic v) => v is Timestamp
      ? v.toDate()
      : v is String
      ? DateTime.tryParse(v)
      : v is DateTime
      ? v
      : null;

  /// null si la publicación no es de los cuatro servicios.
  static Aviso? desdeMapa(String id, Map<String, dynamic> m) {
    final tipo = (m['tipo'] as String?) ?? '';
    final servicio = Servicio.deTipo(tipo);
    if (servicio == null) return null;
    return Aviso(
      id: id,
      servicio: servicio,
      tipo: tipo,
      titulo: (m['titulo'] as String?) ?? '',
      mensaje: (m['mensaje'] as String?) ?? '',
      publicadoEn: _fecha(m['publicarEn']) ?? DateTime.now(),
      colonia: m['colonia'] as String?,
      caducaEn: _fecha(m['caducaEn']),
      estado: m['estado'] as String?,
      horaEstimada: m['horaEstimada'] as String?,
    );
  }
}
