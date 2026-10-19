import 'dart:math';

import 'package:flutter/painting.dart' show Color;

import 'modelos/agua.dart';
import 'modelos/colonia.dart';
import 'modelos/contacto.dart';
import 'modelos/municipio.dart';
import 'modelos/noticia.dart';
import 'modelos/perfil.dart';
import 'modelos/reporte.dart';
import 'repositorio.dart';

/// Datos de ejemplo de Teocaltiche para correr la app sin Firebase.
///
/// Las 17 colonias son las reales (backend/seed/config.json). Los centroides,
/// horarios de agua, pozos y dias de basura son APROXIMADOS para el demo:
/// los reales los captura el municipio en el panel.
class RepositorioDemo implements Repositorio {
  RepositorioDemo({this.latencia = const Duration(milliseconds: 250)});

  /// Simula la red para que los estados de carga se vean como en la vida real.
  final Duration latencia;

  final List<Reporte> reportes = [];

  static const _municipio = Municipio(
    id: 'teocaltiche',
    nombre: 'Teocaltiche',
    estado: 'Jalisco',
    activo: true,
    modulos: {
      'agua': true,
      'noticias': true,
      'reportes': true,
      'basura': true,
      'feria': true,
    },
    tema: TemaMunicipio(
      primary: Color(0xFF1552E0),
      primarySoft: Color(0xFFEDF2FE),
      success: Color(0xFF12A150),
      danger: Color(0xFFD93A3A),
    ),
    prefijoFolio: 'TEC',
  );

  static const _colonias = [
    Colonia(
      id: 'teocaltiche-centro',
      nombre: 'Teocaltiche Centro',
      zona: 'Centro y zonas tradicionales',
      lat: 21.4271,
      lng: -102.5764,
      horarioAgua: '6:00 – 14:00 hrs',
      pozo: 'El Salitre',
      basura: 'Martes y viernes, 7:00 hrs',
      escuelas: 4,
    ),
    Colonia(
      id: 'el-nejayote',
      nombre: 'El Nejayote',
      zona: 'Centro y zonas tradicionales',
      tipo: 'Barrio tradicional',
      lat: 21.4296,
      lng: -102.5798,
      horarioAgua: '6:00 – 14:00 hrs',
      pozo: 'El Salitre',
      basura: 'Martes y viernes, 8:00 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'el-tanque',
      nombre: 'El Tanque',
      zona: 'Centro y zonas tradicionales',
      tipo: 'Barrio tradicional',
      lat: 21.4236,
      lng: -102.5812,
      horarioAgua: '8:00 – 16:00 hrs',
      pozo: 'El Tanque',
      basura: 'Lunes y jueves, 7:30 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'el-santuario',
      nombre: 'El Santuario',
      zona: 'Centro y zonas tradicionales',
      tipo: 'Barrio tradicional',
      lat: 21.4249,
      lng: -102.5728,
      horarioAgua: '6:00 – 12:00 hrs',
      pozo: 'El Salitre',
      basura: 'Martes y viernes, 9:00 hrs',
      escuelas: 2,
    ),
    Colonia(
      id: 'bellavista',
      nombre: 'Bellavista',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4318,
      lng: -102.5731,
      horarioAgua: '10:00 – 18:00 hrs',
      pozo: 'San Miguel',
      basura: 'Miércoles y sábado, 7:00 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'ctm-los-organos',
      nombre: 'CTM (Los Órganos)',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4342,
      lng: -102.5826,
      horarioAgua: '12:00 – 20:00 hrs',
      pozo: 'Los Órganos',
      basura: 'Lunes y jueves, 9:00 hrs',
      escuelas: 2,
    ),
    Colonia(
      id: 'colinas-de-la-cruz',
      nombre: 'Colinas de la Cruz',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4207,
      lng: -102.5853,
      horarioAgua: '12:00 – 20:00 hrs',
      pozo: 'El Tanque',
      basura: 'Miércoles y sábado, 8:30 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'san-miguel-norte',
      nombre: 'San Miguel Norte',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4313,
      lng: -102.5702,
      horarioAgua: '8:00 – 16:00 hrs',
      pozo: 'San Miguel',
      basura: 'Martes y viernes, 10:00 hrs',
      escuelas: 2,
    ),
    Colonia(
      id: 'san-miguel-sur',
      nombre: 'San Miguel Sur',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4281,
      lng: -102.5689,
      horarioAgua: '8:00 – 16:00 hrs',
      pozo: 'San Miguel',
      basura: 'Martes y viernes, 10:30 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'tavares',
      nombre: 'Tavares',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4228,
      lng: -102.5671,
      horarioAgua: '10:00 – 18:00 hrs',
      pozo: 'San Miguel',
      basura: 'Lunes y jueves, 10:00 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'los-angeles',
      nombre: 'Los Ángeles',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4359,
      lng: -102.5759,
      horarioAgua: '6:00 – 12:00 hrs',
      pozo: 'Los Órganos',
      basura: 'Miércoles y sábado, 9:00 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'los-arcos',
      nombre: 'Los Arcos',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4189,
      lng: -102.5776,
      horarioAgua: '10:00 – 18:00 hrs',
      pozo: 'El Tanque',
      basura: 'Lunes y jueves, 8:00 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'maravillas',
      nombre: 'Maravillas',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4262,
      lng: -102.5882,
      horarioAgua: '12:00 – 20:00 hrs',
      pozo: 'El Tanque',
      basura: 'Miércoles y sábado, 10:00 hrs',
      escuelas: 0,
    ),
    Colonia(
      id: 'arboledas',
      nombre: 'Arboledas',
      zona: 'Colonias y fraccionamientos',
      tipo: 'Fraccionamiento',
      lat: 21.4378,
      lng: -102.5704,
      horarioAgua: '6:00 – 14:00 hrs',
      pozo: 'San Miguel',
      basura: 'Martes y viernes, 11:00 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'magisterial',
      nombre: 'Magisterial',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4221,
      lng: -102.5739,
      horarioAgua: '6:00 – 14:00 hrs',
      pozo: 'El Salitre',
      basura: 'Lunes y jueves, 7:00 hrs',
      escuelas: 2,
    ),
    Colonia(
      id: 'san-pedro',
      nombre: 'San Pedro',
      zona: 'Colonias y fraccionamientos',
      lat: 21.4172,
      lng: -102.5712,
      horarioAgua: '8:00 – 16:00 hrs',
      pozo: 'El Salitre',
      basura: 'Miércoles y sábado, 7:30 hrs',
      escuelas: 1,
    ),
    Colonia(
      id: 'lomas-de-teocaltiche',
      nombre: 'Lomas de Teocaltiche',
      zona: 'Colonias y fraccionamientos',
      tipo: 'Fraccionamiento',
      lat: 21.4398,
      lng: -102.5808,
      horarioAgua: '12:00 – 20:00 hrs',
      pozo: 'Los Órganos',
      basura: 'Lunes y jueves, 11:00 hrs',
      escuelas: 1,
    ),
  ];

