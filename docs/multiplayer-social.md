# Multijugador social asíncrono

Sim Distillery mantiene la partida completa en `localStorage`. La capa social es opcional y publica sólo una ficha pública resumida en Firebase Auth + Cloud Firestore.

## Flujo actual

- No hay botón Social en el HUD.
- El login se ofrece al volver al mapa de Escocia una vez elegida ubicación.
- En el mapa aparece un panel social con:
  - `Login Google` si no hay cuenta conectada.
  - `Desconectar cuenta` si la hay.
- Al conectar:
  - se publica la ficha pública si hay cambios;
  - se carga el top 10 por reputación;
  - las destilerías públicas aparecen en el mapa.
- El top 10 se vuelve a pedir al entrar en el mapa sólo si han pasado más de 10 minutos desde la última carga, salvo login inicial.
- Click en otra destilería: la selecciona/deselecciona para comparar en el radar.
- Se pueden comparar hasta 3 destilerías públicas a la vez. El radar se normaliza por el valor máximo visible de cada métrica.

## Qué se publica

Colección: `players/{uid}`

Campos públicos:

- `schemaVersion`
- `build`
- `publicName`
- `distilleryName`
- `region`
- `x`, `y`
- `distilleryImage`
- `reputation`
- `bestQuality`
- `litresSold`
- `lotsSold`
- `bottlesSold`
- `maxBottlePrice`
- `maxBottlesLot`
- `oldestSoldAge`
- `achievements`
- `achievementsCount`
- `updatedAtClient`
- `updatedAt`

No se sube `state`, barricas, componentes, lineage ni histórico completo.

## Archivos

- `js/public-profile.js`: construye la ficha pública desde el estado local.
- `js/multiplayer.js`: Auth Google, publicación, ranking top 10 cacheado y panel social del mapa.
- `js/firebase-config.example.js`: plantilla de configuración.
- `js/firebase-config.js`: configuración real local, ignorada por Git.
- `docs/firestore.rules`: reglas mínimas de Firestore.

## Setup manual Firebase

1. Crear proyecto en Firebase Console.
2. Crear una Web App.
3. Activar Authentication → Sign-in method → Google.
4. Añadir los dominios donde se servirá el juego en Authentication → Settings → Authorized domains.
5. Crear Cloud Firestore en modo production.
6. Copiar `docs/firestore.rules` en Firestore Rules y publicar.
7. Copiar `js/firebase-config.example.js` a `js/firebase-config.js`.
8. Pegar el objeto de configuración de la Web App en formato `window.MIARMA_FIREBASE_CONFIG = {...}`.
9. Abrir el juego, elegir ubicación, volver al mapa de Escocia y conectar Google.

## Comportamiento offline/no configurado

Si `js/firebase-config.js` no existe, el juego sigue funcionando normal. El panel del mapa indica que Firebase no está configurado y no intenta publicar.

## Estrategia de escrituras

No se publica desde `tick()` ni desde la simulación continua. Se marca perfil sucio sólo en eventos relevantes: venta, embotellado, logro, reputación, cambio de región/nombre, apertura de mapa o publicación manual. Antes de escribir se compara contra la última ficha publicada para evitar escrituras sin cambios.

## Datos manuales para probar top 10

Firestore Console no tiene un campo cómodo para pegar un documento JSON entero: normalmente obliga a añadir campo a campo. Para meter una destilería falsa de otro usuario sin sufrir, usa el importador local con una service account de Firebase Admin.

1. Firebase Console → Project settings → Service accounts → Generate new private key.
2. Guarda ese JSON **fuera del repo**, por ejemplo `~/keys/sim-distillery-admin.json`.
3. Edita o copia `docs/sample-player-smoke-hill.json`.
4. Ejecuta:

```bash
node scripts/import-firestore-player.mjs ~/keys/sim-distillery-admin.json test-smoke-hill docs/sample-player-smoke-hill.json
```

El script escribe en `players/<doc-id>` usando la API Admin REST, así que se salta las rules igual que Firebase Console. No metas nunca la service account en Git.

Ejemplo de JSON:

```json
{
  "schemaVersion": 1,
  "build": "manual-test",
  "publicName": "Ana Test",
  "distilleryName": "Smoke Hill",
  "region": "islay",
  "x": 0.35,
  "y": 0.52,
  "distilleryImage": "img/mapa/dest05.png",
  "reputation": 77,
  "bestQuality": 99,
  "litresSold": 900,
  "lotsSold": 4,
  "bottlesSold": 1800,
  "maxBottlePrice": 33,
  "maxBottlesLot": 900,
  "oldestSoldAge": 18,
  "achievements": ["serious_business", "woody_taste"],
  "achievementsCount": 2,
  "updatedAtClient": 1781390000000,
  "updatedAt": "__now__"
}
```

Valores válidos:

- `region`: `speyside`, `highlands`, `campbeltown`, `islay`, `lowlands`.
- `x`, `y`: números entre `0` y `1` sobre el mapa.
- `distilleryImage`: `img/mapa/dest01.png` hasta `img/mapa/dest15.png`.
