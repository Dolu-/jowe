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
This file is an total adaptation/rewrite of the files "generate_terrain.c" and
"global_tools.c" (for the smoothmap function) from HME project
(Height Map Editor) available at http://sourceforge.net/projects/hme/
Thanks to Radu Privantu for the HME project and to Stefan Hellkvist for the
SDL plasma code.

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
initialize    =  172    147     95    103
make          = 1692   1711   1722   1703
smooth        =  811    786    793    773
crop          =  135    186    185    185
doMap (Total) = 2810   2830   2795   2764
~current release :
initialize    =  250    280    212    219
make          =  999   1507   1014   1003
smooth        =  700    706    702    697
crop          =   42     48     43     44
doMap (Total) = 1991   2541   1971   1963
=> Good improvements in crop and make.
=> Small one in smooth
=> Regression in initialize (?!)
********************************************************************************

NOTICE :
- Every piece of code in here is only for the HeightMap object.
  No other object!

TODO :
- Remove "debug" related stuff.

*/

/*
 * [Public "object"] HeightMap()
 *
 * Random Height Map Generator Object.
 * arg_pitch  [integer] : pitch to be used
 * arg_ratio  [float]   : ratio to be used
 * arg_width  [integer] : width of the map to be generated
 * arg_height [integer] : height of the map to be generated
 */
