import 'modelos/agua.dart';
import 'modelos/colonia.dart';
import 'modelos/contacto.dart';
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

  /// Estado del agua de hoy. null si el municipio todavia no lo publico —
  /// la pantalla debe saber verse bien sin dato.
  Stream<EstadoAgua?> aguaDeHoy();

  Future<List<Colonia>> colonias();

  Stream<List<Noticia>> noticias({int max = 10});

  Future<List<ContactoEmergencia>> emergencias();

  /// Registra el reporte y devuelve su folio de seguimiento.
  Future<Reporte> enviarReporte(NuevoReporte nuevo, Perfil autor);
}
