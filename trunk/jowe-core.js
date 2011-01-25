/*
********************************************************************************
jOWE - javascript Opensource Word Engine
http://code.google.com/p/jowe/
********************************************************************************

Copyright (c) 2010 Ludovic L.

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
This file is an adaptation/rewrite of the files "generate_terrain.c" and
"global_tools.c" (for the smoothmap function) from HME project
(Height Map Editor) available at http://sourceforge.net/projects/hme/
Thanks to Radu Privantu for the HME project and to Stefan Hellkvist for the
SDL plasma code.

********************************************************************************

Details about generation time in milliseconds (beware it's average time) :
Execution time could be extremely different depending on your configuration and many other
several factors, you would have to be really careful by interpreting the results below.
___________________________________________________________________________________________
|                         |                   |         |         |           |           |
| Configuration           | Navigator         | 256x256 | 512x512 | 1024x1024 | 2048x2048 |
|_________________________|___________________|_________|_________|___________|___________|
| Intel T2400@1.83Ghz/2Gb | Google Chrome 8.0 |   100   |   300   |   1200    |   4400    |
|                         | Firefox 4.0b9     |   100   |   400   |   1500    |   6000    |
|                         | Firefox 3.6       |    -    |    -    |     -     |     -     |

NOTICE :
- Basically, the only function to be called here is "doHeightMap".
  It could be placed or duplicated (and renamed) elsewhere (it will probably happen in a
  next release).
  Every other piece of code in here is only for the HeightMap object.

TODO :
- Not quite satisfied with the "N^2" restriction for the dimension of the map.
  Have to be replaced with something cleaner.
- Probably have to add "rise" and "sink" functions.
  (usefull, but not sure about the right location).

*/

/*

Random Height Map Generator Object.

*/

function HeightMap() {
    // Size of the current map [0 .. _Height], [0 .. _Width].
    // Always have to be N^2 x N^2 ("diamond square" algorithm. Better looking results with squares).
    this.width = 128;
    this.height = 128;
    
    // Maximum elevation for current map [0 .. _Pitch].
    this.pitch = 8;

    // Indicates how much height difference between 2 points we can have.
    // Only used in function "generateMap"
    // By the way, combined with "pitch" (previous property),
    // it allows to obtain very different types of map.
    this.ratio = 5.5;

    // Array with the world map.
    this.item = [];
}

/*
 * Initialize the array.
 * h is the default height.
 */
HeightMap.prototype.initializeMap = function(h) {
    var x, y;
    if ((h === undefined) || (h === null)) {
      h = -1;
    }
    this.item = [];
    this.item.length = this.width;
    for (x = 0; x < this.width; x++) {
        this.item[x] = [];
        this.item[x].length = this.height;
        for (y = 0; y < this.height; y++) {
            this.item[x][y] = h;
        }
    }
}

/*
 * Return random height between min and max (included).
 */
HeightMap.prototype.randomPitch = function(min, max) {
    return Math.floor((Math.random() * ((max - min) + 1)) + min);
}

/*
 * Return the average height of the 4 corners of a square.
 */
HeightMap.prototype.avgColorFrom4 = function(x1, y1, x2, y2, pitch) {
    var avg = (this.item[x1][y1] + this.item[x1][y2] + this.item[x2][y2] + this.item[x2][y1]) / 4;
    if (0 < pitch)
        avg += this.randomPitch(-pitch, pitch);
    return Math.max(Math.min(Math.floor(avg), this.pitch), 0);
}

/*
 * Return the average height of 3 points.
 */
HeightMap.prototype.avgColorFrom3 = function(x1, y1, x2, y2, x3, y3, pitch) {
    var avg = (this.item[x1][y1] + this.item[x2][y2] + this.item[x3][y3]) / 3;
    if (0 < pitch)
        avg += this.randomPitch(-pitch, pitch);
    return Math.max(Math.min(Math.floor(avg), this.pitch), 0);
}

/*
 * Set random height for each corner (initialize the map).
 * (called once at initialization)
 */
HeightMap.prototype.fillCorners = function(overwrite) {
    if (overwrite || (this.item[0][0] < 0))
        this.item[0][0] = this.randomPitch(0, this.pitch);
    if (overwrite || (this.item[this.width - 1][0] < 0))
        this.item[this.width - 1][0] = this.randomPitch(0, this.pitch);
    if (overwrite || (this.item[this.width - 1][this.height - 1] < 0))
        this.item[this.width - 1][this.height - 1] = this.randomPitch(0,this.pitch);
    if (overwrite || (this.item[0][this.height - 1] < 0))
        this.item[0][this.height - 1] = this.randomPitch(0, this.pitch);
}

/*
 * Generate a random map.
 * Parameters indicates "top/left" and "right/bottom" limits.
 */
