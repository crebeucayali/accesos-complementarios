# Etapa 2: contraste de estadísticas de descargas MEA
Fecha de auditoría: 10 de noviembre de 2026 (hora de Perú).

## Resultado de producción (solo lectura)
- Tabla `eva_recursos_api.mea_acciones_diarias`: 0 filas, 0 acciones acumuladas; sin fechas de evento.
- Tabla `eva_recursos_api.mea_eventos_recientes`: 0 claves temporales.
- Contadores independientes de visitas: `__eva__=1240` sesiones, `mea=413` visitas acumuladas en el momento de la consulta.
- La ausencia de registros no demuestra un fallo de instrumentación: no consta una exportación genuina realizada después de su despliegue.
- No se insertaron datos sintéticos en la base real.

## Seguridad comprobada
- Ambas tablas `eva_recursos_api` tienen RLS habilitado sin SELECT directo para `anon` ni `authenticated`.
- `public.registrar_accion_recurso_mea` es invocadora (no SECURITY DEFINER) y accesible por el registro anónimo.
- `public.admin_estadisticas_recursos_mea` es invocadora, sin permiso de ejecución para `anon`; la función interna exige autorización master MFA AAL2.
- Clave primaria agregada `fecha,herramienta,formato,accion`; registro efímero deduplicado por UUID.

## Validación de despliegue no invasiva
GitHub Actions 42948794424, exitosa:
- Las 6 páginas HTML instrumentadas responden HTTP 200 en GitHub Pages e incluyen el cliente de métricas.
- `estadisticas/recursos-mea.js?v=1` responde 200, contiene el nombre del RPC esperado.
- `OPTIONS` al RPC Supabase responde 200, permite `POST`, origen `*` y cabeceras `apikey,content-type`.
- No se envió ninguna petición POST ni se dispararon descargas en esta prueba.

## Contraste SQL en PostgreSQL temporal
GitHub Actions 42948940893, exitosa:
- 7 combinaciones autorizadas -> 7 registros agregados, total 7, siete UUID únicas.
- Una solicitud repetida con la misma UUID no agregó una octava acción.
- Fechas calculadas con zona horaria `America/Lima`.
- Consultas administrativas sin autorización se rechazaron.
- Estas cifras son pruebas de laboratorio y jamás deben mezclarse con métricas institucionales.

## Cómo completar la verificación real sin inventar datos
1. Desde una página publicada de MEA, una persona responsable ejecuta **una descarga real voluntaria** de un recurso, preferentemente pictograma PNG (recurso disponible sin ingresar información personal).
2. Anota herramienta, formato y hora aproximada de Perú; no registra el contenido buscado ni aporta datos personales.
3. Se consulta en modo solo lectura la tabla de agregados de MEA para identificar `fecha/herramienta/formato/accion` y comprobar el incremento frente al valor previo. Evitar atribuir un cambio a esa descarga cuando existe tráfico concurrente.
4. Repetir para los otros formatos solo si se necesita certificar el flujo de cada herramienta en producción. Las exportaciones genuinas son eventos reales, no "datos de prueba" inventados.
5. Confirmar que la descarga funciona aun cuando el registro falle en condiciones controladas no productivas.

## Decisión de cierre
**Etapa 2 técnicamente validada; contraste de una acción real todavía pendiente** porque hay 0 eventos de producción al corte. No declarar el circuito extremo a extremo confirmado ni crear cifras artificiales para completar el panel. La fase 3 del panel debe mostrar "Sin acciones registradas" cuando corresponda, y mantener siempre separados los contadores de visitas.
