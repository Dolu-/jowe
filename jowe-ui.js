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
Credit for "pnpoly" must go to W. Randolph Franklin available at :
http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

********************************************************************************

 TODO :
- Use of javascript prototype to make functions as methods and encapsulate properties.
  The main purpose of this is to have a "class" to manage grid.
- Optimize management of the "drawcursor" function.
- Include an option management linked to user interface to modify usefull properties.
- In "drawGrid", I'm quite sure it's possible to reduce the offset in the calculation
  of startX and startY. Well, I was too lazy to review the code, so I put higher limits
  than really needed. Not a big issue, but I think we can win some loops.
- Have to finish changes in color management...
- Option to change orientation of the display (North/South/East/West).
- Add tool to rise/sink a cell.
- Add function to save/load map to/from a file.
- Add "minimap".

 */

/*
 * Grid and graphical user interface managment object.
 */

 // Array of color for drawing cells.
var c = [];
//      light off,  normal,  light on
c[0] = ['#FAFAFA','#DADADA','#BABABA']; // white (snow)
c[1] = ['#707070','#505050','#303030']; // gray (mountain)
c[2] = ['#20F220','#10D210','#00B200']; // green (plain)
c[3] = ['#2020E8','#1010C8','#0000A8']; // blue (sea/coast)
c[4] = ['#20209C','#10107C','#00005C']; // dark blue (ocean)


/*
 * Initialize the grid (based on canvas tag).
 * Parameters :
 * canvasGridId is the "id" of the canvas used to display the grid.
 * width is the width of the canvas.
 * height is the height of the canvas.
 * backgroundcolor is the color used for the background of the canvas.
 */