  Future<T> _tras<T>(T valor) => Future.delayed(latencia, () => valor);

  /// Cada suscriptor recibe su propio stream, igual que un snapshots() de
  /// Firestore: un widget puede volver a escuchar sin "already listened".
  Stream<T> _flujo<T>(T Function() valor) => Stream.multi((c) {
    _tras(valor()).then((v) {
      c.add(v);
      c.close();
    });
  });

  @override
  Stream<Municipio?> municipio() => _flujo(() => _municipio);

  @override
  Stream<EstadoAgua?> aguaDeHoy() => _flujo(
    () => const EstadoAgua(
      horario: '6:00 – 14:00 hrs',
      presion: 4.2,
      calidad: 'Óptima',
      cobertura: '98%',
      activo: true,
    ),
  );

  @override
  Future<List<Colonia>> colonias() => _tras(_colonias);

  @override
  Stream<List<Noticia>> noticias({int max = 10}) {
    final ahora = DateTime.now();
    return _flujo(
      () => [
        Noticia(
          id: 'n1',
          categoria: 'Obras',
          titulo: 'Rehabilitación de calle Benito Juárez inicia el lunes',
          publicadaEn: ahora.subtract(const Duration(hours: 2)),
        ),
        Noticia(
          id: 'n2',
          categoria: 'Salud',
          titulo: 'Jornada de vacunación gratuita este sábado en el DIF',
          publicadaEn: ahora.subtract(const Duration(hours: 5)),
        ),
        Noticia(
          id: 'n3',
          categoria: 'Cultura',
          titulo:
              'Feria de Teocaltiche 2026: programa completo del 30 de octubre al 16 de noviembre',
          publicadaEn: ahora.subtract(const Duration(days: 1)),
        ),
      ].take(max).toList(),
    );
  }

  /// Solo 911 es real. El resto queda pendiente hasta que el ayuntamiento
  /// confirme cada numero (backend/seed/config.json).
  @override
  Future<List<ContactoEmergencia>> emergencias() => _tras(const [
    ContactoEmergencia(id: 'policia', nombre: 'Policía Municipal'),
    ContactoEmergencia(id: 'cruz-roja', nombre: 'Cruz Roja'),
    ContactoEmergencia(id: 'proteccion', nombre: 'Protección Civil'),
    ContactoEmergencia(id: 'sapas', nombre: 'Agua Potable · SAPAS'),
    ContactoEmergencia(
      id: 'emergencias',
      nombre: 'Emergencias',
      telefono: '911',
    ),
  ]);

  @override
  Future<Reporte> enviarReporte(NuevoReporte nuevo, Perfil autor) async {
    await Future.delayed(latencia * 3);
    final colonia = _colonias.where((c) => c.id == nuevo.coloniaId).firstOrNull;
    final reporte = Reporte(
      folio: 'TEC-${1000 + Random().nextInt(9000)}',
      tipo: nuevo.tipo,
      colonia: colonia?.nombre ?? nuevo.coloniaId,
      estado: 'recibido',
      creadoEn: DateTime.now(),
    );
    reportes.add(reporte);
    return reporte;
  }
}
