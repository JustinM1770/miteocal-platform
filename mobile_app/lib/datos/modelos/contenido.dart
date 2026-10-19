// Modelos de las pantallas de contenido (02, 03, 05, 06, 13, 14, 15, 16).
// Todos se construyen desde mapas tolerantes: un campo que falta no debe
// tumbar la pantalla, se muestra vacio.

import 'package:cloud_firestore/cloud_firestore.dart';

DateTime _fecha(dynamic v) {
  if (v is Timestamp) return v.toDate();
  if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
  return DateTime.now();
}

String _texto(Map<String, dynamic> m, String clave, [String otra = '']) =>
    (m[clave] as String?) ?? (otra.isEmpty ? '' : (m[otra] as String?) ?? '');

// ─── 02 · Noticias y comunidad ────────────────────────────────────────────

class AvisoParroquial {
  const AvisoParroquial({required this.titulo, required this.detalle});
  final String titulo;
  final String detalle;
}

class Esquela {
  const Esquela({
    required this.nombre,
    required this.fallecio,
    required this.misa,
    required this.lugar,
  });
  final String nombre;
  final DateTime fallecio;
  final String misa;
  final String lugar;
}

// ─── 03 · Comercio y empleo ───────────────────────────────────────────────

class Comercio {
  const Comercio({
    required this.id,
    required this.nombre,
    required this.categoria,
    required this.direccion,
    this.abierto = true,
    this.calificacion = 0,
    this.resenas = 0,
    this.whatsapp,
    this.descripcion = '',
    this.aceptaUsd = false,
    this.enviosAlExtranjero = false,
    this.qboard,
  });

  final String id;
  final String nombre;

  /// 'Restaurantes' | 'Servicios' | 'Salud' | 'Tiendas'
  final String categoria;
  final String direccion;
  final bool abierto;
  final double calificacion;
  final int resenas;

  /// 10 digitos. null = el negocio no lo ha compartido.
  final String? whatsapp;
  final String descripcion;
  final bool aceptaUsd;

  /// Aparece en "Envía a tu familia" (06 · Paisanos).
  final bool enviosAlExtranjero;

  /// Enlace a su tienda en qboard.mx, si la tiene.
  final String? qboard;

  factory Comercio.desdeMapa(String id, Map<String, dynamic> m) => Comercio(
    id: id,
    nombre: _texto(m, 'nombre'),
    categoria: _texto(m, 'categoria', 'giro'),
    direccion: _texto(m, 'direccion'),
    abierto: (m['abierto'] as bool?) ?? true,
    calificacion: (m['calificacion'] as num?)?.toDouble() ?? 0,
    resenas: (m['resenas'] as num?)?.toInt() ?? 0,
    whatsapp: m['whatsapp'] as String?,
    descripcion: _texto(m, 'descripcion'),
    aceptaUsd: (m['aceptaUsd'] as bool?) ?? false,
    enviosAlExtranjero: (m['enviosAlExtranjero'] as bool?) ?? false,
    qboard:
        (m['qboard'] is Map ? (m['qboard'] as Map)['url'] : m['qboard'])
            as String?,
  );
}

class Vacante {
  const Vacante({
    required this.puesto,
    required this.empresa,
    required this.jornada,
    required this.sueldo,
  });
  final String puesto;
  final String empresa;
  final String jornada;
  final String sueldo;
}

class Clasificado {
  const Clasificado({
    required this.titulo,
    required this.precio,
    required this.categoria,
    required this.publicado,
  });
  final String titulo;
  final String precio;

  /// 'Vehículo' | 'Inmueble' | 'Artículo'
  final String categoria;
  final DateTime publicado;
}

// ─── 05 · Feria ───────────────────────────────────────────────────────────

enum Disponibilidad { disponible, ultimos, agotado }

class EventoFeria {
  const EventoFeria({
    required this.id,
    required this.titulo,
    required this.fecha,
    required this.hora,
    required this.lugar,
    required this.escenario,
    required this.precio,
    this.artista = '',
    this.tipo = 'Musical',
    this.descripcion = '',
    this.foto,
    this.disponibilidad = Disponibilidad.disponible,
  });

  final String id;
  final String titulo;

  /// Artista invitado cuando el evento es un certamen ("con Mario Bautista").
  final String artista;

  /// 'Musical' | 'Certamen' | 'Cultural' | 'Jaripeo' | 'Religioso' | 'Deportivo'
  final String tipo;
  final String descripcion;

  /// Cartel o foto del artista (URL). null = degradado del tipo.
  final String? foto;
  final DateTime fecha;
  final String hora;
  final String lugar;

  /// 'Palenque' | 'Teatro del Pueblo'
  final String escenario;

  /// 0 = gratuito; null = con costo, precio por confirmar.
  final int? precio;

  bool get gratuito => precio == 0;

  /// "Plaza principal · 21:00 hrs" o solo el lugar si no hay hora.
  String get lugarYHora => hora.isEmpty ? lugar : '$lugar · $hora hrs';
  final Disponibilidad disponibilidad;

