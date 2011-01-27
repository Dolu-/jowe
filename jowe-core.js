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

Details about generation time in milliseconds - for 'doHeightMap()' (beware it's average time) :
Execution time could be extremely different depending on your configuration and many other
several factors, you would have to be really careful by interpreting the results below.
___________________________________________________________________________________________
|                         |                   |         |         |           |           |
| Configuration           | Navigator         | 256x256 | 512x512 | 1024x1024 | 2048x2048 |
|_________________________|___________________|_________|_________|___________|___________|
| Intel T2400@1.83Ghz/2Gb | Google Chrome 8.0 |    50   |   200   |    700    |   2800    |
|                         | Firefox 4.0b9     |   100   |   400   |   1500    |   3300(*) |
|                         | Firefox 3.6 (**)  |   180   |   650   |   2400    |      -    |
|                         |                   |         |         |           |           |

(*) After several calls, generation of large maps takes a lot of time (memory issue?).
It does not occur with smaller ones.
Here is a bunch of time (in ms) that I obtain with several calls in Google Chrome 8.0 (for 2000x2000) :
initialize          =  172    147     95    103
generate            = 1692   1711   1722   1703
smooth              =  811    786    793    773
crop                =  135    186    185    185
doHeightMap (Total) = 2810   2830   2795   2764

(**) It works and time is correct, but it needs to optimize the jowe-ui, as displaying grid
takes time when there are a lot of cell (time is correct with big zoom).

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

function HeightMap(arg_pitch, arg_ratio) {

    // Size of the current map [0 .. _Height], [0 .. _Width].
    // Always have to be N^2 x N^2 ("diamond square" algorithm. Better looking results with squares).
    this.width = 128;
    this.height = 128;
    
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
    
    var that = this;

    var mr = Math.floor;
    /*
     * [Privileged method] initialize()
     *
     * Initialize the array.
     * h is the default height.
     */
    this.initialize = function(h) {
        var x, a = [], b = [], tw = this.width, th = this.height;
        if ((h === undefined) || (h === null)) {
          h = -1;
        }

        b.length = th;
        for (x = 0; x < th; x++) b[x] = h;
        a.length = tw;
        for (x = 0; x < tw; x++) a[x] = b.slice();

        this.item = a;
    }
    
    /*
     * [Private method] randomPitch
     *
     * Return random height between min and max (included).
     */
    function randomPitch(min, max) {
        return mr((Math.random() * ((max - min) + 1)) + min);
    }

    /*
     * [Private method] avgColorFrom4
     *
     * Return the average height of the 4 corners of a square.
     */
    function avgColorFrom4(x1, y1, x2, y2, avg_pitch) {
        var avg = (that.item[x1][y1] + that.item[x1][y2] + that.item[x2][y2] + that.item[x2][y1]) / 4;
        if (0 < avg_pitch) avg += randomPitch(-avg_pitch, avg_pitch);
        avg = mr(avg);
        if (pitch < avg) avg = pitch;
        if (0 > avg) avg = 0;
        return avg;
    }

    /*
     * [Private method] avgColorFrom3
     *
     * Return the average height of 3 points.
     */
    function avgColorFrom3(x1, y1, x2, y2, x3, y3, avg_pitch) {
        var avg = (that.item[x1][y1] + that.item[x2][y2] + that.item[x3][y3]) / 3;
        if (0 < avg_pitch) avg += randomPitch(-avg_pitch, avg_pitch);
        avg = mr(avg);
        if (pitch < avg) avg = pitch;
        if (0 > avg) avg = 0;
        return avg;
    }

    
    /*
     * [Privileged method] generate
     *
     * Generate a random map.
     * Parameters indicates "top/left" and "right/bottom" limits.
     */
    this.generate = function(x1, y1, x2, y2, x_mid, y_mid) {

        var my_pitch = mr((x2 - x_mid) / ratio);

        // Set a random height for the middle of the current square.
        if (0 > this.item[x_mid][y_mid]) this.item[x_mid][y_mid] = avgColorFrom4(x1, y1, x2, y2, my_pitch);
      
        // Set a random height for the middle of the hypotenuse of each triangle.
        if (0 > this.item[x_mid][y1]) this.item[x_mid][y1] = avgColorFrom3(x1, y1, x2, y1, x_mid, y_mid, my_pitch);
        if (0 > this.item[x_mid][y2]) this.item[x_mid][y2] = avgColorFrom3(x1, y2, x2, y2, x_mid, y_mid, my_pitch);
        if (0 > this.item[x2][y_mid]) this.item[x2][y_mid] = avgColorFrom3(x2, y1, x2, y2, x_mid, y_mid, my_pitch);
        if (0 > this.item[x1][y_mid]) this.item[x1][y_mid] = avgColorFrom3(x1, y1, x1, y2, x_mid, y_mid, my_pitch);

        if (((x2 - x1) > 2) || ((y2 - y1) > 2))
        {
            var x_calc = mr((x_mid - x1) / 2);
            var x_mid1 = x_mid - x_calc, x_mid2 = x_mid + x_calc;
            var y_mid1 = y_mid - x_calc, y_mid2 = y_mid + x_calc;

            this.generate(x_mid, y_mid, x2, y2, x_mid2, y_mid2);
            this.generate(x1, y_mid, x_mid, y2, x_mid1, y_mid2);
            this.generate(x1, y1, x_mid, y_mid, x_mid1, y_mid1);
            this.generate(x_mid, y1, x2, y_mid, x_mid2, y_mid1);
        }
    }
    
    /*
     * [Privileged method] fillCorners
     *
     * Set random height for each corner (initialize the map).
     * (called once at initialization)
     */
    this.fillCorners = function(overwrite) {
        if (overwrite || (0 > this.item[0][0]))
            this.item[0][0] = randomPitch(0, pitch);
        if (overwrite || (0 > this.item[this.width - 1][0]))
            this.item[this.width - 1][0] = randomPitch(0, pitch);
        if (overwrite || (0 > this.item[this.width - 1][this.height - 1]))
            this.item[this.width - 1][this.height - 1] = randomPitch(0,pitch);
        if (overwrite || (0 > this.item[0][this.height - 1]))
            this.item[0][this.height - 1] = randomPitch(0, pitch);
    }

    /*
     * [Privileged method] smoothMap
     *
     * Set cells height to be closer to other adjacent cells.
     */
    this.smooth = function() {
        var x, y, sum, w = this.width - 1, h = this.height - 1, xm1 = [], xp1 = [];
        for (x = 1; x < h ; x++) {
            xm1 = this.item[x-1];
            sum = this.item[x][1];
            xp1 = this.item[x+1];
            for (y = 1; y < w ; y++) {

                sum +=  xm1[y-1]  + xm1[y  ]  + xm1[y+1]
                      + this.item[x  ][y  ]
                      + this.item[x  ][y+1]
                      + xp1[y-1]  + xp1[y  ]  + xp1[y+1];
                
                sum = 4 < (sum % 9) ? (sum / 9) + 1 : sum / 9;
                sum = mr(sum);
                
                if (pitch < sum) sum = pitch;
                this.item[x][y] = sum;
            }
        }
    }

    /*
     * [Privileged method] crop
     *
     * Crop current map according to specific size.
     */
    this.crop = function(width, height, cropsize) {
        var x, xmax = width + cropsize, y, ymax = height + cropsize, a = [];
        // Crop the working map to get the requested map.
        for(x = cropsize; x < xmax; x++) {
            a = this.item[x - cropsize];
            for(y = cropsize; y < ymax; y++) {
                a[y - cropsize] = this.item[x][y];
            }
            a.length = height;
        }
        this.item.length = width;
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
        // At this stage, working size will be ((Math.pow(2, n) + 1) x (Math.pow(2, n) + 1))
        this.width = Math.pow(2, n) + 1;
        this.height = Math.pow(2, n) + 1;
        
        // For debug purpose.
        //dbg_date[2] = new Date();
        
        // Initialize height.
        this.initialize();

        // Initialize corners.
        this.fillCorners(true);

        // For debug purpose.
        //dbg_date[3] = new Date();

        // Do map!
        this.generate(0, 0, this.width - 1, this.height - 1,
                        mr((this.width - 1) / 2),
                        mr((this.height - 1) / 2));

        // For debug purpose.
        //dbg_date[4] = new Date();

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
    //dbg_date[1] = new Date();
    
    // We'll exclude all the border lines to avoid weird point,
    // so we enlarge the map size with (width+2) and (height+2).
    myMap.doMap(width + (2 * Crop), height + (2 * Crop));

    // For debug purpose.
    //dbg_date[5] = new Date();

    // Crop the working map to get the requested map.
    myMap.crop(width, height, Crop);

    // For debug purpose.
    //dbg_date[6] = new Date();
}
