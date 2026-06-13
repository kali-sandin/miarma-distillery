# Multijugador social asíncrono

Miarma Distillery mantiene la partida completa en `localStorage`. La capa social es opcional y publica sólo una ficha pública resumida en Firebase Auth + Cloud Firestore.

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
- `js/multiplayer.js`: login Google, publicación, ranking top 10 y render de jugadores públicos.
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
8. Pegar el objeto de configuración de la Web App.
9. Abrir el juego, botón `🌐 Social`, conectar con Google y publicar.

## Comportamiento offline/no configurado

Si `js/firebase-config.js` no existe, el juego sigue funcionando normal. El panel Social muestra instrucciones y no intenta publicar.

## Estrategia de escrituras

No se publica desde `tick()` ni desde la simulación continua. Se marca perfil sucio sólo en eventos relevantes: venta, embotellado, logro, cambio de región/nombre o publicación manual. Antes de escribir se compara contra la última ficha publicada para evitar escrituras sin cambios.
