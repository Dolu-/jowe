/*
********************************************************************************
jOWE - javascript Opensource Word Engine
http://code.google.com/p/jowe/
********************************************************************************

Copyright (c) 2010-2011 Ludovic L.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

********************************************************************************
This is the Javascript demo file of the jOWE project.

*/

/* COMMENTS:

   The function below should be moved on dedicated file...
   It doesn't belong to the "core".
*/

/*
 * [Public "object"] WorldMap()
 *
 * Random World Map Generator Object.
 *
 */
function WorldMap(width, height, pitch, ratio) {

    // if ((width !== undefined) && (width !== null) && (!isNaN(width))) {
        // return false
    // }
    // if ((height !== undefined) && (height !== null) && (!isNaN(height))) {
        // return false;
    // }
    
    // World array consists of 5 arrays : Height, Fertility, Rainfall, Temperature, Population.
	this.height = new HeightMap(pitch, ratio);
    this.height.doMap(width, height);

    // Fertility goes from 0 (bad/none) to 100 (excellent)
	this.fertility = new HeightMap(100, 0.1);
    this.fertility.doMap(width, height);

    // Rainfall goes from 0 (none) to 20 (very often)
	this.rainfall = new HeightMap(20, 4.5);
    this.rainfall.doMap(width, height);

    // Average temperature goes from 0 (5°C) to 20 (25°C)
    // [0 => 5°C, 5 => 10°C, 10 => 15°C, 15 => 20°C, 20 => 25°C]
	this.temperature = new HeightMap(20, 5.0);
    this.temperature.doMap(width, height);

    /*
    
    Beyond this point population managment.
    
    */
    
    // Population goes from 0 to 100 (eq. 1000 people/km²)
    // [0 => 5°C, 5 => 10°C, 10 => 15°C, 15 => 20°C, 20 => 25°C]
    // City size is user-defined and fit in the current map.
	var city = new HeightMap(100, 0.15, 30, 30);
    city.initialize(-1);
    city.fillBorders(0, 4);
    city.doMap(30, 30, false);
    
    this.population = new  HeightMap(0, 0, width, height);
    this.population.initialize(0);
    this.population.copy(city, 15, 15);
}

// Create world object (as global).
var myWorld;
