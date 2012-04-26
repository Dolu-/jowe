/*
********************************************************************************
jOWE - javascript Opensource Word Engine
http://code.google.com/p/jowe/
********************************************************************************

Copyright (c) 2010-2012 Ludovic L.

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

Details about generation time in milliseconds - for 'doMap()' (beware it's average time) :
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
| Intel i5@2.67Ghz/4Gb    | Google Chrome 15  |    25   |    60   |    200    |      700      |
|                         | Firefox 7         |    50   |   140   |    450    |       -       |
|                         | I.E. 9            |    20   |    60   |    230    |      970      |
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
- Every piece of code in here is only for the HeightMap object. No other object!

*/

/**
 * @fileOverview This file contains the HeightMap object (<a href="http://code.google.com/p/jowe/">jOWE</a>).
 * @author Ludovic Lefebvre
 * @version 1.0
 */

/**
 * Creates a new random height map generator object.
 * @class Represents an HeightMap.
 * @see How to use the <a href="http://jowe.ouebfrance.com/examples-jowe-core.html">HeightMap</a> object?
 * @param {number} [opt_pitch=8]    Maximum elevation to be used. Items in the map will have a value between 0 and opt_pitch.
 * @param {number} [opt_ratio=3.1]  Ratio to be used.
 * @param {number} [opt_width=127]  Width of the map to be generated.
 * @param {number} [opt_height=127] Height of the map to be generated.
 */ 
