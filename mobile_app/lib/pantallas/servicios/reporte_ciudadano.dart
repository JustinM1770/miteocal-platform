import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/colonia.dart';
import '../../datos/modelos/reporte.dart';
import '../../datos/repositorio.dart';
import '../../datos/sesion.dart';
import '../../nucleo/servicios/hapticos.dart';
import '../../nucleo/servicios/ubicacion.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';
import 'reporte_enviado.dart';

/// "Módulo · Reporte ciudadano" de 04 · Servicios: tipo, foto, GPS y envio.
class ReporteCiudadano extends StatefulWidget {
  const ReporteCiudadano({super.key, required this.colonias, this.tipoInicial});

  final List<Colonia> colonias;
  final TipoReporte? tipoInicial;

  @override
  State<ReporteCiudadano> createState() => ReporteCiudadanoState();
}

class ReporteCiudadanoState extends State<ReporteCiudadano> {
  /// Sin Storage la foto viaja dentro del documento (limite de 1 MB).
  static const _maxFotoBytes = 700 * 1024;

  late TipoReporte _tipo = widget.tipoInicial ?? TipoReporte.bache;
  final _descripcion = TextEditingController();
  Uint8List? _foto;
  Punto? _punto;
  bool _buscandoUbicacion = false;
  bool _enviando = false;

  // La ubicacion se pide al tocar, no al abrir: Servicios se construye al
  // arrancar la app (IndexedStack) y pedir permiso de GPS sin contexto
  // espanta al vecino.
  bool _pidioUbicacion = false;

  @override
  void dispose() {
    _descripcion.dispose();
    super.dispose();
  }

  /// Desde la cuadricula de servicios ("Alumbrado público" → Luminaria).
  void elegirTipo(TipoReporte tipo) => setState(() => _tipo = tipo);

  Future<void> _ubicar() async {
    _pidioUbicacion = true;
    setState(() => _buscandoUbicacion = true);
    final p = await Ubicacion.actual();
    if (mounted) {
      setState(() {
        _punto = p;
        _buscandoUbicacion = false;
      });
    }
  }

