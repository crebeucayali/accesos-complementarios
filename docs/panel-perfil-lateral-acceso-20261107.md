# Ajuste de acceso y perfil lateral del panel EVA

Fecha: 7 de noviembre de 2026 (hora de Perú).

## Cambios realizados

1. Se retiró la barra blanca redundante que mostraba "Sesión administrativa activa" y el botón de cerrar sesión en la parte superior del área de trabajo.
2. La tarjeta informativa "Acceso administrativo activo" se oculta únicamente mientras `#seccion-admin` está visible. Los mensajes de inicio de sesión, MFA, problemas de conexión y recuperación permanecen accesibles cuando no se muestra el panel.
3. Se trasladó la identificación de la cuenta al pie de la barra lateral, con icono SVG de usuario y control desplegable HTML `details/summary`. El botón real `#boton-salir` utiliza la misma función `cerrarSesion()` del sistema existente.
4. El desplegable se cierra al pulsar Escape, al hacer clic fuera o después de cerrar sesión; mantiene navegación mediante teclado y estados nativos.
5. En dispositivos móviles, la cuenta permanece al final del menú lateral.
6. Se actualizaron las versiones del CSS y JavaScript para evitar caché obsoleta.

## Conservación y seguridad

- Sin cambios en Supabase, MFA AAL2, política RLS, duración de sesiones, contraseñas, permisos, tablas ni publicaciones.
- Se mantienen los identificadores `usuario-actual` y `boton-salir` usados por `admin.js`; no se duplica el botón de cierre.
- La tarjeta de estado general se conserva para situaciones de error e inicio de sesión.
- Se comprobaron sintaxis del JavaScript, identificadores HTML únicos y referencias a permisos/MFA y salida de sesión.

## Validación humana pendiente

- Confirmar que con Master activo no se muestran tarjetas de estado duplicadas.
- Abrir el desplegable de usuario en escritorio y móvil, usar Escape, cerrarlo con clic exterior y comprobar el enfoque.
- Pulsar "Cerrar sesión" y comprobar que el formulario de ingreso vuelve a mostrarse, que las acciones privadas se ocultan y que se puede volver a iniciar sesión.
- Confirmar en cuentas con permisos limitados que la barra lateral solo presenta los módulos autorizados.

No se realizó una sesión de prueba autenticada real. No se afirma aprobación visual hasta verificarla.
