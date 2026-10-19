import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';
import '../../nucleo/widgets/campos.dart';
import 'datos_pagina.dart';
import 'flujo_registro.dart';

/// 09 · Bienvenida
class BienvenidaPagina extends StatelessWidget {
  const BienvenidaPagina({super.key});

  void _continuar(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DatosPagina(borrador: BorradorRegistro()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PantallaRegistro(
      contenido: [
        const SizedBox(height: 56),
        Align(
          alignment: Alignment.centerLeft,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.asset(
              'assets/imagenes/escudo.jpg',
              width: 78,
              height: 85,
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 28),
        Text('MiTeocal', style: Tipografia.display),
        const SizedBox(height: 10),
        SizedBox(
          width: 300,
          child: Text(
            'Lo que pasa en tu colonia, antes de que te afecte.',
            style: Tipografia.cuerpoNormal.copyWith(
              color: Colores.textoSecundario,
            ),
          ),
        ),
        const SizedBox(height: 38),
        const _Beneficio(
          icono: LucideIcons.droplet,
          titulo: 'Agua en tiempo real',
          detalle: 'Por qué no hay y a qué hora vuelve',
        ),
        const SizedBox(height: 18),
        const _Beneficio(
          icono: LucideIcons.truck,
          titulo: 'Camión de basura en vivo',
          detalle: 'Sabe cuándo pasa por tu calle',
        ),
        const SizedBox(height: 18),
        const _Beneficio(
          icono: LucideIcons.bell,
          titulo: 'Avisos de tu zona',
          detalle: 'Cierres de calles y escuelas',
        ),
      ],
      acciones: [
        BotonPrimario(
          texto: 'Crear mi cuenta',
          alPresionar: () => _continuar(context),
        ),
        const SizedBox(height: 8),
        // TODO(Firebase Auth): entrar con el telefono a una cuenta existente.
        // Mientras tanto lleva al mismo registro.
        BotonTexto(
          texto: 'Ya tengo cuenta',
          alPresionar: () => _continuar(context),
        ),
      ],
    );
  }
}

class _Beneficio extends StatelessWidget {
  const _Beneficio({
    required this.icono,
    required this.titulo,
    required this.detalle,
  });

  final IconData icono;
  final String titulo;
  final String detalle;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CuadroIcono(icono: icono),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(titulo, style: Tipografia.subtitulo),
              const SizedBox(height: 2),
              Text(detalle, style: Tipografia.micro),
            ],
          ),
        ),
      ],
    );
  }
}