  Future<void> _tomarFoto() async {
    final fuente = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(LucideIcons.camera),
              title: const Text('Tomar foto'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(LucideIcons.image),
              title: const Text('Elegir de la galería'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            if (_foto != null)
              ListTile(
                leading: const Icon(LucideIcons.trash2, color: Colores.peligro),
                title: const Text(
                  'Quitar foto',
                  style: TextStyle(color: Colores.peligro),
                ),
                onTap: () {
                  Navigator.pop(context);
                  setState(() => _foto = null);
                },
              ),
          ],
        ),
      ),
    );
    if (fuente == null) return;

    try {
      // Se reduce en el telefono: menos datos moviles y menos costo de IA.
      final archivo = await ImagePicker().pickImage(
        source: fuente,
        maxWidth: 1000,
        maxHeight: 1000,
        imageQuality: 70,
      );
      if (archivo == null) return;
      final bytes = await archivo.readAsBytes();
      if (!mounted) return;
      if (bytes.length > _maxFotoBytes) {
        _aviso('La foto es muy pesada. Intenta con otra.');
        return;
      }
      setState(() => _foto = bytes);
      if (!_pidioUbicacion) _ubicar();
    } catch (_) {
      _aviso('No pudimos abrir la cámara. Revisa los permisos de la app.');
    }
  }

  void _aviso(String texto) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(texto)));
  }

  Colonia? get _colonia {
    final id = context.read<Sesion>().perfil?.coloniaId;
    return widget.colonias.where((c) => c.id == id).firstOrNull;
  }

  Future<void> _enviar() async {
    final perfil = context.read<Sesion>().perfil;
    if (perfil == null) return;
    setState(() => _enviando = true);
    try {
      final reporte = await context.read<Repositorio>().enviarReporte(
        NuevoReporte(
          tipo: _tipo,
          coloniaId: perfil.coloniaId,
          descripcion: _descripcion.text.trim(),
          fotoJpeg: _foto,
          lat: _punto?.lat,
          lng: _punto?.lng,
        ),
        perfil,
      );
      await Hapticos.exito();
      if (!mounted) return;
      setState(() => _enviando = false);
      await mostrarReporteEnviado(context, reporte);
      if (!mounted) return;
      setState(() {
        _foto = null;
        _descripcion.clear();
      });
    } catch (e) {
      if (mounted) {
        _aviso(
          'No se pudo enviar el reporte. Revisa tu conexión e intenta de nuevo.',
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final colonia = _colonia;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colores.fondoTarjeta,
        borderRadius: BorderRadius.circular(Medidas.radioModulo),
        border: Border.all(color: Colores.borde),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Reporte ciudadano', style: Tipografia.titulo),
          const SizedBox(height: 3),
          Text('Con foto, GPS y folio de seguimiento', style: Tipografia.micro),
          const SizedBox(height: 16),
          Text('TIPO DE REPORTE', style: Tipografia.etiqueta),
          const SizedBox(height: 9),
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              for (final t in TipoReporte.values)
                GestureDetector(
                  onTap: () => setState(() => _tipo = t),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: t == _tipo ? primary : Colores.fondoSutil,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      t.etiqueta,
                      style: Tipografia.micro.copyWith(
                        color: t == _tipo
                            ? Colores.textoInverso
                            : Colores.textoSecundario,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _CajaFoto(foto: _foto, alTocar: _tomarFoto),
          const SizedBox(height: 12),
          TextField(
            controller: _descripcion,
            minLines: 1,
            maxLines: 3,
            maxLength: 280,
            textCapitalization: TextCapitalization.sentences,
            style: Tipografia.leyenda.copyWith(color: Colores.textoPrimario),
            decoration: InputDecoration(
              isDense: true,
              counterText: '',
              hintText: 'Cuéntanos qué pasa (opcional)',
              hintStyle: Tipografia.leyenda,
              filled: true,
              fillColor: Colores.fondoSutil,
              contentPadding: const EdgeInsets.all(13),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(13),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(13),
                borderSide: BorderSide(color: primary, width: 1.6),
              ),
            ),
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _buscandoUbicacion ? null : _ubicar,
            borderRadius: BorderRadius.circular(13),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
              decoration: BoxDecoration(
                color: Colores.soft,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Row(
                children: [
                  if (_buscandoUbicacion)
                    SizedBox(
                      width: 19,
                      height: 19,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: primary,
                      ),
                    )
                  else
                    Icon(LucideIcons.mapPin, size: 19, color: primary),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _buscandoUbicacion
                              ? 'Buscando ubicación…'
                              : _punto != null
                              ? 'Ubicación detectada'
                              : _pidioUbicacion
                              ? 'Sin ubicación GPS'
                              : 'Agregar ubicación',
                          style: Tipografia.subtitulo,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            if (_punto != null)
                              _punto!.texto
                            else if (!_buscandoUbicacion)
                              _pidioUbicacion
                                  ? 'Toca para intentar de nuevo'
                                  : 'Toca para usar tu GPS',
                            if (colonia != null) colonia.nombre,
                          ].join(' · '),
                          style: Tipografia.micro,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          BotonPrimario(
            texto: 'Enviar reporte',
            icono: LucideIcons.send,
            relleno: 14,
            cargando: _enviando,
            alPresionar: _enviar,
          ),
        ],
      ),
    );
  }
}

class _CajaFoto extends StatelessWidget {
  const _CajaFoto({required this.foto, required this.alTocar});

  final Uint8List? foto;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final f = foto;
    return GestureDetector(
      onTap: alTocar,
      child: CustomPaint(
        foregroundPainter: f == null ? _BordePunteado() : null,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Medidas.radioBoton),
          child: Container(
            height: f == null ? 96 : 180,
            width: double.infinity,
            color: Colores.fondoSutil,
            child: f == null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        LucideIcons.camera,
                        size: 26,
                        color: Colores.textoSecundario,
                      ),
                      const SizedBox(height: 9),
                      Text(
                        'Toca para agregar una foto',
                        style: Tipografia.micro,
                      ),
                    ],
                  )
                : Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.memory(f, fit: BoxFit.cover),
                      Positioned(
                        right: 10,
                        bottom: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            'Cambiar foto',
                            style: Tipografia.micro.copyWith(
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// Borde punteado de 1.5 px del Figma ("Adjuntar foto").
class _BordePunteado extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final pintura = Paint()
      ..color = Colores.bordePunteado
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final ruta = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          const Radius.circular(Medidas.radioBoton),
        ),
      );
    for (final metrica in ruta.computeMetrics()) {
      var d = 0.0;
      while (d < metrica.length) {
        canvas.drawPath(metrica.extractPath(d, d + 5), pintura);
        d += 9;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
