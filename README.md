# Miarma Distillery

PoC HTML+CSS+JS de un juego pixel-art de destilería de whisky.

## Ejecutar local

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080` desde la carpeta del proyecto.

## Contenido

- `index.html` UI fija sobre fondo pixel-art.
- `styles.css` escalado landscape 1920×1080, paneles, barras y tooltips.
- `js/game.js` mecánicas PoC:
  - compra/drag de semillas;
  - cultivo con humedad, crecimiento, madurez y podredumbre;
  - malteado/germinación con humedad óptima;
  - cuba de maceración/fermentación con levadura;
  - destilación con temperatura, primera/segunda pasada;
  - barricas con envejecimiento y pérdida del 5% anual;
  - embotellado, cajas, camión y precio de mercado suave/caótico.
- `img/finca.png` fondo FullHD landscape 1920×1080.
- `img/placeholder_*.png` sprites provisionales reemplazables.


## Últimos ajustes PoC

- Drag&drop propio con Pointer Events para que funcione mejor con el canvas escalado y táctil/ratón.
- HUD compacto superpuesto a la mansión/oficina.
- Nombre editable de la destilería.
- Slider de velocidad entre /5 y x5.
- Reset con confirmación.
- Guardado automático en `localStorage` cada 20 segundos.
- Malteado empieza seco y puede almacenarse indefinidamente hasta regar.
- Cuba y alambique como objetos del mapa sin panel/marco grande; sólo barras y botones compactos al lado.