function jowe_grid(canvasId, width, height, backgroundcolor) {

    // Handler to the canvas object used to display the grid.
    this.Grid = null;

    // Array of cells.
    this.Cells = null;

    // (Half) width of a cell in pixels (beware of the 2D perspective).
    this.xSize = 24;

    // How much the cell will be flattened (and so the map will look).
    // (Half) height of a cell in pixels.
    this.yRate = 2.0;
    this.ySize = this.xSize / this.yRate;

    // Rate used to display the height (if less than 2, could "hide" cells behind).
    this.hRate = 3.0;
    this.hSize = this.xSize / this.hRate;

    // To show the grid (stroke).
    this.canvasHeight = 0;
    this.canvasWidth = 0;

    this.bgColor = 0;

    this.loopX = 0;

    // (Left,Top) coordinates of the area used to display the grid.
    this.xOffset = 0;
    this.yOffset = 0;
    // Rotation.
    this.dRotate = 0;

    // Indicates if we display the details of the water.
    this.waterDetails = false;
    // Display a cursor that follow the mouse.
    this.displayCursor = false;
    // Cursor position.
    this.xCursor = -1;
    this.yCursor = -1;

    var cell = function (h) {
        this.x = 0;
        this.y = 0;
        this.h = h;            // Height/Color (based on current height).
        this.I = false;       // Is cell initialized?
        this.Q = true;         // Is quad?
        this.c1 = '#000000';   // Color for quad, or for left triangle (if vertical) or for top triangle (if horizontal)
        this.c2 = '#000000';   // Color for right or bottom triangle
        this.V = true;         // Is vertical? (for triangle only)
    }

    /*
     * [Privileged method] initialize()
     *
     * Initialize the grid with the item array.
     */
    this.initialize = function(item) {

        var x, y, aX = [], iLength = item.length, ixLength = item[0].length;
        if ((this.Cells != null) && (this.Cells.length == iLength) && (this.Cells[0].length == ixLength)) {
            for(x = 0; x < iLength; x++) {
                aX = this.Cells[x];
                for(y = 0; y < ixLength; y++) {
                    aX[y].h = item[x][y];
                    aX[y].I = false;
                    aX[y].Q = aX[y].V = true;
                }
            }

        } else {
            // Build the array of cells with all needed properties.
            this.Cells = [];
            x = this.Cells.length = iLength;
            while (x--) {
                aX = this.Cells[x] = [];
                y = aX.length = ixLength;
                while (y--) aX[y] = new cell(item[x][y]);
            }
        }
    }

    /*
     * [Privileged method] initializeCells()
     *
     * Initialize the cells properties.
     */
    this.initializeCells = function () {

        if (this.Cells == null) {
            return false;
        }
        // Main offset to display the map.
        // (calculated to have no coordinate less than 0 neither X nor Y)
        var yLength = this.Cells[0].length;
        var FromX = (this.xSize * (yLength - 1));
        var FromY = (this.hSize * this.Cells[0][0].h);
        var aX = [], x = this.Cells.length;

        // First stage, calculate (x, y) coordinates.
        while (x--) {
            aX = this.Cells[x];
            // Create an object for each cell with (x,y) coordinate to display it.
            // Height is added as property (not used for now).
            for(var y = 0; y < yLength; y++ ) {

                // Rotation formulae.
                //x' = cos(theta)*(x-xc) - sin(theta)*(y-yc) + xc
                //y' = sin(theta)*(x-xc) + cos(theta)*(y-yc) + yc

                // -90 : cos => 0, sin => -1
                //x' = cos(theta)*(x-xc) - sin(theta)*(y-yc) + xc =  0*(x-xc) - -1*(y-yc) + xc =  y - yc + xc
                //y' = sin(theta)*(x-xc) + cos(theta)*(y-yc) + yc = -1*(x-xc) +  0*(y-yc) + yc = -x + xc + yc

                // 90 : cos => 0, sin => 1
                //x' = cos(theta)*(x-xc) - sin(theta)*(y-yc) + xc =  0*(x-xc) -  1*(y-yc) + xc = -y + yc + xc
                //y' = sin(theta)*(x-xc) + cos(theta)*(y-yc) + yc =  1*(x-xc) +  0*(y-yc) + yc =  x - xc + yc

                // 180 = -180 : cos => -1, sin => 0
                //x' = cos(theta)*(x-xc) - sin(theta)*(y-yc) + xc = -1*(x-xc) -  0*(y-yc) + xc = -x + xc + xc
                //y' = sin(theta)*(x-xc) + cos(theta)*(y-yc) + yc =  0*(x-xc) + -1*(y-yc) + yc = -Y + yc + yc

                aX[y].x = FromX + ((x - y) * this.xSize);
                if ((!this.waterDetails) && (aX[y].h < 2))  {
                    aX[y].y = FromY + ((x + y) * this.ySize) - (2 * this.hSize);
                } else {
                    aX[y].y = FromY + ((x + y) * this.ySize) - (aX[y].h * this.hSize);
                }
            }
        }

        // Set global offset to have grid centered on the canvas.
        this.xOffset = (this.Cells[this.Cells.length - 1][0].x - this.canvasWidth) >> 1; // eq. to math.floor((...) / 2);
        this.yOffset = (this.Cells[this.Cells.length - 1][yLength - 1].y - this.canvasHeight) >> 1; // eq. to math.floor((...) / 2);

        // Calculate the number of cells that can be displayed inside the grid (used in the drawGrid function).
        // We add some more loop to both to take account of height gap.
        this.loopX = ~~(this.canvasWidth / this.xSize) + 3;
    }

    /*
     * [Private method] getColor
     *
     * Return the color from the height and orientation.
     */
    function getColor(h, a, wd) {
        var r = '#000000';
        if (h > 7) {
            r = c[0][a];
        } else if (h > 6) {
            r = c[1][a];
        } else if (h > 2) {
            r = c[2][a];
        } else if (h > 1) {
            if (!wd) {
              r = c[3][1];
            } else {
              r = c[3][a];
            }
        } else {
            if (!wd) {
              r = c[4][1];
            } else {
              r = c[4][a];
            }
        }
        return r;
    }

    /*
     * [Private method] setCell
     *
     * Calculate display type and colors.
     */
     function setCell(obj, cTop, cBottom, cRight, cLeft) {

        // Indicates that the current cell is now initialized!
        obj.I = true;

        if ((cTop === cRight) && (cTop === cLeft) && (cTop === cBottom)) {

            // All same height.
            obj.c1 = getColor(cTop, 1, this.waterDetails);

        } else if ((cTop !== cBottom)
                   && (((cTop === cRight) && (cLeft === cBottom))
                    || ((cTop === cLeft) && (cRight === cBottom)))) {

            //  2x2 same height (opposite side).
            if (cTop > cBottom) {
                obj.c1 = getColor(cTop, 0, this.waterDetails);
            } else {
                obj.c1 = getColor(cBottom, 2, this.waterDetails);
            }

        } else if ((cTop === cBottom) && (cTop === cRight)) {

            //                    =
            // 3 same height :  # - =
            //                    =
            obj.Q = false;
            obj.c2 = getColor(cTop, 1, this.waterDetails);

            if (cTop > cLeft) {
                obj.c1 = getColor(cTop, 0, this.waterDetails);
            } else {
                obj.c1 = getColor(cLeft, 2, this.waterDetails);
            }

        } else if ((cTop === cBottom) && (cTop === cLeft)) {

            //                    =
            // 3 same height :  = - #
            //                    =
            obj.Q = false;
            obj.c1 = getColor(cTop, 1, this.waterDetails);

            if (cTop > cRight) {
                obj.c2 = getColor(cTop, 2, this.waterDetails);
            } else {
                obj.c2 = getColor(cRight, 0, this.waterDetails);
            }

        } else if ((cTop === cLeft) && (cTop === cRight)) {

            //                    =
            // 3 same height :  = - =
            //                    #
            obj.Q = obj.V = false;
            obj.c1 = getColor(cTop, 1, this.waterDetails);

            if (cTop > cBottom) {
                obj.c2 = getColor(cTop, 0, this.waterDetails);
            } else {
                obj.c2 = getColor(cBottom, 2, this.waterDetails);
            }

        } else if ((cRight === cBottom) && (cLeft === cBottom)) {

            //                    #
            // 3 same height :  = - =
            //                    =
            obj.Q = obj.V = false;
            obj.c2 = getColor(cBottom, 1, this.waterDetails);

            if (cTop > cBottom) {
                obj.c1 = getColor(cTop, 0, this.waterDetails);
            } else {
                obj.c1 = getColor(cBottom, 2, this.waterDetails);
            }

        } else if (cTop === cBottom) {

            //                                                =
            // 2 same height (cross side) and 2 other # :   # - #
            //                                                =
            obj.Q = false;

            if (cTop > cLeft) {
                obj.c1 = getColor(cTop, 0, this.waterDetails);        // go up
            } else {
                obj.c1 = getColor(cLeft, 2, this.waterDetails);      // go down
            }

            if (cTop > cRight) {
                obj.c2 = getColor(cTop, 2, this.waterDetails);        // go down
            } else {
                obj.c2 = getColor(cRight, 0, this.waterDetails);      // go up
            }

        } else if (cLeft === cRight) {

            //                                                #
            // 2 same height (cross side) and 2 other # :   = - =
            //                                                #
            obj.Q = obj.V = false;

            if (cRight > cBottom) {
                obj.c2 = getColor(cRight, 0, this.waterDetails);    // Go up
            } else {
                obj.c2 = getColor(cBottom, 2, this.waterDetails);  // Go down
            }

            if (cRight > cTop) {
                obj.c1 = getColor(cRight, 2, this.waterDetails);    // Go down
            } else {
                obj.c1 = getColor(cTop, 0, this.waterDetails);      // Go up
            }
        } else {

            //                                                =
            // 2 same height (cross side) and 2 other # :   # - =
            // (4 variations)                                 #
            obj.Q = obj.V = false;

            if (cRight > cBottom) {
                obj.c2 = getColor(cRight, 0, this.waterDetails);
            } else {
                obj.c2 = getColor(cBottom, 2, this.waterDetails);
            }

            if (cRight > cTop) {
                obj.c1 = getColor(cRight, 0, this.waterDetails);
            } else {
                obj.c1 = getColor(cTop, 2, this.waterDetails);
            }
        }
    }


    // this.rotate = function (deg) {
        // this.dRotate += deg;
        // this.draw();
    // }

    /*
     * [Privileged method] draw()
     *
     * Loop through every uninitialized cell to draw the grid.
     * The function draws the grid column by column.
     *
     */
    this.draw = function () {

        // Reset the canvas (fill the background with default color).
        this.Grid.width = this.Grid.width;
        this.Grid.fillStyle = "#000";
        this.Grid.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        if (this.Cells == null) {
            return false;
        }

        // The "sign" is used to calculate the first cell of the column.
        var sign = 1, w = this.Cells.length - 1, h = this.Cells[0].length - 1;
        var x = 0, y = 0, heightOffset = this.canvasHeight + this.yOffset;

        // Estimate from which cell we have to start displaying the grid, the formula
        // doesn't include the height, so the result may not be accurate. That's why
        // we decrease the "start.X" to be sure having all cells well drawn (avoid black holes).
        // Below, the offset is arbitrary set to "-4" (the same for Y with "-2"),
        // but it is dependant of the maximum elevation of the map and the hSize value.
        // It would be better to calculate it at first initialization.
        var startX = ~~((1 / 2) * ((this.yOffset / this.ySize ) + (this.xOffset / this.xSize) - this.Cells[0].length + 1)) - 4;
        var startY = ~~((1 / 2) * ((this.yOffset / this.ySize ) - (this.xOffset / this.xSize) + this.Cells[0].length - 1)) - 2;
        var cellX, cellY;

        // Set translation to the offset point.
        this.Grid.translate(-this.xOffset, -this.yOffset);

        // We do all loops needed to be sure to fill the whole grid.
        while (x <= this.loopX)
        {
            if ((startX < 0) || (startY < 0)) {
              y = startX < startY ? -startX : -startY;
            } else {
              y = 0;
            }

            cellX = startX + y;
            cellY = startY + y;
            while ((cellX < w) && (cellY < h) && (this.Cells[cellX][cellY].y < heightOffset)) {
                if (this.Cells[cellX + 1][cellY + 1].y >= this.yOffset) {
                    this.drawCell(cellX,cellY);
                }
                cellX++;
                cellY++;
            }

            // When "sign" changes, we go to the next column on the right.
            if (sign > 0) {
                startX++;
            } else {
                startY--;
            }
            sign *= -1;

            x++;
        }

        // Restore the position.
        this.Grid.translate(this.xOffset, this.yOffset);
    }

    /*
     * [Privileged method] drawCell()
     *
     * Draw cell at (cX, cY) coordinates.
     */
    this.drawCell = function (cX, cY, isCursor) {
    
        if ((cX >= 0) && (cX < (this.Cells.length - 1)) && (cY >= 0) && (cY < (this.Cells[0].length - 1))) {
            if (!this.Cells[cX][cY].I) {
                setCell(this.Cells[cX][cY], this.Cells[cX][cY].h, this.Cells[cX+1][cY+1].h, this.Cells[cX+1][cY].h, this.Cells[cX][cY+1].h);
            }

            if ((this.Cells[cX][cY].Q) || (isCursor)) {
                // set color.
                if (isCursor) {
                    this.Grid.fillStyle = "#000";
                } else {
                    this.Grid.fillStyle = this.Cells[cX][cY].c1;
                }

                // Draw cell.
                this.Grid.beginPath();
                this.Grid.moveTo(this.Cells[cX][cY].x     , this.Cells[cX][cY].y     );
                this.Grid.lineTo(this.Cells[cX][cY+1].x   , this.Cells[cX][cY+1].y   );
                this.Grid.lineTo(this.Cells[cX+1][cY+1].x , this.Cells[cX+1][cY+1].y );
                this.Grid.lineTo(this.Cells[cX+1][cY].x   , this.Cells[cX+1][cY].y   );

                this.Grid.fill();

            } else {

                // Set color for first triangle.
                this.Grid.fillStyle = this.Cells[cX][cY].c1;
                this.Grid.beginPath();

                this.Grid.moveTo(this.Cells[cX][cY].x     , this.Cells[cX][cY].y     );
                this.Grid.lineTo(this.Cells[cX][cY+1].x   , this.Cells[cX][cY+1].y   );

                if (this.Cells[cX][cY].V) {
                    // Draw left triangle.
                    this.Grid.lineTo(this.Cells[cX+1][cY+1].x , this.Cells[cX+1][cY+1].y );

                } else {
                    // Draw top triangle.
                    this.Grid.lineTo(this.Cells[cX+1][cY].x   , this.Cells[cX+1][cY].y   );
                }
                this.Grid.fill();

                // Set color for second triangle.
                this.Grid.fillStyle = this.Cells[cX][cY].c2;
                this.Grid.beginPath();

                this.Grid.moveTo(this.Cells[cX+1][cY].x     , this.Cells[cX+1][cY].y   );
                if (this.Cells[cX][cY].V) {
                    // Draw right triangle.
                    this.Grid.lineTo(this.Cells[cX][cY].x   , this.Cells[cX][cY].y     );
                } else {
                    // Draw bottom triangle.
                    this.Grid.lineTo(this.Cells[cX][cY+1].x , this.Cells[cX][cY+1].y   );
                }
                this.Grid.lineTo(this.Cells[cX+1][cY+1].x   , this.Cells[cX+1][cY+1].y );
                this.Grid.fill();
            }

            // For debug purpose, display (x,y) of each cell in it.
            //Grid.fillStyle = "rgba(240,0,0,0.95)";
            //Grid.fillText(cX + "," + cY, Cells[cX][cY+1].x - xOffset + hSize, Cells[cX][cY+1].y - yOffset);
        }
    }

    /*
     * [Privileged method] setZoom()
     *
     * Set new size for cells.
     */
    this.setZoom = function(iZoom) {
      this.xSize = iZoom * 6.0;
      this.ySize = this.xSize / this.yRate;
      this.hSize = this.xSize / this.hRate;

      if (this.Cells != null) {
          this.initializeCells();
          this.draw();
      }
    }

    /*
     * [Privileged method] move()
     *
     * Move grid to new position.
     * Parameters are relatives to the current position.
     * The function check to avoid moving beyond grid visibility.
     */
    this.move = function(x_offset, y_offset) {
        var a = this.Cells;
        var l = a.length - 1;

        if (a[l][0].x > this.canvasWidth) {
          if ((this.xOffset + x_offset) < -this.xSize) {
              this.xOffset = -this.xSize;
          } else if ((this.xOffset + x_offset) > (a[l][0].x + this.xSize - this.canvasWidth)) {
              this.xOffset = (a[l][0].x + this.xSize - this.canvasWidth);
          } else {
              this.xOffset += x_offset;
          }
        }
        if (a[l][a[0].length - 1].y > this.canvasHeight) {
          if ((this.yOffset + y_offset) < -this.ySize) {
              this.yOffset = -this.ySize;
          } else if ((this.yOffset + y_offset) > (a[l][a[0].length - 1].y + this.ySize - this.canvasHeight)) {
              this.yOffset = (a[l][a[0].length - 1].y + this.ySize - this.canvasHeight);
          } else {
              this.yOffset += y_offset;
          }
        }
        // Refresh grid.
        this.draw();
    }


    /*
     * [Private method] pnpoly()
     *
     * This function find if a point lies within a polygon.
     * nvert          Number of vertices in the polygon.
     * vertx, verty   Arrays containing the x- and y-coordinates of the polygon's vertices.
     * testx, testy   X- and y-coordinate of the test point.
     */
    function pnpoly(nvert, vertx, verty, testx, testy) {
        var i, j, c = false;
        for (i = 0, j = nvert-1; i < nvert; j = i++) {
            if ( ((verty[i]>testy) !== (verty[j]>testy)) &&
                (testx < (vertx[j]-vertx[i]) * (testy-verty[i]) / (verty[j]-verty[i]) + vertx[i]) )
                c = !c;
        }
        return c;
    }

    /*
     * [Private method] testpnpoly()
     *
     * Construct array from specified cell and call the pnpoly function.
     */
    this.testpnpoly = function (xMouse, yMouse, xCell, yCell) {
        var ret = false;
        if ((xCell >= 0) && (xCell < (this.Cells.length - 1)) && (yCell >= 0) && (yCell < (this.Cells[0].length - 1))) {
            var vertx = [], verty = [];
            vertx[0] = this.Cells[xCell  ][yCell  ].x - this.xOffset;
            vertx[1] = this.Cells[xCell  ][yCell+1].x - this.xOffset;
            vertx[2] = this.Cells[xCell+1][yCell+1].x - this.xOffset;
            vertx[3] = this.Cells[xCell+1][yCell  ].x - this.xOffset;
            verty[0] = this.Cells[xCell  ][yCell  ].y - this.yOffset;
            verty[1] = this.Cells[xCell  ][yCell+1].y - this.yOffset;
            verty[2] = this.Cells[xCell+1][yCell+1].y - this.yOffset;
            verty[3] = this.Cells[xCell+1][yCell  ].y - this.yOffset;
            ret = pnpoly(4, vertx, verty, xMouse, yMouse);
        }
        return ret;
    }

    /*
     * [Privileged method] drawCursor()
     *
     * Draw the cursor at position (x, y).
     *
     * This function is not well accurate because it doesn't care of the height of the cell
     * in the calculation of the position related to the mouse coordinates.
     * TODO:
     * Optimize the "testpnpoly" loop...
     *
     */
    this.drawCursor = function (x, y, firstDraw) {

        if (this.displayCursor === true) {
            if ((firstDraw === undefined) || (firstDraw === false)) {
                this.hideCursor();
            }
            // Calulate the position of the mouse in cell coordinates.
            this.xCursor = ~~(((1.0 / 2.0) * ((  (x + this.xOffset) / this.xSize) - this.Cells[0].length + 1.0 + ((y + this.yOffset) / this.ySize))));
            this.yCursor = ~~(((1.0 / 2.0) * ((- (x + this.xOffset) / this.xSize) + this.Cells[0].length - 1.0 + ((y + this.yOffset) / this.ySize))));

            var iLoop = 0, iX = 0, iY = 0;

            if (this.testpnpoly(x, y, this.xCursor, this.yCursor) == false) {
                while (iLoop < 3) {
                    iX--;
                    iY++;
                    if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true) {
                        this.xCursor += iX;
                        this.yCursor += iY;
                        break;
                    }
                    if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true) {
                        this.xCursor -= iX;
                        this.yCursor -= iY;
                        break;
                    }

                    iY--;
                    if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true) {
                        this.xCursor += iX;
                        this.yCursor += iY;
                        break;
                    }
                    if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true) {
                        this.xCursor -= iX;
                        this.yCursor -= iY;
                        break;
                    }

                    iX++;
                    iY--;
                    if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true) {
                        this.xCursor += iX;
                        this.yCursor += iY;
                        break;
                    }
                    if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true) {
                        this.xCursor -= iX;
                        this.yCursor -= iY;
                        break;
                    }

                    iX--;
                    if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true) {
                        this.xCursor += iX;
                        this.yCursor += iY;
                        break;
                    }
                    if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true) {
                        this.xCursor -= iX;
                        this.yCursor -= iY;
                        break;
                    }

                    iLoop++;
                }
            }
            // Set translation to the offset point.
            this.Grid.translate(-this.xOffset, -this.yOffset);

            // Draw cursor.
            this.drawCell(this.xCursor, this.yCursor, true);
            
            // Restore the position.
            this.Grid.translate(this.xOffset, this.yOffset);
        }
    }

    /*
     * [Privileged method] hideCursor()
     *
     * Remove the cursor from grid.
     * Basically, redraws the cell where the cursor was the last time.
     */
    this.hideCursor = function () {
        // Set translation to the offset point.
        this.Grid.translate(-this.xOffset, -this.yOffset);
        
        this.drawCell(this.xCursor, this.yCursor);
        
        // Restore the position.
        this.Grid.translate(this.xOffset, this.yOffset);
    }

    /*
     * [Privileged method] toggleCursor()
     *
     * Toggle cursor state (enabled/disabled).
     */
    this.toggleCursor = function () {

      if (!this.displayCursor) {
        this.displayCursor = true;
        this.drawCursor(-1, -1, true);
      } else {
        this.displayCursor = false;
        this.hideCursor();
      }
    }

    var canvas = document.getElementById(canvasId);
    // Test for canvas availability.
    if (canvas.getContext) {
        this.Grid = canvas.getContext("2d");

        this.bgColor = backgroundcolor;
        this.canvasWidth = width;
        this.canvasHeight = height;

        this.Grid.fillStyle = "#000";
        this.Grid.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        return true;
    } else {
        return false;
    }

}

