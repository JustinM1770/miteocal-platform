import 'modelos/agua.dart';
import 'modelos/colonia.dart';
import 'modelos/contacto.dart';
import 'modelos/contenido.dart';
import 'modelos/municipio.dart';
import 'modelos/noticia.dart';
import 'modelos/perfil.dart';
import 'modelos/reporte.dart';

/// Cual municipio atiende este build. Es el unico valor de arranque que la
/// app conoce; todo lo demas —nombre, colores, modulos— sale de los datos.
///
///   flutter run --dart-define=MUNICIPIO_ID=villa-hidalgo
const String municipioId = String.fromEnvironment(
  'MUNICIPIO_ID',
  defaultValue: 'teocaltiche',
);

String hoy() {
  final d = DateTime.now();
  final mes = d.month.toString().padLeft(2, '0');
  final dia = d.day.toString().padLeft(2, '0');
  return '${d.year}-$mes-$dia';
}

/// Todo lo que la app lee o escribe pasa por aqui. Hay dos implementaciones:
///
/// - [RepositorioFirestore]: datos reales en municipios/{municipioId}/...
/// - [RepositorioDemo]: datos de ejemplo en memoria, para correr la app sin
///   Firebase (desarrollo, pruebas y el demo del hackathon).
///
/// Las pantallas solo conocen esta interfaz; cambiar de fuente no las toca.
abstract class Repositorio {
  Stream<Municipio?> municipio();

  /// Lista de municipios dados de alta en el sistema (para el selector demo/multi-municipio).
  Future<List<Municipio>> municipiosDisponibles();

  /// Cambia el municipio activo para cargar sus configuraciones, temas y módulos.
  void cambiarMunicipio(String id);

  /// Estado del agua de hoy. null si el municipio todavia no lo publico —
  /// la pantalla debe saber verse bien sin dato.
  Stream<EstadoAgua?> aguaDeHoy();

  Future<List<Colonia>> colonias();

  Stream<List<Noticia>> noticias({int max = 10});

  Future<List<ContactoEmergencia>> emergencias();

  /// Registra el reporte y devuelve su folio de seguimiento.
  Future<Reporte> enviarReporte(NuevoReporte nuevo, Perfil autor);

  // ── 02 · Noticias y comunidad
  Future<List<AvisoParroquial>> avisosParroquiales();
  Future<List<Esquela>> esquelas();

  // ── 03 · Comercio y empleo (06 usa los que envian al extranjero)
  Future<List<Comercio>> comercios();
  Future<List<Vacante>> vacantes();
  Future<List<Clasificado>> clasificados();

  // ── 05 · Feria
  Future<List<EventoFeria>> eventosFeria();

  /// Compra SIMULADA (sin cobro real). Devuelve el pase con su QR.
  Future<Pase> comprarBoleto(EventoFeria evento, Perfil comprador);
  Future<List<Pase>> misPases(Perfil vecino);

  /// Candidatas de 'reina' o 'miss'.
  Future<List<Candidata>> candidatas(String certamen);

  /// Un voto gratis por vecino y certamen; votar de nuevo lo cambia.
  Future<void> votar(Candidata candidata, Perfil vecino);

  /// Id de la candidata por la que voto el vecino, o null.
  Future<String?> miVoto(String certamen, Perfil vecino);

  // ── 06 · Paisanos
  Future<Transmision?> transmisionEnVivo();
  Future<ComunidadPaisana?> comunidadPaisana();

  // ── 13 · Agua (detalle del dia y cortes)
  Future<List<PasoBitacora>> bitacoraAgua();
  Future<List<CorteProgramado>> cortesProgramados();

  // ── 14 · Basura en vivo
  Future<RutaBasura?> rutaBasura(String coloniaId);

  // ── 15 · Cierres y obras
  Future<List<Cierre>> cierres();

  // ── 16 · Escuelas
  Future<List<Escuela>> escuelas();
  Future<List<AvisoEscolar>> avisosEscolares();
}
