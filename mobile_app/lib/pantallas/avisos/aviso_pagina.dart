import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../datos/modelos/aviso.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/bento.dart';
import '../../navegacion/modulos.dart';

/// Detalle de un aviso: lo que abre la notificación.
class AvisoPagina extends StatelessWidget {
  const AvisoPagina({super.key, required this.aviso});
  final Aviso aviso;

  static const _meses = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  static String _fecha(DateTime f) =>
      '${f.day} ${_meses[f.month - 1]} · ${f.hour}:${f.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final a = aviso;
    final modulo = switch (a.servicio) {
      Servicio.agua => Modulo.agua,
      Servicio.basura => Modulo.basura,
      Servicio.cierres => Modulo.cierres,
      Servicio.escuelas => Modulo.escuelas,
    };
    return PantallaBento(
      titulo: a.servicio.nombre,
      subtitulo: 'Aviso del municipio',
      hijos: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colores.fondoInverso,
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Burbuja(
                    a.servicio.icono,
                    fondo: Colores.textoInverso.withValues(alpha: 0.12),
                    color: Colores.textoInverso,
                  ),
                  const Spacer(),
                  Punto(
                    a.estado == 'sin_servicio' || a.tipo == 'cierre'
                        ? const Color(0xFFFF5A5A)
                        : const Color(0xFF4ADE80),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    a.vigencia,
                    style: Tipografia.subtitulo.copyWith(
                      color: Colores.textoInverso,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                a.titulo,
                style: Tipografia.display.copyWith(
                  color: Colores.textoInverso,
                  fontSize: 30,
                  height: 1.05,
                ),
              ),
              if (a.horaEstimada != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Vuelve hoy ~${a.horaEstimada}',
                  style: Tipografia.titulo.copyWith(
                    color: Colores.textoInverso,
                  ),
                ),
              ],
              if (a.mensaje.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  a.mensaje,
                  style: Tipografia.cuerpoNormal.copyWith(
                    color: Colores.textoInverso.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _Dato('Colonia', a.colonia ?? 'Todo el municipio')),
            const SizedBox(width: 10),
            Expanded(
              child: _Dato('Vigencia', a.vigencia.replaceFirst('Vigente ', '')),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _Dato('Publicado', _fecha(a.publicadoEn))),
            const SizedBox(width: 10),
            Expanded(child: _Dato('Servicio', a.servicio.nombre)),
          ],
        ),
        const SizedBox(height: 18),
        BotonPildora(
          'Ver ${a.servicio.nombre.toLowerCase()}',
          icono: LucideIcons.arrowUpRight,
          alTocar: () => abrirModulo(context, modulo),
        ),
      ],
    );
  }
}

class _Dato extends StatelessWidget {
  const _Dato(this.etiqueta, this.valor);
  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) => Bento(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Kicker(etiqueta),
        const SizedBox(height: 6),
        Text(
          valor,
          style: Tipografia.cuerpo.copyWith(fontWeight: FontWeight.w600),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    ),
  );
}
