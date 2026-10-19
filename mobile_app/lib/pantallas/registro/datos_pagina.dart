import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../nucleo/servicios/ubicacion.dart';
import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';
import '../../nucleo/widgets/campos.dart';
import 'flujo_registro.dart';
import 'verificacion_pagina.dart';

/// 10 · Registro
class DatosPagina extends StatefulWidget {
  const DatosPagina({super.key, required this.borrador});

  final BorradorRegistro borrador;

  @override
  State<DatosPagina> createState() => _DatosPaginaState();
}

class _DatosPaginaState extends State<DatosPagina> {
  late final _nombre = TextEditingController(text: widget.borrador.nombre);
  late final _direccion = TextEditingController(
    text: widget.borrador.direccion,
  );
  late final _telefono = TextEditingController(text: widget.borrador.telefono);
  bool _acepta = false;
  bool _buscandoUbicacion = false;

  @override
  void dispose() {
    _nombre.dispose();
    _direccion.dispose();
    _telefono.dispose();
    super.dispose();
  }

  String get _soloDigitos => _telefono.text.replaceAll(RegExp(r'\D'), '');

  bool get _listo =>
      _nombre.text.trim().length >= 3 && _soloDigitos.length == 10 && _acepta;

  Future<void> _usarUbicacion() async {
    setState(() => _buscandoUbicacion = true);
    final punto = await Ubicacion.actual();
    if (!mounted) return;
    setState(() {
      _buscandoUbicacion = false;
      widget.borrador.punto = punto;
    });
    if (punto == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No pudimos obtener tu ubicación. Revisa que el GPS esté encendido y que la app tenga permiso.',
          ),
        ),
      );
    }
  }

  void _continuar() {
    final b = widget.borrador
      ..nombre = _nombre.text.trim()
      ..direccion = _direccion.text.trim()
      ..telefono = _soloDigitos;
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => VerificacionPagina(borrador: b)));
  }

  void _verAviso() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Aviso de privacidad', style: Tipografia.titulo),
        content: Text(
          'El municipio usa tu nombre, teléfono y colonia solo para mostrarte avisos de tu zona '
          'y dar seguimiento a tus reportes. No se venden ni se comparten con terceros. '
          'Puedes pedir que se borren en cualquier momento.\n\n'
          'El texto completo lo publica el ayuntamiento.',
          style: Tipografia.leyenda,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final punto = widget.borrador.punto;

    return PantallaRegistro(
      contenido: [
        const Row(
          children: [BotonVolver(), SizedBox(width: 12), Progreso(paso: 1)],
        ),
        const SizedBox(height: 24),
        Text(
          '¿Cómo te llamas y dónde vives?',
          style: Tipografia.tituloPantalla,
        ),
        const SizedBox(height: 8),
        Text(
          'Usamos tu dirección para mostrarte solo lo que afecta a tu calle.',
          style: Tipografia.leyenda,
        ),
        const SizedBox(height: 24),
        CampoFormulario(
          etiqueta: 'Nombre completo',
          child: Entrada(
            controlador: _nombre,
            pista: 'Ana Martínez López',
            capitalizacion: TextCapitalization.words,
            accion: TextInputAction.next,
            autocompletar: const [AutofillHints.name],
            alCambiar: (_) => setState(() {}),
          ),
        ),
        const SizedBox(height: 18),
        CampoFormulario(
          etiqueta: 'Dirección',
          child: Entrada(
            controlador: _direccion,
            pista: 'Calle y número',
            icono: LucideIcons.mapPin,
            capitalizacion: TextCapitalization.sentences,
            accion: TextInputAction.next,
            autocompletar: const [AutofillHints.streetAddressLine1],
          ),
        ),
        const SizedBox(height: 18),
        Align(
          alignment: Alignment.centerLeft,
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: _buscandoUbicacion ? null : _usarUbicacion,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_buscandoUbicacion)
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: primary,
                      ),
                    )
                  else
                    Icon(
                      punto != null
                          ? LucideIcons.circleCheck
                          : LucideIcons.locate,
                      size: 16,
                      color: primary,
                    ),
                  const SizedBox(width: 8),
                  Text(
                    _buscandoUbicacion
                        ? 'Buscando tu ubicación…'
                        : punto != null
                        ? 'Ubicación guardada · ${punto.texto}'
                        : 'Usar mi ubicación actual',
                    style: Tipografia.subtitulo.copyWith(color: primary),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        CampoFormulario(
          etiqueta: 'Teléfono',
          child: Entrada(
            controlador: _telefono,
            pista: '346 123 4567',
            prefijo: '+52',
            teclado: TextInputType.phone,
            formatos: [
              FilteringTextInputFormatter.allow(RegExp(r'[\d ]')),
              LengthLimitingTextInputFormatter(12),
            ],
            autocompletar: const [AutofillHints.telephoneNumberNational],
            alCambiar: (_) => setState(() {}),
          ),
        ),
      ],
      acciones: [
        InkWell(
          onTap: () => setState(() => _acepta = !_acepta),
          borderRadius: BorderRadius.circular(6),
          child: Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 19,
                height: 19,
                decoration: BoxDecoration(
                  color: _acepta ? primary : Colors.white,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: _acepta ? primary : Colores.bordePunteado,
                    width: 1.5,
                  ),
                ),
                child: _acepta
                    ? const Icon(
                        LucideIcons.check,
                        size: 13,
                        color: Colors.white,
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: Tipografia.micro,
                    children: [
                      const TextSpan(text: 'Acepto el '),
                      WidgetSpan(
                        alignment: PlaceholderAlignment.baseline,
                        baseline: TextBaseline.alphabetic,
                        child: GestureDetector(
                          onTap: _verAviso,
                          child: Text(
                            'aviso de privacidad',
                            style: Tipografia.micro.copyWith(
                              color: primary,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ),
                      const TextSpan(text: ' del municipio'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        BotonPrimario(
          texto: 'Continuar',
          alPresionar: _listo ? _continuar : null,
        ),
      ],
    );
  }
}
