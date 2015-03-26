/*
********************************************************************************
jOWE - javascript Opensource Word Engine
https://github.com/Dolu-/jowe
********************************************************************************

Copyright (c) 2010-2015 Ludovic L.

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

 */
 
/**
 * @fileOverview This file contains the jowe_ui_2d_pixel object (<a href="https://github.com/Dolu-/jowe">jOWE</a>).
 * @author Ludovic Lefebvre
 * @version 1.0
 */

/**
 * Draw a map from a given heightmap object in a canvas tag.
 * @class Draws a map with each item in the heightmap array being a pixel.
 * @see How to use the <a href="http://jowe.dolu.fr/examples-jowe-ui-2d-pixel.html">jowe_ui_2d_pixel</a> object?
 * @param {string} canvas_id          Id of the canvas tag to be used to draw the map.
 * @param {number} canvas_width       Width of the canvas.
 * @param {number} canvas_height      Height of the canvas.
 * @param {string} [canvas_backcolor="#000"] Background color to be used when drawing the canvas.
 */ 
function jowe_ui_2d_pixel(canvas_id, canvas_width, canvas_height, canvas_backcolor) {
    "use strict";
    
    var width,
        height,
        backcolor = '#000',
        canvas_map;

    // Handler to the canvas object used to display the map.
    this.map = null;
    // Callback function when map is completed (before context is restored).
    this.onCompleted = false;
    
    if ((canvas_width !== undefined) && (canvas_width !== null) && (!isNaN(canvas_width))) {
        width = canvas_width;
    } else {
        return false;
    }
    if ((canvas_height !== undefined) && (canvas_height !== null) && (!isNaN(canvas_height))) {
        height = canvas_height;
    } else {
        return false;
    }
    if ((canvas_backcolor !== undefined) && (canvas_backcolor !== null)) {
        backcolor = canvas_backcolor;
    }

    canvas_map = document.getElementById(canvas_id);

    // Test for canvas availability.
    if (canvas_map.getContext) {
        canvas_map.width = width;
        canvas_map.height = height;
        this.map = canvas_map.getContext('2d');
        this.map.fillStyle = backcolor;
        this.map.fillRect(0, 0, width, height);
    }

    /**
     * Draw a pixel map.
     * <br />
     * The function generates a true image from the heightmap. Each item becomes a pixel.
     * <br />
     * Even if it's possible to zoom in, it's not recommended as it will produce blurred map.
     * @param {array} items Heightmap to display
     * @param {number} angle To rotate the map (in degree).
     * @param {number} left Left offset from which starting display
     * @param {number} top Top offset from which starting display
     * @param {array} colors Array of colors associated to heightmap.
     * @param {number} [zoom=1] Zoom factor (from 0.1 to 4).
     * @public
     */
    this.draw = function (items, angle, left, top, colors, zoom) {
        
        var // dimension of the heightmap.
            xc = items.length,
            yc = items[0].length,
            // used for "for" loops.
            x, y, i = 0, color,
            // Create temporary/working canvas.
            tmpCanvas = document.createElement('canvas');

        if ((zoom == undefined) || (zoom == null) || (isNaN(zoom)) || (zoom < 0) || (zoom > 4)) {
          zoom = 1;
        }
            
        // Define dimension of the canvas.
        tmpCanvas.width = xc;
        tmpCanvas.height = yc;
        // Initialize the context and image data.
        var tmpContext = tmpCanvas.getContext('2d'),
            imgmap = tmpContext.createImageData(xc, yc),
            pixel = imgmap.data;
        // Colorize each pixel (every 4 values : R,G,B,A)
        for (y = 0; y < yc; y += 1) {
            for (x = 0; x < xc; x += 1) {
                color = colors[items[x][y]];
                pixel[i++] = parseInt(color.substr(1, 2), 16);
                pixel[i++] = parseInt(color.substr(3, 2), 16);
                pixel[i++] = parseInt(color.substr(5, 2), 16);
                pixel[i++] = 250; // alpha component.
            }
        }
        tmpContext.putImageData(imgmap, 0, 0);

        // Reset the canvas (fill the background with default color).
        this.map.width = this.map.width;
        this.map.fillStyle = backcolor;
        this.map.fillRect(0, 0, width, height);

        // Save the current context before transformations.
        this.map.save();
                
        // [step 1]
        // Going to the relative position that define the center of the map.
        this.map.translate((width / 2) + left, (height / 2) + top);
        // [step 2]
        // Rotation according to the user choice.
        // Beware, that's define the pivot point to the center of the map,
        // not to the current center of the canvas.
        // If we want to rotate from the center of the canvas, the offset
        // coordinate needs to be processed accordingly.
        this.map.rotate(-angle * Math.PI/180);
        // [step 3]
        // At last we go to the position of the first tile to be drawn.
        this.map.translate(- xc * zoom / 2, - yc * zoom / 2);
        
        // Display image on canvas.
        this.map.drawImage(tmpCanvas, 0, 0, xc * zoom, yc * zoom);
        
        if (this.onCompleted) {
          this.onCompleted();
        }
        
        // Restores the context.
        this.map.restore();
    };

    this.translateXY = function (x, y, angle, left, top, zoom, xc, yc) {
        var tx = x - (width  / 2) - left,
            ty = y - (height / 2) - top;
        x = Math.floor((Math.cos(angle * Math.PI/180) * tx) - (Math.sin(angle * Math.PI/180) * ty));
        y = Math.floor((Math.sin(angle * Math.PI/180) * tx) + (Math.cos(angle * Math.PI/180) * ty));
        tx = x + (xc * (zoom / 2));
        ty = y + (yc * (zoom / 2));
        return {x:tx,y:ty};
    }

    
    return (this.map != null);
}
