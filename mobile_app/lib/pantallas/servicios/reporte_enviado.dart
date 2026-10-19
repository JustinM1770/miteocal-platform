import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../datos/modelos/reporte.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';

/// 08 · Reporte enviado: modal con el folio de seguimiento.
Future<void> mostrarReporteEnviado(BuildContext context, Reporte reporte) {
  return showDialog<void>(
    context: context,
    barrierColor: const Color(0x730A0D12),
    builder: (context) => Dialog(
      backgroundColor: Colores.fondoTarjeta,
      insetPadding: const EdgeInsets.symmetric(horizontal: 32),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 62,
              height: 62,
              decoration: const BoxDecoration(
                color: Colores.exitoSuave,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                LucideIcons.check,
                size: 30,
                color: Colores.exito,
              ),
            ),
            const SizedBox(height: 16),
            Text('Reporte enviado', style: Tipografia.tituloPantalla),
            const SizedBox(height: 5),
            Text(
              'El municipio atenderá tu reporte de ${reporte.tipo.etiqueta.toLowerCase()} en ${reporte.colonia}.',
              textAlign: TextAlign.center,
              style: Tipografia.leyenda,
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: Colores.fondoSutil,
                borderRadius: BorderRadius.circular(Medidas.radioBoton),
              ),
              child: Column(
                children: [
                  Text('NÚMERO DE FOLIO', style: Tipografia.etiqueta),
                  const SizedBox(height: 4),
                  SelectableText(
                    reporte.folio,
                    style: Tipografia.tituloPantalla.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Respuesta estimada: 24 – 72 hrs',
                    style: Tipografia.micro,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            BotonPrimario(
              texto: 'Entendido',
              relleno: 14,
              alPresionar: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    ),
  );
}
