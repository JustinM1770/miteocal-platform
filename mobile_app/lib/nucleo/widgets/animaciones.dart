import 'package:flutter/material.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Lista escalonada (staggered entrance)
// ─────────────────────────────────────────────────────────────────────────────

/// Anima sus hijos con fade + slide-up escalonado.
///
/// Cada hijo entra con 60 ms de retraso respecto al anterior.
/// Ideal para cuadrículas de módulos, listas de noticias y accesos directos.
class ListaEscalonada extends StatefulWidget {
  const ListaEscalonada({super.key, required this.children});
  final List<Widget> children;

  @override
  State<ListaEscalonada> createState() => _ListaEscalonadaState();
}

class _ListaEscalonadaState extends State<ListaEscalonada>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    final enPruebas =
        WidgetsBinding.instance.runtimeType.toString().contains('Test');
    _controller = AnimationController(
      vsync: this,
      duration: enPruebas
          ? Duration.zero
          : Duration(milliseconds: 300 + (widget.children.length * 60)),
    );
    if (enPruebas) {
      _controller.value = 1.0;
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final n = widget.children.length;
    if (n == 0) return const SizedBox.shrink();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < n; i++)
          _ElementoEscalonado(
            controller: _controller,
            indice: i,
            total: n,
            child: widget.children[i],
          ),
      ],
    );
  }
}

class _ElementoEscalonado extends StatelessWidget {
  const _ElementoEscalonado({
    required this.controller,
    required this.indice,
    required this.total,
    required this.child,
  });

  final AnimationController controller;
  final int indice;
  final int total;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final inicio = (indice * 0.6) / total;
    final fin = inicio + 0.4;
    final curva = CurvedAnimation(
      parent: controller,
      curve: Interval(inicio, fin.clamp(0.0, 1.0), curve: Curves.easeOutCubic),
    );

    return FadeTransition(
      opacity: curva,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 0.08),
          end: Offset.zero,
        ).animate(curva),
        child: child,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transición de detalle (tarjeta → página)
// ─────────────────────────────────────────────────────────────────────────────

/// Ruta con transición fade + slide-up suave para abrir detalles.
Route<T> transicionDetalle<T>(Widget pagina) {
  return PageRouteBuilder<T>(
    pageBuilder: (_, _, _) => pagina,
    transitionDuration: const Duration(milliseconds: 350),
    reverseTransitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (_, anim, _, child) {
      final curva = CurvedAnimation(
        parent: anim,
        curve: Curves.easeOutCubic,
      );
      return FadeTransition(
        opacity: curva,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.04),
            end: Offset.zero,
          ).animate(curva),
          child: child,
        ),
      );
    },
  );
}
