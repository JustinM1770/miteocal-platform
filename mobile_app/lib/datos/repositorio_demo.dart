import 'dart:async';
import 'dart:math';

import 'package:flutter/painting.dart' show Color;
import 'package:latlong2/latlong.dart';

import 'modelos/agua.dart';
import 'modelos/colonia.dart';
import 'modelos/contacto.dart';
import 'modelos/contenido.dart';
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
  final List<Pase> pases = [];

  /// certamen → id de candidata
  final Map<String, String> votos = {};

  static const _municipioTeocaltiche = Municipio(
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
      'cierres': true,
      'escuelas': true,
      'paisanos': true,
      'comercio': true,
    },
    tema: TemaMunicipio(
      primary: Color(0xFF1552E0),
      primarySoft: Color(0xFFEDF2FE),
      success: Color(0xFF12A150),
      danger: Color(0xFFD93A3A),
    ),
    prefijoFolio: 'TEC',
  );

  static const _municipioVillaHidalgo = Municipio(
    id: 'villa-hidalgo',
    nombre: 'Villa Hidalgo',
    estado: 'Jalisco',
    activo: true,
    modulos: {
      'agua': true,
      'noticias': true,
      'reportes': true,
      'basura': true,
      'feria': false,
      'cierres': true,
      'escuelas': true,
      'paisanos': false,
      'comercio': true,
    },
    tema: TemaMunicipio(
      primary: Color(0xFF0F766E),
      primarySoft: Color(0xFFE6FFFA),
      success: Color(0xFF10B981),
      danger: Color(0xFFEF4444),
    ),
    prefijoFolio: 'VHI',
  );

  String _municipioActualId = 'teocaltiche';

  Municipio get _municipio =>
      _municipioActualId == 'villa-hidalgo'
          ? _municipioVillaHidalgo
          : _municipioTeocaltiche;

  final StreamController<Municipio?> _controladorMunicipio =
      StreamController<Municipio?>.broadcast();

  @override
  void cambiarMunicipio(String id) {
    _municipioActualId = id;
    _controladorMunicipio.add(_municipio);
  }

  @override
  Future<List<Municipio>> municipiosDisponibles() =>
      _tras([_municipioTeocaltiche, _municipioVillaHidalgo]);

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
  Stream<Municipio?> municipio() => Stream.multi((c) {
    _tras(_municipio).then((v) {
      if (!c.isClosed) c.add(v);
      final sub = _controladorMunicipio.stream.listen((m) {
        if (!c.isClosed) c.add(m);
      });
      c.onCancel = () => sub.cancel();
    });
  });

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
          categoria: 'Cultura',
          fuente: 'Comité de Feria',
          titulo:
              'Feria de Teocaltiche 2026: del 30 de octubre al 12 de noviembre',
          cuerpo:
              'Inaugura el 30 de octubre con el certamen Srita. Teocaltiche y Mario Bautista en la plaza. '
              'Consulta la cartelera completa, vota por tu reina y guarda tus boletos desde la sección Feria.',
          publicadaEn: ahora.subtract(const Duration(hours: 1)),
        ),
        Noticia(
          id: 'n2',
          categoria: 'Obras',
          fuente: 'Obras Públicas',
          titulo: 'Rehabilitación de calle Zaragoza inicia el lunes',
          cuerpo:
              'Los trabajos durarán tres semanas. La calle permanecerá cerrada entre Juárez e Hidalgo; '
              'consulta la ruta alterna en Cierres y obras.',
          publicadaEn: ahora.subtract(const Duration(hours: 3)),
        ),
        Noticia(
          id: 'n3',
          categoria: 'Salud',
          fuente: 'DIF Municipal',
          titulo: 'Jornada de vacunación gratuita este sábado en el DIF',
          cuerpo:
              'De 9:00 a 14:00 hrs. Lleva tu cartilla de vacunación y una identificación.',
          publicadaEn: ahora.subtract(const Duration(hours: 6)),
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

  // ── Contenido de ejemplo para las pantallas 02–16. Nombres de personas,
  // negocios y eventos INVENTADOS para el demo.

  DateTime get _ahora => DateTime.now();

  @override
  Future<List<AvisoParroquial>> avisosParroquiales() => _tras(const [
    AvisoParroquial(
      titulo: 'Misa dominical · 7:00 hrs',
      detalle: 'Parroquia de San Miguel Arcángel',
    ),
    AvisoParroquial(
      titulo: 'Rosario por la feria · 19:00 hrs',
      detalle: 'Santuario de Guadalupe, todos los días de la feria',
    ),
  ]);

  @override
  Future<List<Esquela>> esquelas() => _tras([
    Esquela(
      nombre: 'Familia Ejemplo (demo)',
      fallecio: _ahora.subtract(const Duration(days: 1)),
      misa: 'Misa de cuerpo presente · Hoy 18:00 hrs',
      lugar: 'Parroquia de San Miguel Arcángel',
    ),
  ]);

  static const _comercios = [
    Comercio(
      id: 'c1',
      nombre: 'Farmacia del Centro',
      categoria: 'Salud',
      direccion: 'Hidalgo 12, Centro',
      calificacion: 4.8,
      resenas: 89,
    ),
    Comercio(
      id: 'c2',
      nombre: 'Tacos El Portal',
      categoria: 'Restaurantes',
      direccion: 'Morelos 8, El Tanque',
      abierto: false,
      calificacion: 4.9,
      resenas: 212,
    ),
    Comercio(
      id: 'c3',
      nombre: 'Abarrotes La Esperanza',
      categoria: 'Tiendas',
      direccion: 'Juárez 30, San Miguel Norte',
      calificacion: 4.5,
      resenas: 41,
    ),
    Comercio(
      id: 'c4',
      nombre: 'Taller Mecánico Hermanos',
      categoria: 'Servicios',
      direccion: 'Carretera a Villa Hidalgo km 1',
      calificacion: 4.6,
      resenas: 27,
    ),
    Comercio(
      id: 'c5',
      nombre: 'Muebles Teocaltiche',
      categoria: 'Tiendas',
      direccion: 'Zaragoza 51, Centro',
      calificacion: 4.7,
      resenas: 64,
      descripcion:
          'Envía muebles a tu familia, entrega a domicilio en el municipio.',
      aceptaUsd: true,
      enviosAlExtranjero: true,
    ),
    Comercio(
      id: 'c6',
      nombre: 'Florería Primavera',
      categoria: 'Tiendas',
      direccion: 'Plaza principal, Centro',
      calificacion: 4.9,
      resenas: 103,
      descripcion:
          'Arreglos y flores a domicilio. Pago con tarjeta internacional.',
      aceptaUsd: true,
      enviosAlExtranjero: true,
      qboard: 'https://qboard.mx',
    ),
  ];

  @override
  Future<List<Comercio>> comercios() => _tras(_comercios);

  @override
  Future<List<Vacante>> vacantes() => _tras(const [
    Vacante(
      puesto: 'Cajero/a de tienda',
      empresa: 'Abarrotes La Esperanza',
      jornada: 'Tiempo completo',
      sueldo: '\$6,500 / mes',
    ),
    Vacante(
      puesto: 'Auxiliar administrativo',
      empresa: 'Despacho contable (demo)',
      jornada: 'Medio tiempo',
      sueldo: '\$5,000 / mes',
    ),
  ]);

  @override
  Future<List<Clasificado>> clasificados() => _tras([
    Clasificado(
      titulo: 'Camioneta 2019 en buen estado',
      precio: '\$185,000',
      categoria: 'Vehículo',
      publicado: _ahora.subtract(const Duration(days: 2)),
    ),
    Clasificado(
      titulo: 'Se renta casa, 3 recámaras, Centro',
      precio: '\$4,500 / mes',
      categoria: 'Inmueble',
      publicado: _ahora.subtract(const Duration(days: 1)),
    ),
  ]);

  /// Feria del 30 de octubre al 16 de noviembre de 2026.
  /// Programa oficial de la Feria de Teocaltiche 2026 (30 oct – 12 nov),
  /// dado por el municipio. Los precios de la Plaza de Toros aún no se
  /// publican: precio null = "por confirmar".
  static final _eventos = <EventoFeria>[
    _plaza(
      'e01',
      30,
      'Inauguración · Certamen Srita. Teocaltiche',
      artista: 'Mario Bautista',
      tipo: 'Certamen',
      descripcion:
          'Arranca la feria con la elección de Srita. Teocaltiche 2026 y la presentación de Mario Bautista.',
    ),
    _plaza(
      'e02',
      31,
      'Certamen Miss Chiquitita',
      artista: 'Tributo Las Guerreras del K-pop',
      tipo: 'Certamen',
      descripcion:
          'Las niñas del municipio compiten por la corona de Miss Chiquitita. Después, tributo a Las Guerreras del K-pop.',
    ),
    _plaza(
      'e03',
      1,
      'Los Cadetes de Linares',
      descripcion: 'Música norteña en la plaza principal.',
    ),
    _plaza(
      'e04',
      2,
      'Talentos Locales',
      tipo: 'Cultural',
      descripcion: _talentos,
    ),
    _plaza(
      'e05',
      3,
      'Talentos Locales',
      tipo: 'Cultural',
      descripcion: _talentos,
    ),
    _plaza(
      'e06',
      4,
      'Talentos Locales',
      tipo: 'Cultural',
      descripcion: _talentos,
    ),
    _toros(
      'e07',
      5,
      'Jaripeo con Ulises Quintero',
      tipo: 'Jaripeo',
      descripcion: 'Jaripeo y música en la Plaza de Toros.',
    ),
    _toros(
      'e08',
      6,
      'Lenin Ramírez',
      descripcion: 'Concierto en la Plaza de Toros.',
    ),
    _toros(
      'e09',
      7,
      'La Adictiva',
      descripcion: 'Banda sinaloense en la Plaza de Toros.',
    ),
    _toros(
      'e10',
      8,
      'La Arrolladora Banda El Limón',
      descripcion: 'Banda sinaloense en la Plaza de Toros.',
    ),
    _plaza(
      'e11',
      9,
      'La Sonora Dinamita',
      descripcion: 'Cumbia en la plaza principal.',
    ),
    _plaza(
      'e12',
      10,
      'Banda La Fresa',
      descripcion: 'Banda en la plaza principal.',
    ),
    _plaza(
      'e13',
      11,
      'Joss Favela',
      descripcion: 'Concierto en la plaza principal.',
    ),
    _plaza(
      'e14',
      12,
      'Talentos Locales',
      tipo: 'Cultural',
      descripcion: 'Cierre de la feria con artistas de Teocaltiche.',
    ),
  ];

  static const _talentos =
      'Artistas de Teocaltiche en el escenario de la plaza.';

  static DateTime _dia(int d) => DateTime(2026, d >= 30 ? 10 : 11, d);

  /// Gratuito en la plaza.
  static EventoFeria _plaza(
    String id,
    int dia,
    String titulo, {
    String artista = '',
    String tipo = 'Musical',
    String descripcion = '',
  }) => EventoFeria(
    id: id,
    titulo: titulo,
    artista: artista,
    tipo: tipo,
    descripcion: descripcion,
    fecha: _dia(dia),
    hora: '',
    lugar: 'Plaza principal',
    escenario: 'Plaza principal',
    precio: 0,
  );

  /// Con costo en la Plaza de Toros.
  static EventoFeria _toros(
    String id,
    int dia,
    String titulo, {
    String tipo = 'Musical',
    String descripcion = '',
  }) => EventoFeria(
    id: id,
    titulo: titulo,
    tipo: tipo,
    descripcion: descripcion,
    fecha: _dia(dia),
    hora: '',
    lugar: 'Plaza de Toros',
    escenario: 'Plaza de Toros',
    precio: null,
  );

  @override
  Future<List<EventoFeria>> eventosFeria() => _tras(_eventos);

  @override
  Future<Pase> comprarBoleto(EventoFeria evento, Perfil comprador) async {
    await Future.delayed(latencia * 3);
    final r = Random();
    final pase = Pase(
      evento: evento,
      folio: 'TEC-${1000 + r.nextInt(9000)}',
      pagoId: 'demo-${DateTime.now().millisecondsSinceEpoch}',
      municipioId: _municipio.id,
    );
    pases.insert(0, pase);
    return pase;
  }

  @override
  Future<List<Pase>> misPases(Perfil vecino) => _tras(List.of(pases));

  /// Candidatas reales de la Feria 2026 (dadas por el municipio).
  static const _candidatas = [
    Candidata(id: 'r1', nombre: 'Nicole Ramírez', certamen: 'reina'),
    Candidata(id: 'r2', nombre: 'Allison Ramírez', certamen: 'reina'),
    Candidata(id: 'r3', nombre: 'Alondra Ruvalcaba', certamen: 'reina'),
    Candidata(id: 'r4', nombre: 'Daira Espinola', certamen: 'reina'),
    Candidata(id: 'm1', nombre: 'Alexa', certamen: 'miss'),
    Candidata(id: 'm2', nombre: 'Paulina', certamen: 'miss'),
    Candidata(id: 'm3', nombre: 'Geisel', certamen: 'miss'),
    Candidata(id: 'm4', nombre: 'Victoria', certamen: 'miss'),
    Candidata(id: 'm5', nombre: 'Irlanda', certamen: 'miss'),
  ];

  @override
  Future<List<Candidata>> candidatas(String certamen) =>
      _tras(_candidatas.where((c) => c.certamen == certamen).toList());

  @override
  Future<void> votar(Candidata candidata, Perfil vecino) async {
    await _tras(null);
    votos[candidata.certamen] = candidata.id;
  }

  @override
  Future<String?> miVoto(String certamen, Perfil vecino) =>
      _tras(votos[certamen]);

  @override
  Future<Transmision?> transmisionEnVivo() => _tras(
    const Transmision(
      titulo: 'Quema del castillo · Parroquia de San Miguel',
      lugar: 'Transmisión desde Teocaltiche',
      espectadores: 412,
    ),
  );

  @override
  Future<ComunidadPaisana?> comunidadPaisana() => _tras(
    const ComunidadPaisana(
      conectados: 2341,
      estados: ['California', 'Illinois', 'Texas'],
    ),
  );

  @override
  Future<List<PasoBitacora>> bitacoraAgua() => _tras(const [
    PasoBitacora(
      hora: '06:00',
      titulo: 'Servicio iniciado',
      detalle: 'El pozo comenzó a bombear a la red.',
    ),
    PasoBitacora(
      hora: '09:30',
      titulo: 'Presión estable',
      detalle: 'Lectura de 4.2 bar en el tanque elevado.',
    ),
    PasoBitacora(
      hora: '14:00',
      titulo: 'Fin del turno',
      detalle: 'Hora estimada de cierre del servicio.',
      estimado: true,
    ),
  ]);

  @override
  Future<List<CorteProgramado>> cortesProgramados() => _tras([
    CorteProgramado(
      fecha: _ahora.add(const Duration(days: 4)),
      titulo: 'Cambio de tubería · calle Zaragoza',
      horario: '8:00 a 16:00 hrs',
    ),
    CorteProgramado(
      fecha: _ahora.add(const Duration(days: 11)),
      titulo: 'Mantenimiento del pozo El Salitre',
      horario: '6:00 a 12:00 hrs',
    ),
  ]);

  @override
  Future<RutaBasura?> rutaBasura(String coloniaId) {
    final c = _colonias.where((c) => c.id == coloniaId).firstOrNull;
    final dias = _diasDeBasura(c?.basura ?? '');
    final hoyPasa = dias.contains(_ahora.weekday) && _ahora.hour < 14;
    return _tras(
      RutaBasura(
        nombre:
            'Ruta ${c?.zona.startsWith('Centro') == true ? 'Centro' : 'Colonias'}',
        unidad: 'Unidad 04',
        minutos: hoyPasa ? 18 : null,
        cuadras: 6,
        avanzaPor: 'Morelos',
        dias: dias,
        llegaA: c?.nombre ?? '',
        trazo: _rutaHacia(LatLng(c?.lat ?? 21.4271, c?.lng ?? -102.5764)),
      ),
    );
  }

  /// Recorrido de demo en forma de L que termina en el domicilio. La app lo
  /// ajusta a las calles con Mapbox Directions cuando hay token.
  static List<LatLng> _rutaHacia(LatLng casa) => [
    LatLng(casa.latitude - 0.0055, casa.longitude - 0.0032),
    LatLng(casa.latitude - 0.0018, casa.longitude - 0.0032),
    LatLng(casa.latitude - 0.0018, casa.longitude + 0.0006),
    casa,
  ];

  /// "Martes y viernes, 7:00 hrs" → [2, 5]
  static List<int> _diasDeBasura(String texto) {
    const nombres = {
      'lunes': 1,
      'martes': 2,
      'miércoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sábado': 6,
      'domingo': 7,
    };
    final t = texto.toLowerCase();
    return [
      for (final e in nombres.entries)
        if (t.contains(e.key)) e.value,
    ];
  }

  @override
  Future<List<Cierre>> cierres() => _tras([
    const Cierre(
      id: 'o1',
      tipo: TipoCierre.total,
      calle: 'Calle Zaragoza',
      detalle: 'Entre Juárez e Hidalgo, por rehabilitación de pavimento.',
      vigencia: 'Hasta el 7 de noviembre',
      distanciaM: 350,
      rutaAlterna: 'Toma Morelos y regresa por Hidalgo.',
      trazo: [LatLng(21.4277, -102.5790), LatLng(21.4277, -102.5764)],
    ),
    const Cierre(
      id: 'o2',
      tipo: TipoCierre.obra,
      calle: 'Av. Juárez',
      detalle: 'Un carril cerrado en dirección norte, de 8:00 a 18:00 hrs.',
      vigencia: 'Hasta el 20 de noviembre',
      distanciaM: 700,
      rutaAlterna: 'Usa el carril sur con precaución.',
      trazo: [LatLng(21.4300, -102.5752), LatLng(21.4300, -102.5722)],
    ),
    const Cierre(
      id: 'o3',
      tipo: TipoCierre.temporal,
      calle: 'Calles del centro',
      detalle: 'Cierre por el desfile de Hijos Ausentes.',
      vigencia: '8 de noviembre, 10:00 a 14:00',
      distanciaM: 900,
      rutaAlterna: 'Circula por el libramiento.',
      trazo: [LatLng(21.4262, -102.5771), LatLng(21.4249, -102.5771)],
    ),
  ]);

  @override
  Future<List<Escuela>> escuelas() => _tras(const [
    Escuela(
      id: 'prepa',
      nombre: 'Preparatoria Regional',
      nivel: 'Bachillerato',
    ),
    Escuela(
      id: 'secu',
      nombre: 'Secundaria Técnica',
      nivel: 'Educación secundaria',
    ),
    Escuela(
      id: 'prim',
      nombre: 'Primaria Benito Juárez',
      nivel: 'Educación primaria',
    ),
    Escuela(
      id: 'kinder',
      nombre: 'Jardín de Niños Rosaura Zapata',
      nivel: 'Preescolar',
    ),
  ]);

  @override
  Future<List<AvisoEscolar>> avisosEscolares() => _tras([
    AvisoEscolar(
      escuelaId: 'prepa',
      tipo: TipoAvisoEscolar.suspension,
      texto:
          'Viernes: no hay clases por junta de consejo técnico escolar. Se reanudan el lunes.',
      fecha: _ahora.subtract(const Duration(hours: 3)),
    ),
    AvisoEscolar(
      escuelaId: 'secu',
      tipo: TipoAvisoEscolar.aviso,
      texto: 'Entrega de boletas el lunes de 9:00 a 13:00 hrs en cada aula.',
      fecha: _ahora.subtract(const Duration(days: 1)),
    ),
    AvisoEscolar(
      escuelaId: 'prepa',
      tipo: TipoAvisoEscolar.examen,
      texto: 'El examen de ingreso será el próximo lunes a las 8:00 hrs.',
      fecha: _ahora.subtract(const Duration(days: 2)),
    ),
  ]);
}
