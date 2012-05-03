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
Credit for "pnpoly" must go to W. Randolph Franklin available at :
http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

********************************************************************************

 */
 
/**
 * @fileOverview This file contains the jowe_ui_2d_diam object (<a href="http://code.google.com/p/jowe/">jOWE</a>).
 * @author Ludovic Lefebvre
 * @version 1.0
 */

/**
 * Draw a map from a given heightmap object in a canvas tag.
 * @class Draws an map with diamond tiles.
 * @see How to use the <a href="http://jowe.ouebfrance.com/examples-jowe-ui-2d-diam.html">jowe_ui_2d_diam</a> object?
 * @param {string} canvas_id          Id of the canvas tag to be used to draw the map.
 * @param {number} canvas_width       Width of the canvas.
 * @param {number} canvas_height      Height of the canvas.
 * @param {string} [canvas_backcolor="#000"] Background color to be used when drawing the canvas.
 */ 
function jowe_ui_2d_diam(canvas_id, canvas_width, canvas_height, canvas_backcolor) {
    "use strict";
    
    var width,
        height,
        backcolor = '#000',
        canvas_map;

    // Handler to the canvas object used to display the map.
    this.map = null;
        
    //
    this.cursor = {
                    visible: false,
                    x: -1,
                    y: -1,
                    mX: -1,
                    mY: -1,
                    color: "#ff0000"
                  };

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
     * This function draws an map with diamond tiles in the canvas.
     * @param {array} items Array of vertices in the polygon.
     * @param {number} angle Number containing the x-coordinates of the polygon's vertices.
     * @param {number} x_off X-coordinate of the offset point.
     * @param {number} x_off Y-coordinate of the offset point.
     * @param {number} height Height of the diamond tiles.
     * @param {number} width Width of the diamond tiles.
     * @param {array} colors Array of color used to draw the map.
     * @param {number} [alt=0] Determines the style of the map (0 : diamond, 1 : skew, 2 : saw).
     * @param {number} [border=0.4] Defines the space between tiles.
     * @protected
     */
    this.draw = function (items, angle, x_off, y_off, h, w, colors, alt, border) {

        var // used for "for" loops.
            x, y,
            // temporarly x,y coordinates.
            tx, ty,
            mtx, mty,
            wdiv2 = w/2,
            hdiv2 = h/2,
            // distance between tiles.
            dist = 0.4,
            // dimension of the heightmap.
            xc = items.length,
            yc = items[0].length,
            // corners of the drawing zone :
            // pt#[0] = top left
            // pt#[1] = top right
            // pt#[2] = bottom right
            // pt#[3] = bottom left
            ptx = [], pty = [];

        if ((alt == undefined) || (alt == null) || (isNaN(alt)) || (alt < 0) || (alt > 2)) {
          alt = 0;
        }
        if ((border !== undefined) && (border !== null) && (!isNaN(border))) {
            dist = border;
        }
            
        // Initialize the canvas.
        this.map.fillStyle = backcolor;
        this.map.fillRect(0, 0, width, height);
        this.map.width = 1;
        
        // Save the current context before transformations.
        this.map.save();

        // [step 1]
        // Going to the relative position that define the center of the map.
        this.map.translate((width / 2) + x_off, (height / 2) + y_off);
        // [step 2]
        // Rotation according to the user choice.
        // Beware, that's define the pivot point to the center of the map,
        // not to the current center of the canvas.
        // If we want to rotate from the center of the canvas, the offset
        // coordinate needs to be processed accordingly.
        this.map.rotate(-angle * Math.PI/180);
        // [step 3]
        // At last we go in the center of the current map.
        switch (alt) {
          case 1 : // skew map.
            mtx = - ((xc * (w + dist)) - (yc * (wdiv2 + dist))) / 2;
            mty = -(yc * (hdiv2 + dist)) / 2;
            break;
          case 2 : // saw map.
            mtx = (3/4*w)-(xc * (w + dist)) / 2;
            mty = (3/8*h)-(yc * (hdiv2 + dist)) / 2;
            break;
          default: // diamond map.
            mtx = (yc - xc) * (wdiv2 + dist) / 2;
            mty = -((xc + yc) / 2) * (h + dist) / 2;
            break;
        }
        this.map.translate(mtx, mty);

        //
        // TODO : build a smaller rectangle than the canvas and check that at least one of its corner is included
        //        in the rectangle of the map, if not return false.
        //
        
        // Coordinates of the corners of the drawing area.
        // Each tile that's not inside this area won't be drawn.
        ptx[0] = ptx[3] = -(width  / 2) - x_off - (w + dist);
        pty[0] = pty[1] = -(height / 2) - y_off - (h + dist);
        ptx[1] = ptx[2] =  (width  / 2) - x_off + (w + dist);
        pty[2] = pty[3] =  (height / 2) - y_off + (h + dist);
        // Loop to take in account the rotation and the last offset.
        for (var n = 0; n < 4; n += 1) {
            // Rotate the point coordinate.
            tx = Math.floor((Math.cos(angle * Math.PI/180) * ptx[n]) - (Math.sin(angle * Math.PI/180) * pty[n]));
            ty = Math.floor((Math.sin(angle * Math.PI/180) * ptx[n]) + (Math.cos(angle * Math.PI/180) * pty[n]));
            // Then add the dimension of the heightmap according to the last translation (step 3)
            ptx[n] = tx - mtx;
            pty[n] = ty - mty;
            
            /* [uncomment for dev only :]
            */
            this.map.fillStyle = '#00ffff';
            this.map.fillRect(ptx[n] - 2, pty[n] - 2, 4, 4);
        }
        
        /* [uncomment for dev only :]
        */
        this.map.beginPath();
        this.map.width = 1;
        this.map.strokeStyle = '#00ffff';
        this.map.moveTo(ptx[0],pty[0]);
        this.map.lineTo(ptx[1],pty[1]);
        this.map.lineTo(ptx[2],pty[2]);
        this.map.lineTo(ptx[3],pty[3]);
        this.map.lineTo(ptx[0],pty[0]);
        this.map.stroke();

        //
        // TODO : simplify (factorize) calculations to speed up the loop.
        //
        
        //var nb = 0, dr = 0;
        // Going through each tile.
        for (y = 0; y < yc; y += 1) {
            ty = y * ((h + dist) / 2);
            for (x = 0; x < xc; x += 1) {
                // Calculates the "top-left" coordinate of the current tile.
                switch (alt) {
                  case 1 : // skew map.
                    tx = x * (w + dist) - (y * ((w + dist) / 2));
                    break;
                  case 2 : // saw map.
                    tx = x * (w + dist) - ((y % 2) * ((w + dist) / 2));
                    break;
                  default: // diamond map.
                    tx = x * ((w + dist) / 2) - (y * ((w + dist) / 2));
                    ty += ((h + dist) / 2);
                    break;
                }
                // Draws the tile only if it's inside the drawing area.
                if (pnpoly(4, ptx, pty, tx, ty)) {
                    this.map.fillStyle = colors[items[x][y]];
                    this.map.beginPath();
                    this.map.moveTo(tx        , ty - hdiv2);
                    this.map.lineTo(tx + wdiv2, ty        );
                    this.map.lineTo(tx        , ty + hdiv2);
                    this.map.lineTo(tx - wdiv2, ty        );
                    this.map.fill();
                    //dr += 1;
                }
                //nb += 1;
            }
        }
        //console.log('tiles=',nb,'drawn=',dr);
        // Restores the context.
        this.map.restore();
    };

    /**
     * This function find if a point lies within a polygon.
     * @param {number} nvert Number of vertices in the polygon.
     * @param {array} vertx Array containing the x-coordinates of the polygon's vertices.
     * @param {array} verty Array containing the y-coordinates of the polygon's vertices.
     * @param {number} testx X-coordinate of the test point.
     * @param {number} testy Y-coordinate of the test point.
     * @return {boolean}
     * @private
     */
    function pnpoly(nvert, vertx, verty, testx, testy) {     
        var i, j, c = false;
        for (i = 0, j = nvert - 1; i < nvert; j = i++) {
            if (((verty[i] > testy) !== (verty[j] > testy)) &&
                (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
                c = !c;
            }
        }
        return c;
    }
    
    return (this.map != null);
}