import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../tema/tema.dart';

/// Placeholders con efecto shimmer (siluetas grises pulsantes) para reemplazar
/// los CircularProgressIndicator durante la carga.
///
/// Uso: `ShimmerLista()` en vez de `CircularProgressIndicator()`.

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

/// Envoltura que aplica el efecto shimmer a sus hijos.
class PlaceholderShimmer extends StatelessWidget {
  const PlaceholderShimmer({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (WidgetsBinding.instance.runtimeType.toString().contains('Test')) {
      return Opacity(opacity: 0.6, child: child);
    }
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE8EAEE),
      highlightColor: const Color(0xFFF5F6F8),
      child: child,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloques de construcción
// ─────────────────────────────────────────────────────────────────────────────

/// Rectángulo redondeado gris (línea de texto, imagen, etc.).
class _Bloque extends StatelessWidget {
  const _Bloque({
    this.ancho = double.infinity,
    this.alto = 14,
    this.radio = 7,
  });

  final double ancho;
  final double alto;
  final double radio;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: ancho,
      height: alto,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radio),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta genérica
// ─────────────────────────────────────────────────────────────────────────────

/// Silueta de una tarjeta típica (imagen + 2 líneas de texto).
class ShimmerTarjeta extends StatelessWidget {
  const ShimmerTarjeta({super.key, this.alto = 90});
  final double alto;

  @override
  Widget build(BuildContext context) {
    return PlaceholderShimmer(
      child: Container(
        height: alto,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
          border: Border.all(color: Colores.borde),
        ),
        child: Row(
          children: [
            const _Bloque(ancho: 50, alto: 52, radio: 13),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const _Bloque(alto: 14),
                  const SizedBox(height: 8),
                  _Bloque(ancho: MediaQuery.sizeOf(context).width * 0.4),
                  const SizedBox(height: 8),
                  const _Bloque(ancho: 80, alto: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lista de tarjetas
// ─────────────────────────────────────────────────────────────────────────────

/// N tarjetas shimmer apiladas verticalmente.
class ShimmerLista extends StatelessWidget {
  const ShimmerLista({super.key, this.cantidad = 3, this.alto = 90});
  final int cantidad;
  final double alto;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (int i = 0; i < cantidad; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          ShimmerTarjeta(alto: alto),
        ],
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero del agua
// ─────────────────────────────────────────────────────────────────────────────

/// Silueta del hero de agua de la pantalla de inicio.
class ShimmerHeroAgua extends StatelessWidget {
  const ShimmerHeroAgua({super.key});

  @override
  Widget build(BuildContext context) {
    return PlaceholderShimmer(
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Medidas.radioHero),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuadrícula de módulos
// ─────────────────────────────────────────────────────────────────────────────

/// Siluetas de la cuadrícula de módulos del inicio (3 × 2).
class ShimmerModulos extends StatelessWidget {
  const ShimmerModulos({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Medidas.margenLateral),
      child: PlaceholderShimmer(
        child: LayoutBuilder(
          builder: (context, c) {
            final ancho = (c.maxWidth - 20) / 3;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: List.generate(
                6,
                (_) => SizedBox(
                  width: ancho,
                  child: Container(
                    height: 90,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(
                        Medidas.radioTarjeta,
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Noticia carrusel
// ─────────────────────────────────────────────────────────────────────────────

/// Silueta de las tarjetas de noticias en carrusel horizontal.
class ShimmerNoticias extends StatelessWidget {
  const ShimmerNoticias({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 140,
      child: PlaceholderShimmer(
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(
            horizontal: Medidas.margenLateral,
          ),
          itemCount: 3,
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (_, _) => Container(
            width: 260,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Medidas.radioTarjeta),
            ),
          ),
        ),
      ),
    );
  }
}
