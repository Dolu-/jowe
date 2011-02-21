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
The Mash() and Alea() objects : Johannes Baagøe <baagoe@baagoe.com>, 2010
From http://baagoe.com/en/RandomMusings/javascript/

********************************************************************************

Details about generation time in milliseconds - for 'doHeightMap()' (beware it's average time) :
Execution time could be extremely different depending on your configuration and many other
several factors, you would have to be really careful by interpreting the results below.
_______________________________________________________________________________ _ _ _ _ _ _ _ _
|                         |                   |         |         |           |               |
| Configuration           | Navigator         | 256x256 | 512x512 | 1024x1024 | 2048x2048(*3) |
|_________________________|___________________|_________|_________|___________|_ _ _ _ _ _ _ _|
| Intel T2400@1.83Ghz/2Gb | Google Chrome 8.0 |    50   |   150   |    550    |     2100      |
|                         | Firefox 4.0b9     |    60   |   220   |    800    |     3300(*1)  |
|                         | Firefox 3.6 (*2)  |   180   |   650   |   2400    |       -       |
|                         |                   |         |         |           |               |

(*1) After several calls, generation of large maps takes a lot of time (memory issue?).
It does not occur with smaller ones.
(*2) It works and time is correct, but it needs to optimize the jowe-ui, as displaying grid
takes time when there are a lot of cell (time is correct with big zoom).
(*3) On 2011-02-01, I decided to lower the limit of the map size to avoid long generation time.
Nonsense if it's not usable. Time for 2048x2048 map is left only for information purpose.

Here is a bunch of time (in ms) that I obtain with several calls in Google Chrome 8.0 (for 2000x2000) :
~previous release :
initialize          =  172    147     95    103
generate            = 1692   1711   1722   1703
smooth              =  811    786    793    773
crop                =  135    186    185    185
doHeightMap (Total) = 2810   2830   2795   2764
~current release :
initialize          =  250    280    212    219
generate            =  999   1507   1014   1003
smooth              =  700    706    702    697
crop                =   42     48     43     44
doHeightMap (Total) = 1991   2541   1971   1963
=> Good improvements in crop and generate.
=> Small one in smooth
=> Regression in initialize (?!)
********************************************************************************

NOTICE :
- Basically, the only function to be called here is "doHeightMap".
  It could be placed or duplicated (and renamed) elsewhere (it will probably happen in a
  next release).
  Every other piece of code in here is only for the HeightMap object.
*/

/*

Random Height Map Generator Object.

*/

// Create new map object (as global).
var myMap = new HeightMap();

// Random object/class.
var rand = new Alea('');

function HeightMap(arg_pitch, arg_ratio) {

    // Size of the current map [0 .. side], [0 .. side].
    // Always have to be (N^2)+1 x (N^2)+1 ("diamond square" algorithm. Better looking results with squares).
    // We only need to store it once (side = width = height).
    var side = 129;
    // Set minimum and maximum size for a side
    var minSide = 4, maxSide = 2040;
    
    // Maximum elevation for current map [0 .. _Pitch].
    // You will have to adjust the color managment in "jowe-ui" to fit your elevation.
    var pitch = 8;
    if ((arg_pitch != undefined) && (arg_pitch != null)) pitch = arg_pitch;

    // Indicates how much height difference between 2 points we can have.
    // Only used in function "generate"
    // By the way, combined with "pitch" (previous property),
    // it allows to obtain very different types of map.
    // For now 3.1 is around the minimum value to use, below that you
    // could obtain strange map (unmanaged cell display).
    // If you put an higher value, your map will look flattened.
    var ratio = 3.1;
    if ((arg_ratio != undefined) && (arg_ratio != null)) ratio = arg_ratio;

    // Array with the world map.
    this.item = [];
    
    /*
     * [Privileged method] initialize()
     *
     * Initialize the array.
     * h = default height.
     */
    this.initialize = function(h) {
        var x = side, a = this.item, b = [];
        a.length = b.length = side;
        while (x) b[--x] = h;
        x = side;
        while (x) a[--x] = b.slice();
    }
        
    /*
     * [Private method] randomMinMax
     *
     * Return random height between min and max (included),
     * result is rounded (~~ => Math.floor).
     */
    function randomMinMax(min, max) {
        return ~~((Math.random() * ((max - min) + 1)) + min);
    }

    /*
     * [Privileged method] fillCorners
     *
     * Set random height for each corner (initialize the map).
     * (called once at initialization)
     */
    this.fillCorners = function(overwrite) {
        if (overwrite || (0 > this.item[0][0]))
            this.item[0][0] = randomMinMax(0, pitch);
        if (overwrite || (0 > this.item[side - 1][0]))
            this.item[side - 1][0] = randomMinMax(0, pitch);
        if (overwrite || (0 > this.item[side - 1][side - 1]))
            this.item[side - 1][side - 1] = randomMinMax(0,pitch);
        if (overwrite || (0 > this.item[0][side - 1]))
            this.item[0][side - 1] = randomMinMax(0, pitch);
    }

    /*
     * [Private method] addDelta
     *
     * Return a value added with a random delta.
     * If the delta is more than 0, it adds to "avg" a random value between "-delta" and "+delta".
     * In fact it sets the height between two points. The closer there are, the lower the delta will be.
     * The function ensure that the result is positive and less than the pitch (max height).
     */
    function addDelta(avg, delta) {
        if (0 < delta) avg += (rand() * ((delta << 1) + 1)) - delta;
        return (pitch < avg) ? pitch : (0 > avg) ? 0 : ~~avg ;
    }

    
    /*
     * [Privileged method] generate
     *
     * Generate a random map.
     * Parameters indicates "top/left" and "right/bottom" limits.
     */
    this.generate = function(x1, y1, x2, y2, xm, ym) {
        
        var delta = ~~((x2 - xm) / ratio), a = this.item;

        // Set a random height for the middle of the current square.
        // addDelta is called with the average height of the 4 points.
        a[xm][ym] = addDelta((a[x1][y1] + a[x1][y2] + a[x2][y2] + a[x2][y1]) >> 2, delta);
      
        // Set a random height for the middle of the hypotenuse of each triangle.
        // addDelta is called with the average height of the 3 points.
        if (0 > a[xm][y1]) a[xm][y1] = addDelta((a[x1][y1] + a[x2][y1] + a[xm][ym]) / 3, delta);
        if (0 > a[xm][y2]) a[xm][y2] = addDelta((a[x1][y2] + a[x2][y2] + a[xm][ym]) / 3, delta);
        if (0 > a[x2][ym]) a[x2][ym] = addDelta((a[x2][y1] + a[x2][y2] + a[xm][ym]) / 3, delta);
        if (0 > a[x1][ym]) a[x1][ym] = addDelta((a[x1][y1] + a[x1][y2] + a[xm][ym]) / 3, delta);

        if (((x2 - x1) > 2) || ((y2 - y1) > 2)) {
            delta = (xm - x1) >> 1;
            var xm1 = xm - delta, xm2 = xm + delta;
            var ymi = ym + delta;
            this.generate(xm, ym, x2, y2, xm2, ymi);
            this.generate(x1, ym, xm, y2, xm1, ymi);
            ymi = ym - delta;
            this.generate(x1, y1, xm, ym, xm1, ymi);
            this.generate(xm, y1, x2, ym, xm2, ymi);
        }
    }

    /*
     * [Privileged method] smooth
     *
     * Set cells height to be closer to other adjacent cells.
     */
    this.smooth = function() {
        var x, y, sum, a = this.item, s = side - 1, xm1 = [], xp1 = [];
        for (x = 1; x < s ; x++) {
            xm1 = a[x-1];
            sum = a[x][1];
            xp1 = a[x+1];
            for (y = 1; y < s ; y++) {

                sum +=  xm1[y-1] + xm1[y] + xm1[y+1] + a[x][y] + a[x][y+1] + xp1[y-1] + xp1[y] + xp1[y+1];
                
                sum = 4 < (sum % 9) ? (sum / 9) + 1 : sum / 9;
                sum = ~~sum;
                
                if (pitch < sum) sum = pitch;
                a[x][y] = sum;
            }
        }
    }

    /*
     * [Privileged method] crop
     *
     * Crop current map according to specific size.
     */
    this.crop = function(width, height, cropsize) {
        var a =this.item.slice(cropsize, width + cropsize);
        var x = a.length;
        while (x--) a[x] = a[x].slice(cropsize, height + cropsize);
        this.item = a;
    }


    /*
     * [Privileged method] doMap
     *
     * Build a map (size is 0-based).
     * doMap(5, 10) will return a map with dimension [0 .. 4][0 .. 9]
     * but as we need 2 points to make a cell we'll have 4x9 cells (= 36 true cells displayed).
     * 
     */
     this.doMap = function(width, height) {
        // Default values if none provided.
        // It also limits size to [maxSide]x[maxSide], to avoid big generation time.
        if ((width == null) || (height == null) ||
            (width < minSide) || (height < minSide)||
            (width > maxSide) || (height > maxSide)) {

            width = 128;
            height = 128;
        }

        // We have better results with square and N^2 x N^2 maps,
        // Let's keep the bigger side.
        side = Math.max(width, height);

        // Look for 2^n size (better results from 2^7).
        var n = 7;
        while (Math.pow(2, n) < side)
            n++;

        // Create new map object.
        // At this stage, working size will be ((Math.pow(2, n) + 1) x (Math.pow(2, n) + 1))
        side = Math.pow(2, n) + 1;
        
        // For debug purpose.
        // dbg_date[2] = new Date();
        
        // Initialize height.
        this.initialize(-1);

        // Initialize corners.
        this.fillCorners(true);

        // For debug purpose.
        // dbg_date[3] = new Date();

        // Do map!
        this.generate(0, 0, side - 1, side - 1,(side - 1) >> 1,(side - 1) >> 1);

        // For debug purpose.
        // dbg_date[4] = new Date();

        // Smooth map to remove weird points.
        this.smooth();
    }

}

/*
 * Return a random array of cells (world map), with the requested size.
 */
function doHeightMap(width, height)
{
    // Borders of the working height map to exclude from final result.
    var Crop = 1;

    // For debug purpose.
    // dbg_date[1] = new Date();
    
    // We'll exclude all the border lines to avoid weird point,
    // so we enlarge the map size with (width+2) and (height+2).
    myMap.doMap(width + (2 * Crop), height + (2 * Crop));

    // For debug purpose.
    // dbg_date[5] = new Date();

    // Crop the working map to get the requested map.
    myMap.crop(width, height, Crop);

    // For debug purpose.
    // dbg_date[6] = new Date();
}

/**********************************************************************************/

// From http://baagoe.com/en/RandomMusings/javascript/
// Johannes Baagøe <baagoe@baagoe.com>, 2010
function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };
  return mash;
}

// From http://baagoe.com/en/RandomMusings/javascript/
// Johannes Baagøe <baagoe@baagoe.com>, 2010
function Alea() {
  return (function(args) {
    var s0 = 0, s1 = 0, s2 = 0, c = 1, mash = Mash(), p1 = 2091639, p2 = 2.3283064365386963e-10; // 2^-32

    if (args.length == 0) {
      args = [+new Date];
    }
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');

    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);
      if (s0 < 0) s0 += 1;
      s1 -= mash(args[i]);
      if (s1 < 0) s1 += 1;
      s2 -= mash(args[i]);
      if (s2 < 0) s2 += 1;
    }
    mash = null;

    var random = function() {
      var t = p1 * s0 + c * p2;
      s0 = s1 = s2;
      return s2 = t - (c = t | 0);
    };
    random.args = args;
    return random;

  } (Array.prototype.slice.call(arguments)));
}