function HeightMap(arg_pitch, arg_ratio, arg_width, arg_height) {
    
    /*
     * [Privileged method] initialize()
     *
     * Initialize the item array.
     * h [integer] : default value for each item.
     */
    this.initialize = function (h) {
        var x = side, a = this.item, b = [];
        a.length = b.length = side;
        while (x) b[--x] = h;
        x = side;
        while (x) a[--x] = b.slice();
    };
        
    /*
     * [Private method] randomMinMax
     *
     * Return a random value between min and max (included), result is rounded.
     * min [integer]
     * max [integer]
     */
    function randomMinMax(min, max) {
        return floor((rand() * ((max - min) + 1)) + min);
    }

    /*
     * [Privileged method] fillCorners
     *
     * Set random value for each corner - initialize the map (called once at initialization)
     * overwrite [boolean]  : indicates if existing values should be overwritten
     */
    this.fillCorners = function (overwrite) {
        var H = this.item;
        if (overwrite || (0 > H[0][0])) {
            H[0][0] = randomMinMax(0, pitch);
        }
        if (overwrite || (0 > H[side - 1][0])) {
            H[side - 1][0] = randomMinMax(0, pitch);
        }
        if (overwrite || (0 > H[side - 1][side - 1])) {
            H[side - 1][side - 1] = randomMinMax(0, pitch);
        }
        if (overwrite || (0 > H[0][side - 1])) {
            H[0][side - 1] = randomMinMax(0, pitch);
        }
    };

    /*
     * [Privileged method] fillBorders
     *
     * Set random value for each border.
     * value [integer]       : default height to apply
     * borderwidth [integer] : width of the border
     */
    this.fillBorders = function (value, borderwidth) {
        var H = this.item, s = side - 1, x, y;

        for (x = 0; x < side; x += 1) {
            for (y = 0; y < borderwidth; y += 1) {
                H[0 + y][x] = H[s - y][x] = H[x][0 + y] = H[x][s - y] = value;
            }
        }
    };
    
    /*
     * [Private method] addDelta
     *
     * Return a value added with a random delta.
     * If the delta is more than 0, it adds to "avg" a random value between "-delta" and "+delta".
     * In fact it sets the height between two points. The closer there are, the lower the delta will be.
     * The function ensure that the result is positive and less than the pitch (max height).
     */
    function addDelta(avg, delta) {
        if (0 < delta) avg += ((rand() * ((delta * 2) + 1)) - delta);
        return (pitch < avg) ? pitch : (0 > avg) ? 0 : floor(avg);
    }
    
    /*
     * [Privileged method] make
     *
     * Generate a random map.
     * Parameters indicates "top/left" and "right/bottom" limits.
     * Caution : this function onyl works with 2^n squares, as it goes recursively with divide by 2.
     */
    this.make = function (x1, y1, x2, y2, xm, ym) {
    
        // Notice : Removing floor below could produce more realistics maps (it adds more noise).
                 // Should it be set by default ? Next "floor" is done in addDelta().
                 // (caution : it takes more time on FF when removed).
        var delta = floor((x2 - xm) / ratio), xmym,
            x1y1  = this.item[x1][y1],
            x2y2  = this.item[x2][y2],
            x1y2  = this.item[x1][y2],
            x2y1  = this.item[x2][y1];

        // Set a random height for the middle of the current square.
        // addDelta is called with the average height of the 4 points.
        if (0 > this.item[xm][ym]) {
            this.item[xm][ym] = xmym = addDelta((x1y1 + x1y2 + x2y2 + x2y1) / 4, delta);
        } else {
            xmym = this.item[xm][ym];
        }
  
        // Set a random height for the middle of the hypotenuse of each triangle.
        // addDelta is called with the average height of the 3 points.
        if (0 > this.item[xm][y1]) this.item[xm][y1] = addDelta((x1y1 + x2y1 + xmym) / 3, delta);
        if (0 > this.item[xm][y2]) this.item[xm][y2] = addDelta((x1y2 + x2y2 + xmym) / 3, delta);
        if (0 > this.item[x2][ym]) this.item[x2][ym] = addDelta((x2y1 + x2y2 + xmym) / 3, delta);
        if (0 > this.item[x1][ym]) this.item[x1][ym] = addDelta((x1y1 + x1y2 + xmym) / 3, delta);

        if (((x2 - x1) > 2) || ((y2 - y1) > 2)) {
            delta = (xm - x1) / 2;
            this.make(xm, ym, x2, y2, xm + delta, ym + delta);
            this.make(x1, ym, xm, y2, xm - delta, ym + delta);
            this.make(x1, y1, xm, ym, xm - delta, ym - delta);
            this.make(xm, y1, x2, ym, xm + delta, ym - delta);
        }
    };

    /*
     * [Privileged method] smooth
     *
     * Set cells height to be closer to other adjacent cells.
     */
    this.smooth  = function () {
        var H = this.item, x, y, sum, s = side - 1, xm1 = [], xp1 = [];
        for (x = 1; x < s ; x += 1) {
            xm1 = H[x - 1];
            sum = H[x][1];
            xp1 = H[x + 1];
            for (y = 1; y < s ; y += 1) {

                sum += (xm1[y - 1] + xm1[y] + xm1[y + 1] + H[x][y] + H[x][y + 1] + xp1[y - 1] + xp1[y] + xp1[y + 1]);
                
                sum = floor(4 < (sum % 9) ? (sum / 9) + 1 : sum / 9);
                
                if (pitch < sum) sum = pitch;
                H[x][y] = sum;
            }
        }
    };

    /*
     * [Privileged method] crop
     *
     * Crop current map according to specific size.
     */
    this.crop = function (width, height, cropsize) {
        var a = this.item.slice(cropsize, width + cropsize),
            x = a.length;
        while (x--) a[x] = a[x].slice(cropsize, height + cropsize);
        this.item = a;
    };

    /*
     * [Privileged method] copy
     *
     * Copy data from another map to the current object at x, y coordinates
     */
    this.copy = function (source, from_x, from_y) {
        var D = this.item, S = source.item, x, y;
        for (x = 0; x < S.length ; x += 1) 
            for (y = 0; y < S[0].length ; y += 1)
                D[from_x + x][from_y + y] = S[x][y];
    }
    
    /*
     * [Privileged method] makeMap
     *
     * This is only a shortcut to call function make() with default parameters.
     * All necessary variables should have been initialized.
     */
    this.makeMap = function () {
        // Do map!
        this.make(0, 0, side - 1, side - 1, floor((side - 1) / 2), floor((side - 1) / 2));
    }
    
/* COMMENTS:
    
    Everything before this point is considered to be clean and optimized (nothing to be done in a short time).
    
    --------------------------------------------------------------------------------
    
    Everything below this point need to be cleaned up and probably rearrange...
*/
    
    /*
     * [Privileged method] setSide
     *
     * Calculate the value of the side of the "square".
     * width  [integer],
     * height [integer] : dimension of the requested map.
     */
    this.setSide = function (p_width, p_height) {
        // Default values if none provided.
        // It also limits size to [maxSide]x[maxSide], to avoid big generation time.
        if ((p_width === undefined) || (p_height === undefined) ||
            (p_width === null) || (p_height === null) ||
            (isNaN(p_width)) || (isNaN(p_height)) ||
            (p_width < minSide) || (p_height < minSide) ||
            (p_width > maxSide) || (p_height > maxSide)) {
            
            p_width = p_height = height = width = 127;
        } else {
            width = p_width;
            height = p_height;
        }

        // We'll exclude all the border lines to avoid weird point,
        // so we enlarge the map size with (width+2) and (height+2).
        p_width += (2 * cropsize);
        p_height += (2 * cropsize);

        // Core engine (function make) works only with squares.
        // (BTW, we also have better results with 2^N x 2^N maps)
        // Let's keep the bigger side.
        side = Math.max(p_width, p_height);

        // Look for 2^n size (better results from 2^7).
        var n = 4;
        while (Math.pow(2, n) < side) {
            n++;
        }

        // At this stage, working size will be ((Math.pow(2, n) + 1) x (Math.pow(2, n) + 1))
        side = Math.pow(2, n) + 1;
        
        // Return calculated value.
        return side;
    }
    
    /*
     * [Privileged method] doMap
     *
     * Build a map (size is 0-based).
     * doMap(5, 10) will return a map with dimension [0 .. 4][0 .. 9]
     * but as we need 2 points to make a cell we'll have 4x9 cells (= 36 true cells displayed).
     */
    this.doMap = function (width, height, bInitialize) {
    
        if ((bInitialize === undefined) || (bInitialize === null) || (bInitialize === true)) {
            // Initialize side width.
            this.setSide(width, height);
            
            // For debug purpose.
            if (isdebug) dbg_date[2] = new Date();
            
            // Initialize height.
            this.initialize(-1);
            // Initialize corners.
            this.fillCorners(true);
        }
        // For debug purpose.
        if (isdebug) dbg_date[3] = new Date();

        // Do map!
        this.make(0, 0, side - 1, side - 1, floor((side - 1) / 2), floor((side - 1) / 2));
        
        // For debug purpose.
        if (isdebug) dbg_date[4] = new Date();
 
        // Smooth height map to remove weird points.
        this.smooth();
        
        // For debug purpose.
        if (isdebug) dbg_date[5] = new Date();

        // Crop the working map to get the requested map.
        this.crop(width, height, cropsize);

        // For debug purpose.
        if (isdebug) dbg_date[6] = new Date();

    };

    // Size of the current map [0 .. side], [0 .. side].
    // Always have to be (N^2)+1 x (N^2)+1 ("diamond square" algorithm. Better looking results with squares).
    // We only need to store it once (side = width = height).
    var side = 129,
    
        // Set minimum and maximum size for a side.
        minSide = 4,
		maxSide = 1000,
        
        // "real" dimension of the current object (not resized to 2^n square) and not cropped.
        width = 127,
        height = 127,
        
        // Maximum elevation for current map [0 .. _Pitch].
        // You will have to adjust the color managment in "jowe-ui" to fit your elevation.
        pitch = 8,
        
        // Indicates how much height difference between 2 points we can have.
        // Only used in function "make"
        // By the way, combined with "pitch" (previous property),
        // it allows to obtain very different types of map.
        // For now 3.1 is around the minimum value to use, below that you
        // could obtain strange map (unmanaged cell display).
        // If you put an higher value, your map will look flattened.
        ratio = 3.1,

        // Random object/class.
        rand,

        // Borders of the working height map to exclude from final result.
		cropsize = 1;
        
		// Shortcut to function.
        floor = Math.floor;
        
    if ((arg_pitch !== undefined) && (arg_pitch !== null) && (!isNaN(arg_pitch))) {
        pitch = floor(arg_pitch); // Just in case, pitch is floored, need to be an integer.
    }
    if ((arg_ratio !== undefined) && (arg_ratio !== null) && (!isNaN(arg_ratio))) {
        ratio = arg_ratio;
    }
    if ((arg_width !== undefined) && (arg_width !== null) && (!isNaN(arg_width))) {
        width = floor(arg_width);
    }
    if ((arg_height !== undefined) && (arg_height !== null) && (!isNaN(arg_height))) {
        height = floor(arg_height);
    }
    // Calculate side for the internal square
    this.setSide(height, width);

    // Use Alea() if exists.
    if (typeof Alea == "undefined") {
        rand = Math.random;
    } else {
        rand = new Alea();
    }

    // Array with the world map.
    this.item = [];
}
