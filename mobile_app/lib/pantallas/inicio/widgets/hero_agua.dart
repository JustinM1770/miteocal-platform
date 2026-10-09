import 'package:flutter/material.dart';
import '../../../datos/modelos/agua.dart';
import '../../../nucleo/tema/tema.dart';

/// Tarjeta principal de Inicio. Es lo primero que ve un vecino al abrir la
/// app, asi que tiene que verse bien tambien cuando no hay dato.
class HeroAgua extends StatelessWidget {
  const HeroAgua({super.key, required this.estado, required this.color});

  /// null = el municipio todavia no publico el estado de hoy.
  final EstadoAgua? estado;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final e = estado;
    if (e == null) return const _SinDato();

    return Container(
      padding: const EdgeInsets.all(Medidas.paddingTarjeta),
      decoration: BoxDecoration(
        color: e.activo ? color : Colores.fondoInverso,
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Agua potable',
                  style: Tipografia.cuerpo.copyWith(color: Colores.textoInverso)),
              _Insignia(activo: e.activo),
            ],
          ),
          const SizedBox(height: Medidas.e12),
          Text(
            e.activo ? e.horario : 'Sin servicio',
            style: Tipografia.titulo.copyWith(
              color: Colores.textoInverso,
              fontSize: 28,
              height: 34 / 28,
            ),
          ),
          const SizedBox(height: Medidas.e16),
          Row(
            children: [
              _Metrica(etiqueta: 'Presion', valor: '${e.presion} bar'),
              _Metrica(etiqueta: 'Calidad', valor: e.calidad),
              _Metrica(etiqueta: 'Cobertura', valor: e.cobertura),
            ],
          ),
        ],
      ),
    );
  }
}

class _Insignia extends StatelessWidget {
  const _Insignia({required this.activo});
  final bool activo;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Medidas.e8, vertical: Medidas.e4),
      decoration: BoxDecoration(
        color: activo ? Colores.exitoSuave : Colores.peligro,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        activo ? 'Servicio activo' : 'Sin servicio',
        style: Tipografia.micro.copyWith(
          color: activo ? Colores.exito : Colores.textoInverso,
          fontWeight: FontWeight.w600,
        ),
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
          Text(etiqueta,
              style: Tipografia.micro.copyWith(color: Colores.textoInverso.withValues(alpha: 0.7))),
          const SizedBox(height: 2),
          Text(valor,
              style: Tipografia.cuerpo.copyWith(color: Colores.textoInverso),
              maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

/// Estado vacio honesto: la app va a lanzar con datos incompletos, y una
/// tarjeta en blanco se lee como app rota.
class _SinDato extends StatelessWidget {
  const _SinDato();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Medidas.paddingTarjeta),
      decoration: BoxDecoration(
        color: Colores.fondoTarjeta,
        borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
        border: Border.all(color: Colores.borde),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Agua potable', style: Tipografia.cuerpo),
          const SizedBox(height: Medidas.e4),
          Text('El municipio aun no publica el estado de hoy.',
              style: Tipografia.subtitulo),
        ],
      ),
    );
  }
}
