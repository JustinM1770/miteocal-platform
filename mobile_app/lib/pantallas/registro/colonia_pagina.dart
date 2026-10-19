import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/colonia.dart';
import '../../datos/modelos/perfil.dart';
import '../../datos/repositorio.dart';
import '../../datos/sesion.dart';
import '../../nucleo/servicios/ubicacion.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';
import '../../nucleo/widgets/campos.dart';
import '../../nucleo/widgets/hoja_colonias.dart';
import 'flujo_registro.dart';

/// 12 · Colonia detectada
///
/// Con GPS dentro del municipio propone la colonia mas cercana. Si el vecino
/// no dio ubicacion (o esta fuera, por ejemplo un paisano), se la pide.
class ColoniaPagina extends StatefulWidget {
  const ColoniaPagina({super.key, required this.borrador});

  final BorradorRegistro borrador;

  @override
  State<ColoniaPagina> createState() => _ColoniaPaginaState();
}

class _ColoniaPaginaState extends State<ColoniaPagina> {
  List<Colonia> _colonias = const [];
  Colonia? _colonia;
  bool _detectada = false;
  bool _cargando = true;
  bool _guardando = false;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final colonias = await context.read<Repositorio>().colonias();
    final punto = widget.borrador.punto;
    final cercana = punto == null
        ? null
        : Ubicacion.coloniaCercana(punto, colonias);
    if (!mounted) return;
    setState(() {
      _colonias = colonias;
      _colonia = cercana;
      _detectada = cercana != null;
      _cargando = false;
    });
  }

  Future<void> _cambiar() async {
    final elegida = await elegirColonia(
      context,
      colonias: _colonias,
      actualId: _colonia?.id,
    );
    if (elegida != null && mounted) {
      setState(() {
        _colonia = elegida;
        _detectada = false;
      });
    }
  }

  Future<void> _entrar() async {
    final c = _colonia;
    if (c == null) return;
    setState(() => _guardando = true);
    final b = widget.borrador;
    await context.read<Sesion>().guardar(
      Perfil(
        uid: Sesion.nuevoUid(),
        nombre: b.nombre,
        telefono: b.telefono,
        direccion: b.direccion,
        coloniaId: c.id,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = _colonia;
    final direccion = widget.borrador.direccion;

    final String titulo;
    final String detalle;
    if (_cargando) {
      titulo = 'Buscando tu colonia…';
      detalle = '';
    } else if (c == null) {
      titulo = '¿En qué colonia vives?';
      detalle = 'Así te avisamos solo de lo que pasa en tu zona.';
    } else {
      titulo = 'Tu colonia es ${c.nombre}';
      detalle = _detectada
          ? (direccion.isNotEmpty
                ? 'Detectamos tu domicilio en $direccion.'
                : 'La detectamos con tu ubicación.')
          : (direccion.isNotEmpty
                ? 'Tu domicilio: $direccion.'
                : 'Puedes cambiarla cuando quieras.');
    }

    return PantallaRegistro(
      contenido: [
        const Align(alignment: Alignment.centerLeft, child: Progreso(paso: 3)),
        const SizedBox(height: 24),
        const _MiniMapa(),
        const SizedBox(height: 24),
        Text(
          titulo,
          textAlign: TextAlign.center,
          style: Tipografia.tituloPantalla,
        ),
        if (detalle.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(detalle, textAlign: TextAlign.center, style: Tipografia.leyenda),
        ],
        if (c != null) ...[const SizedBox(height: 24), _Resumen(colonia: c)],
      ],
      acciones: c == null
          ? [
              BotonPrimario(
                texto: 'Elegir mi colonia',
                alPresionar: _cargando ? null : _cambiar,
              ),
            ]
          : [
              BotonPrimario(
                texto: 'Entrar a MiTeocal',
                cargando: _guardando,
                alPresionar: _entrar,
              ),
              const SizedBox(height: 6),
              BotonTexto(
                texto: _detectada
                    ? 'No es correcto, cambiar colonia'
                    : 'Cambiar colonia',
                alPresionar: _cambiar,
              ),
            ],
    );
  }
}

class _Resumen extends StatelessWidget {
  const _Resumen({required this.colonia});

  final Colonia colonia;

  @override
  Widget build(BuildContext context) {
    final datos = <(IconData, String)>[
      if (colonia.pozo.isNotEmpty)
        (LucideIcons.droplet, 'Te abastece el pozo ${colonia.pozo}'),
      if (colonia.basura.isNotEmpty)
        (LucideIcons.truck, 'Basura: ${colonia.basura.toLowerCase()}'),
      if (colonia.escuelas > 0)
        (
          LucideIcons.graduationCap,
          colonia.escuelas == 1
              ? '1 escuela cerca de tu domicilio'
              : '${colonia.escuelas} escuelas cerca de tu domicilio',
        ),
    ];
    if (datos.isEmpty) return const SizedBox.shrink();
    final primary = Theme.of(context).colorScheme.primary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colores.fondoSutil,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          for (var i = 0; i < datos.length; i++) ...[
            if (i > 0) const SizedBox(height: 12),
            Row(
              children: [
                Icon(datos[i].$1, size: 19, color: primary),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    datos[i].$2,
                    style: Tipografia.leyenda.copyWith(
                      color: Colores.textoPrimario,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Ilustracion de calles del Figma (no es un mapa real).
class _MiniMapa extends StatelessWidget {
  const _MiniMapa();

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    const manzana = Color(0xFFDFE3EA);
    Widget bloque(double h) => Container(
      height: h,
      decoration: BoxDecoration(
        color: manzana,
        borderRadius: BorderRadius.circular(5),
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 178,
        color: const Color(0xFFEDEFF3),
        child: Stack(
          children: [
            const Positioned(
              left: 0,
              right: 0,
              top: 72,
              child: SizedBox(
                height: 12,
                child: ColoredBox(color: Colors.white),
              ),
            ),
            const Positioned(
              left: 0,
              right: 0,
              top: 132,
              child: SizedBox(
                height: 10,
                child: ColoredBox(color: Colors.white),
              ),
            ),
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        children: [
                          bloque(48),
                          const SizedBox(height: 32),
                          bloque(28),
                          const SizedBox(height: 30),
                          bloque(16),
                        ],
                      ),
                    ),
                    const SizedBox(width: 36),
                    Expanded(
                      child: Column(
                        children: [
                          bloque(48),
                          const SizedBox(height: 32),
                          bloque(28),
                          const SizedBox(height: 30),
                          bloque(16),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Align(
              alignment: Alignment.center,
              child: SizedBox(
                width: 12,
                height: 178,
                child: ColoredBox(color: Colors.white),
              ),
            ),
            Align(
              alignment: const Alignment(0, -0.13),
              child: Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: primary.withValues(alpha: 0.18),
                ),
                alignment: Alignment.center,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: primary,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
