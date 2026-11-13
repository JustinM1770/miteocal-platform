import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../datos/modelos/aviso.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/bento.dart';
import '../../nucleo/widgets/comunes.dart';
import 'aviso_pagina.dart';

/// Avisos: lo vigente de los cuatro servicios en la colonia del vecino, cada
/// uno con su vigencia. Lo vencido desaparece solo.
class AvisosPagina extends StatefulWidget {
  const AvisosPagina({super.key, this.colonia});

  /// Nombre de la colonia del vecino; null = todo el municipio.
  final String? colonia;

  @override
  State<AvisosPagina> createState() => _AvisosPaginaState();
}

class _AvisosPaginaState extends State<AvisosPagina> {
  late final Stream<List<Aviso>> _avisos = context.read<Repositorio>().avisos();
  Servicio? _filtro;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Aviso>>(
      stream: _avisos,
      builder: (context, snap) {
        final todos = (snap.data ?? const <Aviso>[])
            .where((a) => a.esPara(widget.colonia))
            .toList();
        final visibles = todos
            .where((a) => _filtro == null || a.servicio == _filtro)
            .toList();
        return PantallaBento(
          titulo: 'Avisos',
          subtitulo: widget.colonia == null
              ? 'Lo vigente en tu municipio'
              : 'Lo vigente en ${widget.colonia}',
          hijos: [
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _Chip(
                    texto: 'Todos · ${todos.length}',
                    activo: _filtro == null,
                    alTocar: () => setState(() => _filtro = null),
                  ),
                  for (final s in Servicio.values)
                    _Chip(
                      texto: s.nombre,
                      activo: _filtro == s,
                      alTocar: () => setState(() => _filtro = s),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (snap.connectionState == ConnectionState.waiting &&
                !snap.hasData)
              const Padding(
                padding: EdgeInsets.all(30),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (snap.hasError)
              const Vacio(
                texto: 'No se pudieron cargar los avisos. Revisa tu conexión.',
              )
            else if (visibles.isEmpty)
              Vacio(
                texto: _filtro == null
                    ? 'No hay avisos vigentes. Todo está en orden.'
                    : 'No hay avisos vigentes de ${_filtro!.nombre.toLowerCase()}.',
              )
            else
              for (final a in visibles) ...[
                TarjetaAviso(aviso: a),
                const SizedBox(height: 10),
              ],
          ],
        );
      },
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.texto,
    required this.activo,
    required this.alTocar,
  });
  final String texto;
  final bool activo;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: GestureDetector(
      onTap: alTocar,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: activo ? Colores.fondoInverso : Colores.fondoTarjeta,
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          texto,
          style: Tipografia.subtitulo.copyWith(
            color: activo ? Colores.textoInverso : Colores.textoPrimario,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    ),
  );
}

/// Un aviso en la lista: servicio, colonia, título, mensaje y vigencia.
class TarjetaAviso extends StatelessWidget {
  const TarjetaAviso({super.key, required this.aviso});
  final Aviso aviso;

  @override
  Widget build(BuildContext context) {
    final a = aviso;
    final urgente = a.estado == 'sin_servicio' || a.tipo == 'cierre';
    return Bento(
      alTocar: () => Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => AvisoPagina(aviso: a))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Burbuja(a.servicio.icono),
              const SizedBox(width: 10),
              Expanded(
                child: Kicker(
                  '${a.servicio.nombre} · ${a.colonia ?? 'Todo el municipio'}',
                ),
              ),
              Text(haceTiempo(a.publicadoEn), style: Tipografia.micro),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            a.titulo,
            style: Tipografia.cuerpo.copyWith(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
            ),
          ),
          if (a.mensaje.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              a.mensaje,
              style: Tipografia.leyenda,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Punto(urgente ? Colores.peligro : Colores.exito, tam: 6),
              const SizedBox(width: 6),
              Text(
                a.vigencia,
                style: Tipografia.micro.copyWith(
                  color: urgente ? Colores.peligro : Colores.exito,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