function HeightMap(opt_pitch, opt_ratio, opt_width, opt_height) {
    "use strict";
    
    /**
     * Set minimum size for the side value of the working square.
     * @type number
     * @private
     * @constant
     */
    var MIN_SIDE = 4;
    
    /**
     * Set maximum size for the side value of the working square.
     * @type number
     * @private
     * @constant
     */
    var MAX_SIDE = 1010;

    /**
     * Borders of the working height map to exclude from final result,
     * because there are not processed in the smooth function.
     * @type number
     * @private
     * @constant
     */
    var CROP_SIZE = 1;
        
    /**
     * Maximum elevation for current map [0 to p_pitch].
     * <br />
     * You will have to adjust the color managment in "jowe-ui" to fit your elevation.
     * @type number
     * @private
     */
    var p_pitch = 8;
        
    /**
     * Indicates how much height difference between 2 points we can have.
     * Only used in "make" method.
     * <br />
     * By the way, combined with "p_pitch" (previous property),
     * it allows to obtain very different types of map.
     * <br/>
     * For now 3.1 is around the minimum value to use, below that you
     * could obtain strange map (unmanaged cell display).
     * If you put an higher value, your map will look flattened.
     * @type number
     * @private
     */
    var p_ratio = 3.1;

    /**
     * Size of the current map [0 to p_side], [0 to p_side].
     * <br />
     * Always have to be (N^2)+1 x (N^2)+1 ("diamond square" algorithm. Better looking results with squares).
     * We only need to store it once (p_side = width = height).
     * @type number
     * @private
     */
    var p_side = 129,
        
        // "real" dimension of the current object (not resized to 2^n square) and not cropped.
        width = 127,
        height = 127,
        
        // Random object/class.
        rand;

    /**
     * Shorcut to Math function.
     * <br />
     * Used to "speed up" calls to Math.floor() function.
     * @function
     * @private
     */
    var floor = Math.floor;
    
    /**
     * Result array with the world map.
     * @type Array
     * @public
     */
    this.item = [];
    
    /**
     * Initialize the item array before calling the generator method.
     * The whole item array is filled with the default value given as parameter.
     * @param {number} h default value given to each item.
     * @public
     */
    this.initialize = function (h) {
        var x = p_side, a = this.item, b = [];
        a.length = b.length = p_side;
        while (x) b[--x] = h;
        x = p_side;
        while (x) a[--x] = b.slice();
    };
        
    /**
     * Generate a random value between min and max (both included), result is floored.
     * @param {number} min
     * @param {number} max
     * @return {number} Random value.
     * @private
     */
    function p_randomMinMax(min, max) {
        return floor((rand() * ((max - min) + 1)) + min);
    }

    /**
     * Set random value for each corner, needed before calling the generator.
     * <br />
     * Require the item array to be initialized.
     * @param {boolean} overwrite Indicates if existing values should be overwritten.
     * @protected
     */
    this.fillCorners = function (overwrite) {
        var H = this.item;
        if (overwrite || (0 > H[0][0])) {
            H[0][0] = p_randomMinMax(0, p_pitch);
        }
        if (overwrite || (0 > H[p_side - 1][0])) {
            H[p_side - 1][0] = p_randomMinMax(0, p_pitch);
        }
        if (overwrite || (0 > H[p_side - 1][p_side - 1])) {
            H[p_side - 1][p_side - 1] = p_randomMinMax(0, p_pitch);
        }
        if (overwrite || (0 > H[0][p_side - 1])) {
            H[0][p_side - 1] = p_randomMinMax(0, p_pitch);
        }
    };

    /**
     * Initialize each border of the map with the specified value.
     * <br />
     * The item array should be initialized.
     * @param {number} value Default height to be applied.
     * @param {number} borderwidth Width of the border to apply the value.
     * @protected
     */
    this.fillBorders = function (value, borderwidth) {
        var H = this.item, s = p_side - 1, x, y;
        for (x = 0; x < p_side; x += 1) {
            for (y = 0; y < p_side; y += 1) {
                if ((x < borderwidth) || (y < borderwidth)|| (x > (width - borderwidth)) || (y > (height - borderwidth))) {
                  H[x][y] = value;
                }
            }
        }
    };
    
    /**
     * Return a value added with a random delta.
     * <br/>
     * If the delta is more than 0, it adds to "avg" a random value between "-delta" and "+delta".
     * <br />
     * In fact it sets the height between two points. The closer there are, the lower the delta will be.
     * The function ensure that the result is positive and less than the pitch (max height).
     * <br />
     * @param {number} avg
     * @param {number} delta
     * @return {number}
     * @private
     */
    function p_addDelta(avg, delta) {
        if (delta) avg += ((((delta * 2) + 1) * rand()) - delta);
        return (p_pitch < avg) ? p_pitch : (0 > avg) ? 0 : floor(avg);
    }
    
    /**
     * Generate a random map.
     * <br />
     * Parameters indicates "top/left", "right/bottom" limits, and "middle" coordinates.
     * <br />
     * Caution : this function only works with 2^n squares, as it goes recursively with divide by 2.
     * @param {number} x1 x coordinate of the top 
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} xm
     * @param {number} ym
     * @protected
     */
    this.make = function (x1, y1, x2, y2, xm, ym) {
        // Notice : Removing floor below could produce more realistics maps (it adds more noise).
                 // Should it be set by default ? Next "floor" is done in p_addDelta().
                 // (caution : it takes more time on FF when removed).
        var delta = floor((x2 - xm) / p_ratio),
            xmym = 0, H = this.item,
            x1y1  = H[x1][y1],
            x2y2  = H[x2][y2],
            x1y2  = H[x1][y2],
            x2y1  = H[x2][y1];

        // Set a random height for the middle of the current square.
        // p_addDelta is called with the average height of the 4 points.
        if (0 > H[xm][ym]) H[xm][ym] = p_addDelta((x1y1 + x1y2 + x2y2 + x2y1) / 4, delta);
        xmym = H[xm][ym];
  
        // Set a random height for the middle of the hypotenuse of each triangle.
        // p_addDelta is called with the average height of the 3 points.
        if (0 > H[xm][y1]) H[xm][y1] = p_addDelta((x1y1 + x2y1 + xmym) / 3, delta);
        if (0 > H[xm][y2]) H[xm][y2] = p_addDelta((x1y2 + x2y2 + xmym) / 3, delta);
        if (0 > H[x2][ym]) H[x2][ym] = p_addDelta((x2y1 + x2y2 + xmym) / 3, delta);
        if (0 > H[x1][ym]) H[x1][ym] = p_addDelta((x1y1 + x1y2 + xmym) / 3, delta);

        // Go on if there's space left to fill between points.
        if (((x2 - x1) > 2) || ((y2 - y1) > 2)) {
            delta = (xm - x1) / 2;
            this.make(xm, ym, x2, y2, xm + delta, ym + delta);
            this.make(x1, ym, xm, y2, xm - delta, ym + delta);
            this.make(x1, y1, xm, ym, xm - delta, ym - delta);
            this.make(xm, y1, x2, ym, xm + delta, ym - delta);
        }
    };

    /**
     * Set cells height to be closer to other adjacent cells.
     * @protected
     */
    this.smooth = function () {
        var H = this.item, x = 0, y = 0, sum = 0, s = p_side - 1, xm1 = [], xp1 = [], x0 = [];
        // Goes through every lines and columns except first and last one,
        // because "sum" below takes every items around the current one.
        for (xm1 = H[x], x = 1, x0 = H[x]; x < s; x += 1) {
            xp1 = H[x + 1];
            for (y = 1, sum = x0[1]; y < s; y += 1) {
                sum += (xm1[y - 1] + xm1[y] + xm1[y + 1] + x0[y] + x0[y + 1] + xp1[y - 1] + xp1[y] + xp1[y + 1]);
                sum = floor((4 < (sum % 9) ? 1 : 0) + (sum / 9));
                if (p_pitch < sum) sum = p_pitch;
                x0[y] = sum;
            }
            xm1 = x0;
            x0 = xp1;
        }
    };

    /**
     * Crop the current map according to specific size.
     * <br />
     * The internal "item" array will then be reduced.
     * @param {number} [opt_width] Width of the cropped map.
     * @param {number} [opt_height] Height of the cropped map.
     * @protected
     */
    this.crop = function (opt_width, opt_height) {
        // Initialise width and height if not specified.
        opt_width  = typeof opt_width  != 'undefined' ? opt_width  : width;
        opt_height = typeof opt_height != 'undefined' ? opt_height : height;
        
        var a = this.item.slice(CROP_SIZE, opt_width + CROP_SIZE),
            hc = opt_height + CROP_SIZE,
            x = a.length;
        while (x--) a[x] = a[x].slice(CROP_SIZE, hc);
        this.item = a;
    };

    /**
     * Copy data from another map to the current object at x, y coordinates.
     * @param {array} source Source array that whose values will replace a part of the internal map array.
     * @param {number} from_x X coordinate of the item array to start the copy
     * @param {number} from_y Y coordinate of the item array to start the copy
     * @protected
     */
    this.copy = function (source, from_x, from_y) {
        var D = this.item, S = source.item, x, y;
        for (x = 0; x < S.length; x += 1) 
            for (y = 0; y < S[0].length ; y += 1)
                D[from_x + x][from_y + y] = S[x][y];
    };
    
    /**
     * This is a shortcut to call function make() with default parameters.
     * <br />
     * All necessary variables should have been initialized.
     * <br />
     * The "item" array will be set to "-1" if not already done.
     * @protected
     */
    this.makeMap = function () {
        // Initialize the "item" array with default height to -1
        // and corners set to random values.
        if (this.item.length < 1) {
          this.initialize(-1);
          this.fillCorners(true);
        }
        // Do map!
        this.make(0, 0, p_side - 1, p_side - 1, floor((p_side - 1) / 2), floor((p_side - 1) / 2));
    };
    
    /**
     * Allow you to set a seed used to regenerate identical maps over multiple calls.
     * @param {*} [opt_seed] Seed used to generate the current map.
     * @protected
     */
    this.setAleaSeed = function (opt_seed) {
        // Use Alea() if exists.
        if (typeof Alea != 'undefined') {
            if ((typeof opt_seed == 'undefined') || (opt_seed == null)) {
                rand = Alea();
            } else {
                // Use "opt_seed" if any.
                rand = Alea(opt_seed);
            }
        }
    };
    
    /**
     * Build a map (size is 0-based).
     * <br />
     * doMap(5, 10) will return a map with dimension [0 .. 4][0 .. 9]
     * but as we need 2 points to make a cell we'll have 4x9 cells (= 36 true cells displayed).
     * @example
     * var oMap = new HeightMap(99, 0.54);
     * oMap.doMap(14, 34);
     * @param {number} p_width
     * @param {number} p_height
     * @param {boolean} [bInitialize=true] Tell to the function to goes through an initialization of the map array.
     *                              Then will call "SetSide", "initialize" and "fillcorners" with default values.
     * @protected
     */
    this.doMap = function (p_width, p_height, bInitialize) {
    
        if ((typeof bInitialize == 'undefined') || (bInitialize === null) || (bInitialize === true)) {
            // Initialize side width.
            this.setSide(p_width, p_height);
            
            // To test speed, uncomment line below :
            // if (isdebug) dbg_date[2] = new Date();
            
            // Initialize height.
            this.initialize(-1);
            // Initialize corners.
            this.fillCorners(true);
        }
        // To test speed, uncomment line below :
        // if (isdebug) dbg_date[3] = new Date();

        // Do map!
        this.make(0, 0, p_side - 1, p_side - 1, floor((p_side - 1) / 2), floor((p_side - 1) / 2));
        
        // To test speed, uncomment line below :
        // if (isdebug) dbg_date[4] = new Date();
 
        // Smooth height map to remove weird points.
        this.smooth();
        
        // To test speed, uncomment line below :
        // if (isdebug) dbg_date[5] = new Date();

        // Crop the working map to get the requested map.
        this.crop();

        // To test speed, uncomment line below :
        // if (isdebug) dbg_date[6] = new Date();
    };
    
    /**
     * Calculate the side of the "square" used to generate the random heightmap.
     * @param {number} [opt_width]
     * @param {number} [opt_height]
     * @return {number} calculated side to be used
     * @protected
     */
    this.setSide = function (opt_width, opt_height) {
        // Default values if none provided.
        // It also limits size to [MAX_SIDE]x[MAX_SIDE], to avoid big generation time.
        if ((opt_width !== undefined) && (opt_width !== null) && (!isNaN(opt_width)) && (opt_width > MIN_SIDE) && (opt_width < MAX_SIDE)) {
            width = floor(opt_width);
        } else {
            width = 127;
        }
        if ((opt_height !== undefined) && (opt_height !== null) && (!isNaN(opt_height)) && (opt_height > MIN_SIDE) && (opt_height < MAX_SIDE)) {
            height = floor(opt_height);
        } else {
            height = 127;
        }
        // We'll exclude all the border lines to avoid weird point,
        // so we enlarge the map size with (width+2) and (height+2).
        opt_width += (2 * CROP_SIZE);
        opt_height += (2 * CROP_SIZE);

        // Core engine (function make) works only with squares.
        // (BTW, we also have better results with 2^N x 2^N maps)
        // Let's keep the bigger side.
        p_side = Math.max(opt_width, opt_height);

        // Look for closest 2^n size (better results from 2^7).
        var n = 4;
        while (Math.pow(2, n) < p_side) {
            n++;
        }
        // At this stage, working size will be ((Math.pow(2, n) + 1) x (Math.pow(2, n) + 1))
        p_side = Math.pow(2, n) + 1;
        
        // Return calculated value.
        return p_side;
    };
    
    if ((opt_pitch !== undefined) && (opt_pitch !== null) && (!isNaN(opt_pitch))) {
        p_pitch = floor(opt_pitch); // Just in case, pitch is floored, need to be an integer.
    }
    if ((opt_ratio !== undefined) && (opt_ratio !== null) && (!isNaN(opt_ratio))) {
        p_ratio = opt_ratio;
    }
    // Set width and height and calculate side for the internal square
    this.setSide(opt_width, opt_height);

    // Use Alea() if exists.
    if (typeof Alea == 'undefined') {
        rand = Math.random;
    } else {
        rand = Alea();
    }
}