HeightMap.prototype.generateMap = function(x1, y1, x2, y2, pitch, x_mid, y_mid) {

    if (0 > this.item[x_mid][y_mid]) this.item[x_mid][y_mid] = this.avgColorFrom4(x1, y1, x2, y2, pitch);

    if (0 > this.item[x_mid][y1]) this.item[x_mid][y1] = this.avgColorFrom3(x1, y1, x2, y1, x_mid, y_mid, pitch);
    if (0 > this.item[x_mid][y2]) this.item[x_mid][y2] = this.avgColorFrom3(x1, y2, x2, y2, x_mid, y_mid, pitch);
    if (0 > this.item[x2][y_mid]) this.item[x2][y_mid] = this.avgColorFrom3(x2, y1, x2, y2, x_mid, y_mid, pitch);
    if (0 > this.item[x1][y_mid]) this.item[x1][y_mid] = this.avgColorFrom3(x1, y1, x1, y2, x_mid, y_mid, pitch);

    if ((x2 > (x1 + 1)) || (y2 > (y1 + 1)))
    {
        var mr = Math.floor;
        var p1 = mr(Math.abs(x_mid - x2) / this.ratio);
        var p2 = mr(Math.abs(x1 - x_mid) / this.ratio);
        var x_mid1 = mr((x1 + x_mid) / 2);
        var x_mid2 = mr((x2 + x_mid) / 2);
        var y_mid1 = mr((y1 + y_mid) / 2);
        var y_mid2 = mr((y2 + y_mid) / 2);

        this.generateMap(x_mid, y_mid, x2, y2, p1, x_mid2, y_mid2);
        this.generateMap(x1, y_mid, x_mid, y2, p2, x_mid1, y_mid2);
        this.generateMap(x1, y1, x_mid, y_mid, p2, x_mid1, y_mid1);
        this.generateMap(x_mid, y1, x2, y_mid, p1, x_mid2, y_mid1);
    }
}

/*
 * Set cells height to be closer to other adjacent cells.
 */
HeightMap.prototype.smoothMap = function() {
    var x, y, sum = 0, w = this.width - 1, h = this.height - 1;
    var mx = Math.max, mn = Math.min, mr = Math.floor;
    for (y = 1; y < w ; y++) {
        for (x = 1; x < h ; x++) {

            sum = this.item[x-1][y  ]
                + this.item[x  ][y  ]
                + this.item[x+1][y  ]
                + this.item[x-1][y-1]
                + this.item[x  ][y-1]
                + this.item[x+1][y-1]
                + this.item[x-1][y+1]
                + this.item[x  ][y+1]
                + this.item[x+1][y+1];
             
            if (4 < (sum % 9)) {
                sum = (sum / 9) + 1;
            } else {
                sum /= 9;
            }

            this.item[x][y] = mx(mn(mr(sum), this.pitch), 0);
        }
    }
}

/*
 * Build a map and return the item array.
 *
 * Size is 0 based.
 * doMap(5, 10) will return a map with dimension [0 .. 4][0 .. 9]
 * but as we need 2 points to make a cell we'll have 4x9 cells (= 36 true cells displayed).
 * 
 */
 HeightMap.prototype.doMap = function(width, height) {
    // Default values if none provided.
    // It also limits size to 2048x2048, to avoid big generation time.
    if ((width == null) || (height == null) ||
        (width < 2) || (height < 2)||
        (width > 2044) || (height > 2044)) {

        width = 128;
        height = 128;
    }

    // We have better results with square and N^2 x N^2 maps,
    // Let's keep the bigger side
    var side = Math.max(width, height);

    // Look for 2^n size (better results from 2^7).
    var n = 7;
    while (Math.pow(2, n) < side)
        n++;

    // Create new map object.
    // At this stage, working size will be (Math.pow(2, n) x Math.pow(2, n))
    this.width = Math.pow(2, n);
    this.height = Math.pow(2, n);
    // Initialize height.
    this.initializeMap();

    // Initialize corners.
    this.fillCorners(true);

    // Do map!
    this.generateMap(0, 0, this.width - 1, this.height - 1,
        Math.floor((this.width - 1) / this.ratio),
        Math.floor((this.width - 1) / 2),
        Math.floor((this.height - 1) / 2));

    // Smooth map to remove weird points.
    this.smoothMap();

    // Return height map array (the array of cells, not the "HeightMap" object).
    return this.item;
}

/*
 * Return a random array of cells (world map), with the requested size.
 */
function doHeightMap(width, height)
{
    // Create new map object.
    var myMap = new HeightMap();

    // Borders of the working height map to exclude from final result.
    var Crop = 1;

    // We'll exclude all the border lines to avoid weird point,
    // so we enlarge the map size with (width+2) and (height+2).
    myMap.doMap(width + (2 * Crop), height + (2 * Crop));
    
    // Crop the working map to get the requested map.
    var Result = [];
    Result.length = width;
    for(var x = Crop; x < (width + Crop); x++) {
        Result[x - Crop] = [];
        Result[x - Crop].length = height;
        for(var y = Crop; y < (height + Crop); y++) {
            Result[x - Crop][y - Crop] = myMap.item[x][y];
        }
    }
    
    // Return height map array (the array of cells, not the "HeightMap" object).
    return Result;
}
