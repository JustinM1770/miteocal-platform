import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../datos/modelos/agua.dart';
import '../../../datos/modelos/colonia.dart';
import '../../../nucleo/tema/tema.dart';
import '../../../nucleo/widgets/bento.dart';

/// Tarjeta principal de Inicio (Figma «01 · Inicio — Bento»): negra, con el
/// estado del agua de la zona del vecino. Tiene que verse bien también sin dato.
class HeroAgua extends StatelessWidget {
  const HeroAgua({
    super.key,
    required this.estado,
    required this.color,
    this.colonia,
    this.alDetalle,
  });

  /// null = el municipio todavía no publicó el estado de hoy.
  final EstadoAgua? estado;
  final Color color;
  final Colonia? colonia;
  final VoidCallback? alDetalle;

  @override
  Widget build(BuildContext context) {
    final e = estado;
    final c = colonia;
    final zona = (c?.zona.isNotEmpty ?? false)
        ? c!.zona.split(' ').first
        : c?.nombre ?? 'Tu zona';

    final (punto, estadoTxt) = e == null || e.sinDato
        ? (Colores.textoSecundario, 'Sin dato')
        : e.activo
        ? (const Color(0xFF4ADE80), 'Servicio activo')
        : (const Color(0xFFFF5A5A), 'Sin servicio');

    final horario = c != null && c.horarioAgua.isNotEmpty
        ? c.horarioAgua
        : e?.horario ?? '';
    final titulo = e == null
        ? 'Sin publicar hoy'
        : e.sinDato
        ? 'Sin información del pozo'
        : e.activo
        ? (horario.isEmpty ? 'Hay agua' : horario)
        : e.horaEstimada != null
        ? 'Vuelve hoy\n~${e.horaEstimada}'
        : 'Sin servicio';
    final detalle = e == null
        ? 'El municipio todavía no publica el estado de hoy.'
        : e.mensaje.isNotEmpty
        ? e.mensaje
        : c != null && c.pozo.isNotEmpty
        ? 'Pozo ${c.pozo} · abastece ${c.nombre}'
        : '';

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      decoration: BoxDecoration(
        color: Colores.fondoInverso,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Kicker(
                  'Agua · Zona $zona',
                  color: Colores.textoInverso.withValues(alpha: 0.6),
                ),
              ),
              Punto(punto),
              const SizedBox(width: 6),
              Text(
                estadoTxt,
                style: Tipografia.subtitulo.copyWith(
                  color: Colores.textoInverso,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            titulo,
            style: Tipografia.display.copyWith(
              color: Colores.textoInverso,
              fontSize: 40,
              height: 1.0,
              letterSpacing: -1.6,
            ),
          ),
          if (detalle.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              detalle,
              style: Tipografia.cuerpoNormal.copyWith(
                color: Colores.textoInverso.withValues(alpha: 0.65),
                fontSize: 14,
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  e?.actualizadoEn != null
                      ? 'Actualizado ${haceTiempo(e!.actualizadoEn!)}'
                      : horario.isNotEmpty
                      ? 'Horario $horario'
                      : '',
                  style: Tipografia.leyenda.copyWith(
                    color: Colores.textoInverso.withValues(alpha: 0.45),
                    fontSize: 12,
                  ),
                ),
              ),
              if (alDetalle != null)
                Material(
                  color: color,
                  borderRadius: BorderRadius.circular(99),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(99),
                    onTap: alDetalle,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 9,
                      ),
                      child: Row(
                        children: [
                          Text(
                            'Ver detalle',
                            style: Tipografia.subtitulo.copyWith(
                              color: Colores.textoInverso,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            LucideIcons.arrowUpRight,
                            size: 14,
                            color: Colores.textoInverso,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
