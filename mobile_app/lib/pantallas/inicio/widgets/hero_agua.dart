import 'package:flutter/material.dart';

import '../../../datos/modelos/agua.dart';
import '../../../datos/modelos/colonia.dart';
import '../../../nucleo/tema/tema.dart';

/// Tarjeta principal de Inicio ("Hero · Agua"). Es lo primero que ve un
/// vecino al abrir la app, asi que tiene que verse bien tambien sin dato.
class HeroAgua extends StatelessWidget {
  const HeroAgua({
    super.key,
    required this.estado,
    required this.color,
    this.colonia,
  });

  /// null = el municipio todavia no publico el estado de hoy.
  final EstadoAgua? estado;
  final Color color;

  /// Colonia del vecino: su horario y su pozo, si el municipio los capturo.
  final Colonia? colonia;

  @override
  Widget build(BuildContext context) {
    final e = estado;
    if (e == null) return const _SinPublicar();

    final c = colonia;
    final horario = c != null && c.horarioAgua.isNotEmpty
        ? c.horarioAgua
        : e.horario;
    final origen = c == null
        ? ''
        : c.pozo.isNotEmpty
        ? 'Pozo ${c.pozo} · abastece ${c.nombre}'
        : c.nombre;

    final titulo = e.activo
        ? horario
        : e.sinDato
        ? 'Sin informacion del pozo'
        : e.horaEstimada != null
        ? 'Vuelve hoy ~${e.horaEstimada}'
        : 'Sin servicio';

    final hayMetricas =
        e.activo &&
        (e.presion > 0 || e.calidad.isNotEmpty || e.cobertura.isNotEmpty);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Medidas.radioHero),
        color: e.activo
            ? null
            : e.sinDato
            ? Colores.textoSecundario
            : Colores.fondoInverso,
        gradient: e.activo
            ? LinearGradient(
                begin: const Alignment(-0.6, -1),
                end: const Alignment(0.6, 1),
                colors: [
                  color,
                  Color.lerp(color, Colores.primaryOscuro, 0.85)!,
                ],
              )
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'AGUA POTABLE',
                style: Tipografia.etiqueta.copyWith(
                  color: Colors.white.withValues(alpha: 0.62),
                ),
              ),
              _Insignia(activo: e.activo, sinDato: e.sinDato),
            ],
          ),
          const SizedBox(height: 18),
          Text(titulo, style: Tipografia.display.copyWith(color: Colors.white)),
          if (e.activo && origen.isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              origen,
              style: Tipografia.leyenda.copyWith(
                color: Colors.white.withValues(alpha: 0.68),
              ),
            ),
          ],
          if (e.mensaje.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              e.mensaje,
              style: Tipografia.leyenda.copyWith(
                color: Colors.white.withValues(alpha: 0.85),
              ),
            ),
          ],
          if (hayMetricas) ...[
            const SizedBox(height: 18),
            Container(height: 1, color: Colors.white.withValues(alpha: 0.18)),
            const SizedBox(height: 18),
            Row(
              children: [
                _Metrica(
                  etiqueta: 'Presión',
                  valor: e.presion > 0 ? '${e.presion} bar' : '—',
                ),
                _Metrica(
                  etiqueta: 'Calidad',
                  valor: e.calidad.isNotEmpty ? e.calidad : '—',
                ),
                _Metrica(
                  etiqueta: 'Cobertura',
                  valor: e.cobertura.isNotEmpty ? e.cobertura : '—',
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Insignia extends StatelessWidget {
  const _Insignia({required this.activo, this.sinDato = false});

  final bool activo;
  final bool sinDato;

  @override
  Widget build(BuildContext context) {
    final punto = activo
        ? const Color(0xFF4ADE80)
        : sinDato
        ? Colors.white70
        : const Color(0xFFF87171);
    return Container(
      padding: const EdgeInsets.fromLTRB(9, 5, 11, 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: punto, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            activo
                ? 'Servicio activo'
                : sinDato
                ? 'Sin dato'
                : 'Sin servicio',
            style: Tipografia.micro.copyWith(
              color: Colors.white.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metrica extends StatelessWidget {
  const _Metrica({required this.etiqueta, required this.valor});

  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            valor,
            style: Tipografia.titulo.copyWith(color: Colors.white),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            etiqueta,
            style: Tipografia.micro.copyWith(
              color: Colors.white.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}

/// Estado vacio honesto: la app va a lanzar con datos incompletos, y una
/// tarjeta en blanco se lee como app rota.
class _SinPublicar extends StatelessWidget {
  const _SinPublicar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colores.fondoSutil,
        borderRadius: BorderRadius.circular(Medidas.radioHero),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('AGUA POTABLE', style: Tipografia.etiqueta),
          const SizedBox(height: 10),
          Text(
            'El municipio aun no publica el estado de hoy.',
            style: Tipografia.cuerpo,
          ),
          const SizedBox(height: 4),
          Text('Te avisamos en cuanto lo publique.', style: Tipografia.micro),
        ],
      ),
    );
  }
}
