import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../datos/modelos/contenido.dart';
import '../../datos/repositorio.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/comunes.dart';

/// 06 · Paisanos (Hijos Ausentes): transmision en vivo, tramites a
/// distancia y negocios que envian a la familia.
class PaisanosPagina extends StatefulWidget {
  const PaisanosPagina({super.key, this.municipio = ''});

  final String municipio;

  @override
  State<PaisanosPagina> createState() => _PaisanosPaginaState();
}

class _PaisanosPaginaState extends State<PaisanosPagina> {
  late final Repositorio _repo = context.read<Repositorio>();

  @override
  Widget build(BuildContext context) {
    final m = widget.municipio;
    return PantallaModulo(
      titulo: 'Paisanos',
      subtitulo: 'Hijos Ausentes${m.isNotEmpty ? ' de $m' : ''}',
      hijos: [
        Cargar<Transmision?>(
          futuro: _repo.transmisionEnVivo,
          builder: (context, t) => t == null
              ? const SizedBox.shrink()
              : Lateral(
                  child: _EnVivo(transmision: t, municipio: m),
                ),
        ),
        Cargar<ComunidadPaisana?>(
          futuro: _repo.comunidadPaisana,
          builder: (context, c) => c == null
              ? const SizedBox.shrink()
              : Lateral(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 13,
                    ),
                    decoration: BoxDecoration(
                      color: Colores.soft,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.globe,
                          size: 20,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 11),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_miles(c.conectados)} paisanos conectados',
                                style: Tipografia.subtitulo,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Principalmente desde ${_lista(c.estados)}',
                                style: Tipografia.micro,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const TituloSeccion(titulo: 'Trámites a distancia'),
            const SizedBox(height: 14),
            for (final (icono, titulo, detalle) in const [
              (
                LucideIcons.fileText,
                'Actas de nacimiento y matrimonio',
                'Solicita en línea, envío a EE. UU.',
              ),
              (
                LucideIcons.squareUser,
                'Pasaportes y apostillas',
                'Agenda en el consulado más cercano',
              ),
              (
                LucideIcons.creditCard,
                'Pago de predial desde el extranjero',
                'Con tarjeta internacional',
              ),
            ]) ...[
              Lateral(
                child: TarjetaBorde(
                  relleno: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 13,
                  ),
                  alTocar: () => avisoPronto(context, titulo),
                  child: Row(
                    children: [
                      CuadroIconoChico(icono: icono),
                      const SizedBox(width: 12),
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
                      const Icon(
                        LucideIcons.chevronRight,
                        size: 16,
                        color: Colores.textoSecundario,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
        Cargar<List<Comercio>>(
          futuro: _repo.comercios,
          builder: (context, todos) {
            final envian = (todos ?? const <Comercio>[])
                .where((c) => c.enviosAlExtranjero)
                .toList();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TituloSeccion(titulo: 'Envía a tu familia'),
                const SizedBox(height: 14),
                if (envian.isEmpty)
                  const Vacio(
                    texto:
                        'Pronto verás aquí negocios que entregan a tu familia.',
                  )
                else
                  for (final c in envian) ...[
                    Lateral(child: _NegocioEnvio(comercio: c)),
                    const SizedBox(height: 10),
                  ],
              ],
            );
          },
        ),
      ],
    );
  }

  static String _miles(int n) => n.toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );

  static String _lista(List<String> l) => l.length <= 1
      ? l.join()
      : '${l.sublist(0, l.length - 1).join(', ')} y ${l.last}';
}

class CuadroIconoChico extends StatelessWidget {
  const CuadroIconoChico({super.key, required this.icono});
  final IconData icono;

  @override
  Widget build(BuildContext context) => Container(
    width: 38,
    height: 38,
    decoration: BoxDecoration(
      color: Colores.soft,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Icon(icono, size: 20, color: Theme.of(context).colorScheme.primary),
  );
}

class _EnVivo extends StatelessWidget {
  const _EnVivo({required this.transmision, required this.municipio});

  final Transmision transmision;
  final String municipio;

  @override
  Widget build(BuildContext context) {
    final t = transmision;
    return TarjetaBorde(
      relleno: EdgeInsets.zero,
      radio: Medidas.radioModulo,
      alTocar: () async {
        final url = t.url;
        if (url == null ||
            !await launchUrl(
              Uri.parse(url),
              mode: LaunchMode.externalApplication,
            )) {
          if (context.mounted) avisoPronto(context, 'La transmisión en la app');
        }
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 176,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment(-0.5, -1),
                end: Alignment(0.5, 1),
                colors: [Color(0xFF1B212B), Color(0xFF0B0E14)],
              ),
            ),
            child: Stack(
              children: [
                if (t.enVivo)
                  Positioned(
                    left: 14,
                    top: 14,
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(9, 5, 11, 5),
                      decoration: BoxDecoration(
                        color: Colores.peligro,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'EN VIVO',
                            style: Tipografia.micro.copyWith(
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Center(
                  child: Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      LucideIcons.play,
                      size: 22,
                      color: Colores.textoPrimario,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.titulo, style: Tipografia.cuerpo),
                const SizedBox(height: 4),
                Text(
                  '${t.espectadores} personas viendo · ${t.lugar}',
                  style: Tipografia.micro,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NegocioEnvio extends StatelessWidget {
  const _NegocioEnvio({required this.comercio});

  final Comercio comercio;

  @override
  Widget build(BuildContext context) {
    final c = comercio;
    return TarjetaBorde(
      relleno: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(c.nombre, style: Tipografia.cuerpo)),
              if (c.aceptaUsd)
                const Pastilla(
                  texto: 'Acepta USD',
                  fondo: Colores.exitoSuave,
                  color: Colores.exito,
                  radio: 7,
                ),
            ],
          ),
          if (c.descripcion.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(c.descripcion, style: Tipografia.micro),
          ],
          const SizedBox(height: 12),
          BotonWhatsApp(
            numero: c.whatsapp,
            mensaje:
                'Hola, quiero enviar un pedido a mi familia en Teocaltiche.',
          ),
          if (c.qboard != null) ...[
            const SizedBox(height: 8),
            Material(
              color: Colores.fondoInverso,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => launchUrl(
                  Uri.parse(c.qboard!),
                  mode: LaunchMode.externalApplication,
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  child: Center(
                    child: Text(
                      'Qb Panel en línea',
                      style: Tipografia.subtitulo.copyWith(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
