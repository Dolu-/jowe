#### jOWE is a world map engine
###### _(to be included in a more complex and bigger project...)_

jOWE creates random worlds - height maps - (from 4x4 to 2048x2048) and displays the result in your browser in a 3d-style (2d-isometric), or with hexagonal or diamond tiles.<br>
It is done in javascript and works with the canvas tag.<br>
You can navigate through the grid by dragging it and you can display a cursor that follow the mouse inside the grid.

<img src="http://jowe.dolu.fr/screenshots/jOWE-07.png" alt="" height="546" width="670" />

_(screenshot from the demo of jOWE v0.1r9 - A simple world with its minimap on the left...)_

And the world is yours... You can combine several calls to the engine (as it is done in the demo) to make your world with all the geographical characteristics you need.
Below, you can see for the same world, from left to right, the relief, the fertility, the rainfall, the temperature and the population.

<a href="http://jowe.dolu.fr/screenshots/jOWE-08-relief.png"><img src="http://jowe.dolu.fr/screenshots/jOWE-08-relief.png" alt="" height="88" width="154" /></a><a href="http://jowe.dolu.fr/screenshots/jOWE-08-fertility.png"><img src="http://jowe.dolu.fr/screenshots/jOWE-08-fertility.png" alt="" height="88" width="154" /></a><a href="http://jowe.dolu.fr/screenshots/jOWE-08-rainfall.png"><img src="http://jowe.dolu.fr/screenshots/jOWE-08-rainfall.png" alt="" height="88" width="154" /></a><a href="http://jowe.dolu.fr/screenshots/jOWE-08-temperature.png"><img src="http://jowe.dolu.fr/screenshots/jOWE-08-temperature.png" alt="" height="88" width="154" /></a><a href="http://jowe.dolu.fr/screenshots/jOWE-08-population.png"><img src="http://jowe.dolu.fr/screenshots/jOWE-08-population.png" alt="" height="88" width="154" /></a>

_(click the image for full size)_

----

### Please take me to demo!

*Please, be advise that it is work in progress! Some buttons may not be functionnal, and you could encounter some strange behaviour.*

Here it is, http://jowe.dolu.fr/jowe-demo.html (Firefox, Chrome, Opera, IE9 and every other "canvas compliant" browser).

For IE users below version 9, you can try [ChromeFrame](http://www.google.com/chromeframe),
it's a free plug-in for Internet Explorer (from version 6 to 9) that let you have Chrome functionnalities
inside Internet Explorer.

At last, if you can't use it there is a specific demo, http://jowe.dolu.fr/jowe-demo-ie.html, using [ExplorerCanvas](http://code.google.com/p/explorercanvas/). It will work for very small maps, and unfortunately, after loading, moving will take too much time to be usable.

----

### How can I help ?

This project looks good and you want to participate ? There's a lot of things to be done :

  * Javascript optimization for the "core" and the "ui".
  * Find and fix bugs.
  * Makes the demo look even better.
  * Every other things usefull you could have in mind...


----

### Image Galery

| Screenshot  | Detail |
| ----------- | ------ |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-01.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-01.png" alt="" height="80" width="120" /> </a> | first working jOWE<br />(22,2ko, 600x400) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-02.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-02.png" alt="" height="108" width="150" /> </a> | screenshot from jOWE v0.1a<br />(24,2ko, 600x432) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-03.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-03.png" alt="" height="108" width="120" /> </a> | screenshot from jOWE v0.1r6<br />(30ko, 600x540) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-05.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-05.png" alt="" height="92" width="128" /> </a> | screenshot from jOWE v0.1r7<br />(28,8ko, 640x460) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-04-300x300.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-04-300x300.png" alt="300x300 map" height="72" width="144" /> </a> | 300x300 world map<br />(617ko, 3600x1800) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-06.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-06.png" alt="" height="77" width="110" /> </a> | screenshot from jOWE v0.1r8<br />(30,7ko, 660x462) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-09-hexagonal-tiles.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-09-hexagonal-tiles.png" alt="" height="60" width="116" /> </a> | first try having hexagonal tiles<br />(35,6ko, 580x300) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-10-world-map.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-10-world-map.png" alt="" height="75" width="157" /> </a> | New World map generator<br />(42,3ko, 628x298) |
| <a href="http://jowe.dolu.fr/screenshots/jOWE-11-world-map-help.png"> <img src="http://jowe.dolu.fr/screenshots/jOWE-11-world-map-help.png" alt="" height="65" width="123" /> </a> | Help for the enhanced World map generator<br />(270ko, 1230x651) |

Click on the image for full size 

----

Content:

 * jowe-alea.js : Mash() and Alea() functions, used to make repetitve random map (reusable seed). _This file is optional._
 * jowe-core.js : Create an heightmap.
 * jowe-ui.js: Manage display of the grid.
 * jowe-ui-2d-hexa.js: Object for displaying map with hexagonal tiles.
 * jowe-ui-2d-diam.js: Object for displaying map with diamond tiles.
 * jowe-ui-2d-pixel.js: Object for displaying a pixel map from an heightmap.
 * jowe-demo.html : HTML demo file.
 * jowe-demo-ie.html : HTML demo file for Internet Explorer with [ExplorerCanvas](http://code.google.com/p/explorercanvas/).
 * jowe-demo-worldmap.html : HTML demo file for world map generation.
 * jowe-demo.css : style sheet demo file.
 * jowe-world.js : world object to be used in the demo.
 * jowe-demo.js : To be used with jowe-demo.html for the demo.
 * images/`*`.png : images for the toolbar (demo).
 * js/`*`.js : external javascript files (for now, "excanvas", "jQuery" and "json2.js").

_The name of the files could probably change in the future to reflect a better structure._

----
To do :

 * Function to move the map with arrow keys
 * ~~Add "world" to the demo (will contain many cities)~~
 * Fix bug :
   * sometimes border of the canvas is not filled
   * in the demo, enabling draw cursor before build is not taking in account
 * ~~Random position for population within a city~~
   * ~~Manage city size~~
   * ~~Calculation for city average values (fertility, rainfall, ...)~~
 * Cell object (within the ui) should be enhance :
   * cell type sometimes not good
   * calculate average value of each point?
 * Better color management
 * ~~Use function Alea() to repeat map.~~
 * Save/Load a grid
 * Tools to rise/sink a cell
 * ~~Add other properties to the map :~~
   * ~~fertility~~
   * ~~rainfall~~
   * ~~temperature~~
   * ~~city and population~~
   * ...
 * Technical documentation (mainly for jowe_core.js and jowe_ui.js) => *In progress...*
   *  ~~jowe-core.js example~~
 * ~~Better file organization (functions, classes, ...)~~
 * ~~Online demo~~
 * ~~"Zoom" function (increase/decrease cell size)~~
 * ~~Make flat water level~~
 * ~~Add minimap~~
 * ~~Add more colors (deep ocean, moutains, snow,...)~~
 * ~~Issue with missing cells on the border of the canvas~~
 * ~~Issue when moving grid with cursor (previous selected cell with incorrect color)~~
 * ...