/*
 * Initialize the grid (based on canvas tag).
 * Parameters :
 * canvasGridId is the "id" of the canvas used to display the grid.
 * width is the width of the canvas.
 * height is the height of the canvas.
 * backgroundcolor is the color used for the background of the canvas.
 */
function jowe_minimap(canvasId, canvasWidth, canvasHeight, canvasBackColor, gridObject) {

    var width = canvasWidth, height = canvasHeight, backcolor = canvasBackColor;
    var grid = gridObject;
    var canvas = document.getElementById(canvasId);

    this.Minimap = null;

    // Test for canvas availability.
    if (canvas.getContext) {
        this.Minimap = canvas.getContext("2d");
        this.Minimap.fillStyle = backcolor;
        this.Minimap.fillRect(0, 0, width, height);
    }

    /*
     * [Privileged method] resize()
     *
     * Set new size for the minimap.
     */
    this.resize = function(canvasWidth, canvasHeight) {
        canvas.width = width = canvasWidth;
        canvas.height = height = canvasHeight;
        this.Minimap.fillStyle = backcolor;
        this.Minimap.fillRect(0, 0, width, height);
        this.draw();
    }

    /*
     * [Privileged method] draw()
     *
     * Draw the minimap.
     */
    this.draw = function() {
        if ((this.Minimap != null) && (grid != null) && (grid.Cells != null)) {
            var w = grid.Cells.length, h = grid.Cells[0].length, i = 0;

            // Create temporary/working canvas.
            var tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = w;
            tmpCanvas.height = h;
            var tmpContext = tmpCanvas.getContext('2d');

            var imgmap = tmpContext.createImageData(w, h);
            var pixel = imgmap.data;
            for(var y = 0; y < h; y++)
                for(var x = 0; x < w; x++) {
                    pixel[i++] = grid.Cells[x][y].h * 30 + 4; // R
                    pixel[i++] = grid.Cells[x][y].h * 30 + 4; // G
                    pixel[i++] = grid.Cells[x][y].h * 30 + 4; // B
                    pixel[i++] = 255; // alpha component.
                }

            tmpContext.putImageData(imgmap, 0, 0);
            // Calculation to keep ratio aspect in minimap.
            var ratio = Math.min(height/h, width/w, 1);
            this.Minimap.drawImage(tmpCanvas, 0, 0, w*ratio, h*ratio);
        }
    }

    return (this.Minimap != null);
}
