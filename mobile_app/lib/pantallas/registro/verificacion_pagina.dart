import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../nucleo/tema/tema.dart';
import '../../nucleo/widgets/botones.dart';
import '../../nucleo/widgets/campos.dart';
import 'colonia_pagina.dart';
import 'flujo_registro.dart';

/// 11 · Verificación SMS
///
/// TODO(Firebase Auth): hoy acepta cualquier codigo de 4 digitos (demo).
/// Con Auth: verifyPhoneNumber() al entrar y PhoneAuthProvider.credential()
/// al verificar. Firebase manda 6 digitos; [digitos] se cambia a 6 entonces.
class VerificacionPagina extends StatefulWidget {
  const VerificacionPagina({super.key, required this.borrador});

  final BorradorRegistro borrador;

  static const digitos = 4;

  @override
  State<VerificacionPagina> createState() => _VerificacionPaginaState();
}

class _VerificacionPaginaState extends State<VerificacionPagina> {
  final _codigo = TextEditingController();
  final _foco = FocusNode();
  Timer? _reloj;
  int _segundos = 45;

  @override
  void initState() {
    super.initState();
    _iniciarReloj();
    WidgetsBinding.instance.addPostFrameCallback((_) => _foco.requestFocus());
  }

  void _iniciarReloj() {
    _reloj?.cancel();
    setState(() => _segundos = 45);
    _reloj = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_segundos <= 1) t.cancel();
      if (mounted) setState(() => _segundos--);
    });
  }

  @override
  void dispose() {
    _reloj?.cancel();
    _codigo.dispose();
    _foco.dispose();
    super.dispose();
  }

  String get _telefonoBonito {
    final t = widget.borrador.telefono;
    if (t.length != 10) return '+52 $t';
    return '+52 ${t.substring(0, 3)} ${t.substring(3, 6)} ${t.substring(6)}';
  }

  void _verificar() {
    _foco.unfocus();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ColoniaPagina(borrador: widget.borrador),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final codigo = _codigo.text;
    const n = VerificacionPagina.digitos;

    return PantallaRegistro(
      contenido: [
        const Row(
          children: [BotonVolver(), SizedBox(width: 12), Progreso(paso: 2)],
        ),
        const SizedBox(height: 28),
        Text('Verifica tu teléfono', style: Tipografia.tituloPantalla),
        const SizedBox(height: 8),
        Text(
          'Enviamos un código de $n dígitos al $_telefonoBonito',
          style: Tipografia.leyenda,
        ),
        const SizedBox(height: 28),
        // Un solo campo invisible recibe el teclado; las cajas solo dibujan.
        GestureDetector(
          onTap: () => _foco.requestFocus(),
          child: Stack(
            children: [
              Row(
                children: [
                  for (var i = 0; i < n; i++) ...[
                    if (i > 0) const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        height: 64,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: i == codigo.length
                              ? Colors.white
                              : Colores.fondoSutil,
                          borderRadius: BorderRadius.circular(
                            Medidas.radioBoton,
                          ),
                          border: i == codigo.length
                              ? Border.all(color: primary, width: 1.8)
                              : null,
                        ),
                        child: i < codigo.length
                            ? Text(codigo[i], style: Tipografia.tituloPantalla)
                            : i == codigo.length
                            ? Container(width: 2, height: 24, color: primary)
                            : null,
                      ),
                    ),
                  ],
                ],
              ),
              Positioned.fill(
                child: Opacity(
                  opacity: 0,
                  child: TextField(
                    controller: _codigo,
                    focusNode: _foco,
                    keyboardType: TextInputType.number,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(n),
                    ],
                    onChanged: (v) {
                      setState(() {});
                      if (v.length == n) _verificar();
                    },
                    showCursor: false,
                    enableInteractiveSelection: false,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Center(
          child: _segundos > 0
              ? Text(
                  'Reenviar código en 0:${_segundos.toString().padLeft(2, '0')}',
                  style: Tipografia.micro,
                )
              : GestureDetector(
                  onTap: _iniciarReloj,
                  child: Text(
                    'Reenviar código',
                    style: Tipografia.micro.copyWith(color: primary),
                  ),
                ),
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(
            'Modo demo: escribe cualquier código',
            style: Tipografia.micro,
          ),
        ),
      ],
      acciones: [
        BotonPrimario(
          texto: 'Verificar',
          alPresionar: codigo.length == n ? _verificar : null,
        ),
      ],
    );
  }
}
