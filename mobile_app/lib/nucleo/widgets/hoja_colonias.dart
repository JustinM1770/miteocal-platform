import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../datos/modelos/colonia.dart';
import '../tema/tema.dart';

/// "07 · Selector de colonia": hoja inferior con la lista de colonias.
/// Devuelve la colonia elegida, o null si el vecino la cierra.
Future<Colonia?> elegirColonia(
  BuildContext context, {
  required List<Colonia> colonias,
  String? actualId,
}) {
  return showModalBottomSheet<Colonia>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colores.fondoTarjeta,
    barrierColor: const Color(0x730A0D12),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
    ),
    builder: (_) => _HojaColonias(colonias: colonias, actualId: actualId),
  );
}

class _HojaColonias extends StatefulWidget {
  const _HojaColonias({required this.colonias, this.actualId});

  final List<Colonia> colonias;
  final String? actualId;

  @override
  State<_HojaColonias> createState() => _HojaColoniasState();
}

class _HojaColoniasState extends State<_HojaColonias> {
  final _buscar = TextEditingController();

  @override
  void dispose() {
    _buscar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _buscar.text.trim().toLowerCase();
    final visibles = widget.colonias
        .where((c) => q.isEmpty || c.nombre.toLowerCase().contains(q))
        .toList();

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.62,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scroll) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colores.manija,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Elige tu colonia', style: Tipografia.titulo),
            const SizedBox(height: 3),
            Text(
              'El horario de agua cambia según la zona',
              style: Tipografia.micro,
            ),
            if (widget.colonias.length > 6) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _buscar,
                onChanged: (_) => setState(() {}),
                style: Tipografia.cuerpoNormal,
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Buscar colonia o barrio',
                  hintStyle: Tipografia.cuerpoNormal.copyWith(
                    color: Colores.textoSecundario,
                  ),
                  prefixIcon: const Icon(
                    LucideIcons.search,
                    size: 18,
                    color: Colores.textoSecundario,
                  ),
                  filled: true,
                  fillColor: Colores.fondoSutil,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Medidas.radioBoton),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Expanded(
              child: ListView.separated(
                controller: scroll,
                padding: const EdgeInsets.only(bottom: 30),
                itemCount: visibles.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, i) => _FilaColonia(
                  colonia: visibles[i],
                  elegida: visibles[i].id == widget.actualId,
                  alTocar: () => Navigator.of(context).pop(visibles[i]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilaColonia extends StatelessWidget {
  const _FilaColonia({
    required this.colonia,
    required this.elegida,
    required this.alTocar,
  });

  final Colonia colonia;
  final bool elegida;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final detalle = colonia.horarioAgua.isNotEmpty
        ? colonia.horarioAgua
        : colonia.tipo;
    return Material(
      color: elegida ? Colores.soft : Colores.fondoSutil,
      borderRadius: BorderRadius.circular(Medidas.radioBoton),
      child: InkWell(
        borderRadius: BorderRadius.circular(Medidas.radioBoton),
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      colonia.nombre,
                      style: Tipografia.subtitulo.copyWith(
                        color: elegida ? primary : Colores.textoPrimario,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(detalle, style: Tipografia.micro),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (elegida)
                Icon(LucideIcons.check, size: 20, color: primary)
              else
                Container(
                  width: 19,
                  height: 19,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colores.bordePunteado,
                      width: 1.5,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