  factory EventoFeria.desdeMapa(String id, Map<String, dynamic> m) {
    final cupo = (m['cupo'] as num?)?.toInt();
    final vendidos = (m['vendidos'] as num?)?.toInt() ?? 0;
    final quedan = cupo == null ? null : cupo - vendidos;
    return EventoFeria(
      id: id,
      titulo: _texto(m, 'titulo', 'artista'),
      fecha: _fecha(m['fecha']),
      hora: _texto(m, 'hora'),
      lugar: _texto(m, 'lugar', 'sede'),
      escenario: _texto(m, 'escenario'),
      precio: (m['precio'] as num?)?.toInt(),
      artista: _texto(m, 'artista'),
      tipo: _texto(m, 'tipo').isEmpty ? 'Musical' : _texto(m, 'tipo'),
      descripcion: _texto(m, 'descripcion'),
      foto: m['foto'] as String?,
      disponibilidad: quedan == null
          ? Disponibilidad.disponible
          : quedan <= 0
          ? Disponibilidad.agotado
          : quedan < (cupo! * 0.1)
          ? Disponibilidad.ultimos
          : Disponibilidad.disponible,
    );
  }
}

/// Boleto ya pagado. El QR lleva la misma carga que valida el panel:
/// `MITEOCAL1|<municipio>|<folio>|<pagoId>`
/// Candidata a reina o a Miss Chiquitita.
class Candidata {
  const Candidata({
    required this.id,
    required this.nombre,
    required this.certamen,
    this.foto,
  });

  final String id;
  final String nombre;

  /// 'reina' | 'miss'
  final String certamen;
  final String? foto;

  factory Candidata.desdeMapa(String id, Map<String, dynamic> m) => Candidata(
    id: id,
    nombre: _texto(m, 'nombre'),
    certamen: _texto(m, 'certamen'),
    foto: m['foto'] as String?,
  );
}

class Pase {
  const Pase({
    required this.evento,
    required this.folio,
    required this.pagoId,
    required this.municipioId,
    this.accesos = 1,
  });

  final EventoFeria evento;
  final String folio;
  final String pagoId;
  final String municipioId;
  final int accesos;

  String get carga => 'MITEOCAL1|$municipioId|$folio|$pagoId';
}

// ─── 06 · Paisanos ────────────────────────────────────────────────────────

class Transmision {
  const Transmision({
    required this.titulo,
    required this.lugar,
    required this.espectadores,
    this.enVivo = true,
    this.url,
  });
  final String titulo;
  final String lugar;
  final int espectadores;
  final bool enVivo;
  final String? url;
}

class ComunidadPaisana {
  const ComunidadPaisana({required this.conectados, required this.estados});
  final int conectados;

  /// De donde se conectan mas, en orden.
  final List<String> estados;
}

// ─── 13 · Agua ────────────────────────────────────────────────────────────

class PasoBitacora {
  const PasoBitacora({
    required this.hora,
    required this.titulo,
    required this.detalle,
    this.estimado = false,
  });
  final String hora;
  final String titulo;
  final String detalle;

  /// Paso que todavia no ocurre (hora estimada).
  final bool estimado;
}

class CorteProgramado {
  const CorteProgramado({
    required this.fecha,
    required this.titulo,
    required this.horario,
  });
  final DateTime fecha;
  final String titulo;
  final String horario;
}

// ─── 14 · Basura en vivo ──────────────────────────────────────────────────

class RutaBasura {
  const RutaBasura({
    required this.nombre,
    required this.unidad,
    required this.minutos,
    required this.cuadras,
    required this.avanzaPor,
    required this.dias,
    this.llegaA = '',
  });

  final String nombre;
  final String unidad;

  /// Minutos estimados para llegar a la calle del vecino. null = hoy no pasa.
  final int? minutos;
  final int cuadras;
  final String avanzaPor;

  /// 1 = lunes … 7 = domingo (DateTime.weekday).
  final List<int> dias;
  final String llegaA;
}

// ─── 15 · Cierres y obras ─────────────────────────────────────────────────

enum TipoCierre { total, temporal, obra }

class Cierre {
  const Cierre({
    required this.id,
    required this.tipo,
    required this.calle,
    required this.detalle,
    required this.vigencia,
    this.distanciaM,
    this.rutaAlterna = '',
  });

  final String id;
  final TipoCierre tipo;
  final String calle;
  final String detalle;
  final String vigencia;
  final int? distanciaM;
  final String rutaAlterna;

  bool get esObra => tipo == TipoCierre.obra;

  /// Documento obras/{id} que escribe el panel al publicar un cierre.
  factory Cierre.desdeMapa(String id, Map<String, dynamic> m) {
    final tipo = _texto(m, 'tipo').toLowerCase();
    final fin = _texto(m, 'fin');
    return Cierre(
      id: id,
      tipo: tipo.contains('obra')
          ? TipoCierre.obra
          : tipo.contains('temporal')
          ? TipoCierre.temporal
          : TipoCierre.total,
      calle: _texto(m, 'calle', 'titulo'),
      detalle: _texto(m, 'descripcion'),
      vigencia: fin.isNotEmpty ? 'Hasta el $fin' : _texto(m, 'inicio'),
      rutaAlterna: _texto(m, 'rutaAlterna'),
    );
  }
}

// ─── 16 · Escuelas ────────────────────────────────────────────────────────

class Escuela {
  const Escuela({required this.id, required this.nombre, required this.nivel});
  final String id;
  final String nombre;
  final String nivel;
}

enum TipoAvisoEscolar { suspension, aviso, examen }

class AvisoEscolar {
  const AvisoEscolar({
    required this.escuelaId,
    required this.tipo,
    required this.texto,
    required this.fecha,
  });
  final String escuelaId;
  final TipoAvisoEscolar tipo;
  final String texto;
  final DateTime fecha;
}
