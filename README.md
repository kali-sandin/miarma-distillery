# Sim Distillery

Beta privada de un juego web pixel-art de gestión de una destilería de whisky escocés.

- Beta jugable: <https://kali-sandin.github.io/miarma-distillery/>
- Repositorio: <https://github.com/kali-sandin/miarma-distillery>
- Estado: beta inicial para betatesters privados.

## Requisitos

- Navegador desktop moderno.
- Pantalla FullHD landscape. La UI está diseñada para 1920x1080 y no se garantiza compatibilidad con móvil, tablet, pantallas pequeñas ni vertical.
- Audio opcional. La música y los efectos se activan tras interacción del usuario, por las restricciones normales del navegador.

## Ejecutar local

Desde la raíz del repo:

```bash
python3 -m http.server 8080
```

Abrir:

```text
http://localhost:8080
```

También puede servirse como sitio estático desde GitHub Pages o cualquier servidor HTTP. No requiere build.

## Loop jugable

La partida completa vive en el navegador y se guarda en `localStorage`.

- Elegir localización inicial en el mapa de Escocia.
- Comprar y plantar semillas de cebada.
- Gestionar humedad, crecimiento, madurez, podredumbre y cosecha.
- Maltear, germinar, secar y usar turba.
- Fermentar con levadura en tinas.
- Destilar en alambiques con control de temperatura, primera, segunda y tercera pasada.
- Envejecer en barricas con tipos y mezclas.
- Embotellar, mover cajas y vender en el camión.
- Mejorar instalaciones: almacén, riego, autocosechadora, capacidad de malteado, automalteado, alambiques, termostato y termostato automático.
- Comprar campañas de publicidad para mover el mercado.
- Desbloquear logros, reputación y estadísticas de la destilería.
- Comparar destilerías públicas en el mapa/ranking si se conecta Google.

## Controles

- `ESC`: mostrar/ocultar oficina o cerrar popups.
- `1`, `2`, `3`, `4`: velocidad del tiempo.
- `f`, `g`, `h`, `j`: fuego de alambiques 1, 2, 3 y 4.
- `m`: música.
- `b`: historial de botellas.
- Arrastrar semillas, malta, líquidos, barricas y cajas entre zonas.

Con el termostato activo, cualquier tecla o icono de fuego sincroniza todos los alambiques activos y aplica el límite de temperatura correspondiente. Con el termostato deshabilitado, el fuego vuelve a ser manual de uno en uno y sin límite de termostato.

## Estructura

- `index.html`: UI principal y modales embebidos.
- `styles.css` y `styles/`: composición FullHD, HUD, mapa, popups, social, barricas y hotfixes visuales.
- `js/game.js`: simulación, UI, guardado local, audio, economía, mejoras y mecánicas principales.
- `js/public-profile.js`: resumen público de la destilería para ranking/social.
- `js/multiplayer.js`: Firebase Auth, publicación social, top 10 y backup/restauración de cuenta.
- `docs/firestore.rules`: reglas recomendadas para Firestore.
- `docs/multiplayer-social.md`: detalle técnico de la capa social.
- `img/`, `audio/`, `fx/`: assets del juego.
- `.openclaw-check/`: scripts y capturas locales de validación; no forma parte del juego publicado.

## Social, ranking y backup

La capa social es opcional. Si Firebase está configurado:

- El login usa Google Auth.
- Se publica solo una ficha pública resumida en `players/{uid}`.
- El ranking lee el top 10 por reputación.
- El backup de cuenta guarda la partida completa troceada bajo `accountBackups/{uid}`, accesible solo por ese usuario según las rules.

No se publica en el ranking el `state` completo, barricas internas, componentes, lineage ni histórico completo.

## Seguridad y privacidad

- `js/firebase-config.js` está versionado a propósito: es configuración pública de Firebase Web App, no una credencial de servidor.
- Las credenciales privadas de Firebase Admin/service account no deben entrar nunca en Git. `.gitignore` excluye `keys/`, `*service-account*.json`, `*firebase-admin*.json` y `sim-distillery-admin*.json`.
- Las rules de Firestore limitan escritura de `players/{uid}` al usuario autenticado y validan campos/rangos del perfil público.
- Las rules de `accountBackups/{uid}` restringen lectura/escritura al propietario autenticado.
- El juego es frontend estático: cualquier lógica de cliente puede ser inspeccionada o manipulada. La beta no debe tratar ranking o datos de cliente como información de confianza.
- No hay analítica propia ni recogida de feedback integrada en esta versión.

## Beta conocida

- Diseñada para FullHD landscape; no hay soporte móvil ni responsive real.
- No hay backend de gameplay ni anticheat. El ranking es social, no competitivo.
- La partida depende del `localStorage` del navegador salvo que el usuario use backup/restauración con Google.
- El feedback se recogerá fuera del juego con un grupo privado de betatesters.

## Validación rápida sin navegador

```bash
node --check js/game.js
node --check js/multiplayer.js
node --check js/public-profile.js
python3 -m http.server 8080
```

La validación visual y de gameplay se hace manualmente en navegador desktop FullHD.
