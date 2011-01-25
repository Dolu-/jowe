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

- The water level should be unique, i.e. we don't need to show different levels on water.
  It has to be displayed in another color (deeper blue).

 TODO :
- Use of javascript prototype to make functions as methods and encapsulate properties.
  The main purpose of this is to have a "class" to manage grid.
- Optimize management of the "drawcursor" function.
- Include an option management linked to user interface to modify usefull properties.
- In "drawGrid", I'm quite sure it's possible to reduce the offset in the calculation
  of startX and startY. Well, I was too lazy to review the code, so I put higher limits
  than really needed. Not a big issue, but I think we can win some loops.
- Change the color management: more colors, reduce size of the 'rgba' string.
- Option to change orientation of the display (North/South/East/West).
- Add tool to rise/sink a cell.
- Add function to save/load map to/from a file.
- Add "minimap".

 */

/*
 * Grid and graphical user interface managment object.
 */

/*
 * Initialize the grid (based on canvas tag).
 * Parameters :
 * canvasGridId is the "id" of the canvas used to display the grid.
 * width is the width of the canvas.
 * height is the height of the canvas.
 * backgroundcolor is the color used for the background of the canvas.
 */
function jowe_grid(canvasGridId, width, height, backgroundcolor) {
    
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

    // Indicates if we display the details of the water.
    this.waterDetails = false;
    // Display a cursor that follow the mouse.
    this.displayCursor = false;
    // Cursor position.
    this.xCursor = -1;
    this.yCursor = -1;

    var canvas = document.getElementById(canvasGridId);
    // Test for canvas availability.
    if (canvas.getContext) {
        this.Grid = canvas.getContext("2d");

        this.bgColor = backgroundcolor;
        this.canvasWidth = width;
        this.canvasHeight = height;

        this.Grid.fillStyle = "rgb(0,0,0)";
        this.Grid.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        return true;
    } else {
        return false;
    }
}

/*
 * Initialize the grid with the item array.
 */
jowe_grid.prototype.initializeGrid = function (item) {

    // Build the array of cells with all needed properties.
    this.Cells = [];
    this.Cells.length = item.length;
    for(var x = 0; x < item.length; x++) {
        this.Cells[x] = [];
        this.Cells[x].length = item[x].length;
        for(var y = 0; y < item[x].length; y++) {
            this.Cells[x][y] = {
                x: 0, y: 0,
                h: item[x][y],  // Color (based on current height).
                Q: true,        // Is quad?
                c1: '0,0,0,0.',  // Color for quad, or for left triangle (if vertical) or for top triangle (if horizontal)
                a1: 80,          // Alpha value for color c1
                c2: '0,0,0,0.',  // Color for right or bottom triangle
                a2: 80,          // Alpha value for color c2
                V: true         // Is vertical? (for triangle only)
            };
        }
    }
}

/*
 * Return the color from the height.
 */
jowe_grid.prototype.getColor = function(x, y) {
    var c = '0,0,0,0.';
    if (this.Cells[x][y].h > 7) {
        c = '250,250,250,0.'; // white
    } else if (this.Cells[x][y].h > 6) {
        c = '80,80,80,0.'; // gray
    } else if (this.Cells[x][y].h > 2) {
        c = '0,210,0,0.'; // green
    } else if (this.Cells[x][y].h > 1) {
        c = '0,0,200,0.'; // blue => alpha value is forced to have soft transition with lower level
        if (!this.waterDetails) c += '80';
    } else {
        c = '0,0,140,0.'; // dark blue => alpha value is forced to have soft transition with lower level
        if (!this.waterDetails) c += '80';
    }
    return c;
}

/*
 * Initialize the cells properties.
 */
jowe_grid.prototype.initializeCells = function () {
    // Main offset to display the map.
    // (calculated to have no coordinate less than 0 neither X nor Y)
    var FromX = (this.xSize * (this.Cells[0].length - 1));
    var FromY = (this.hSize * this.Cells[0][0].h);

    // First stage, calculate (x, y) coordinates.
    for(var x = 0; x < this.Cells.length; x++ )
    {
        // Create an object for each cell with (x,y) coordinate to display it.
        // Height is added as property (not used for now).
        for(var y = 0; y < this.Cells[0].length; y++ )
        {
            this.Cells[x][y].x = FromX + ((x - y) * this.xSize);
            if ((!this.waterDetails) && (this.Cells[x][y].h < 2))  {
                this.Cells[x][y].y = FromY + ((x + y) * this.ySize) - (2 * this.hSize);
            } else {
                this.Cells[x][y].y = FromY + ((x + y) * this.ySize) - (this.Cells[x][y].h * this.hSize);
            }
        }
    }
    // Second stage, calculate display type and colors.
    for(var cX = 0; cX < (this.Cells.length - 1); cX++)
        for(var cY = 0; cY < (this.Cells[0].length - 1); cY++)
        {
            if ((this.Cells[cX][cY].h === this.Cells[cX+1][cY].h) &&
                (this.Cells[cX][cY].h === this.Cells[cX][cY+1].h) &&
                (this.Cells[cX][cY].h === this.Cells[cX+1][cY+1].h)) {

                // All same height.
                this.Cells[cX][cY].c1 = this.getColor(cX, cY);

            } else if (((this.Cells[cX][cY].h === this.Cells[cX+1][cY].h)
                && (this.Cells[cX][cY+1].h === this.Cells[cX+1][cY+1].h)
                && (this.Cells[cX][cY].h !== this.Cells[cX+1][cY+1].h))
            || ((this.Cells[cX][cY].h === this.Cells[cX][cY+1].h)
                && (this.Cells[cX+1][cY].h === this.Cells[cX+1][cY+1].h)
                && (this.Cells[cX][cY].h !== this.Cells[cX+1][cY+1].h))) {

                //  2x2 same height (opposite side).
                if (this.Cells[cX][cY].h > this.Cells[cX+1][cY+1].h) {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a1 = 99;
                } else {
                    this.Cells[cX][cY].c1 = this.getColor(cX+1, cY+1);
                    this.Cells[cX][cY].a1 = 60;
                }

            } else if ((this.Cells[cX][cY].h === this.Cells[cX+1][cY+1].h)
                && (this.Cells[cX][cY].h === this.Cells[cX+1][cY].h)) {

                // 3 same height.
                //   =
                // # - =
                //   =
                this.Cells[cX][cY].Q = false;
                this.Cells[cX][cY].c2 = this.getColor(cX, cY);

                if (this.Cells[cX][cY].h > this.Cells[cX][cY+1].h) {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a1 = 99;
                } else {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY+1);
                    this.Cells[cX][cY].a1 = 60;
                }

            } else if ((this.Cells[cX][cY].h === this.Cells[cX+1][cY+1].h) && (this.Cells[cX][cY].h === this.Cells[cX][cY+1].h)) {

                // 3 same height.
                //   =
                // = - #
                //   =
                this.Cells[cX][cY].Q = false;
                this.Cells[cX][cY].c1 = this.getColor(cX, cY);

                if (this.Cells[cX][cY].h > this.Cells[cX+1][cY].h) {
                    this.Cells[cX][cY].c2 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a2 = 60;
                } else {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY);
                    this.Cells[cX][cY].a2 = 99;
                }

            } else if ((this.Cells[cX][cY].h === this.Cells[cX][cY+1].h)
                && (this.Cells[cX][cY].h === this.Cells[cX+1][cY].h)) {

                // 3 same height.
                //   =
                // = - =
                //   #
                this.Cells[cX][cY].Q = false;
                this.Cells[cX][cY].V = false;
                this.Cells[cX][cY].c1 = this.getColor(cX, cY);

                if (this.Cells[cX][cY].h > this.Cells[cX+1][cY+1].h) {
                    this.Cells[cX][cY].c2 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a2 = 99;
                } else {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY+1);
                    this.Cells[cX][cY].a2 = 60;
                }

            } else if ((this.Cells[cX+1][cY].h === this.Cells[cX+1][cY+1].h)
                && (this.Cells[cX][cY+1].h === this.Cells[cX+1][cY+1].h)) {

                // 3 same height.
                //   #
                // = - =
                //   =
                this.Cells[cX][cY].Q = false;
                this.Cells[cX][cY].V = false;
                this.Cells[cX][cY].c2 = this.getColor(cX+1, cY+1);

                if (this.Cells[cX][cY].h > this.Cells[cX+1][cY+1].h) {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a1 = 99;
                } else {
                    this.Cells[cX][cY].c1 = this.getColor(cX+1, cY+1);
                    this.Cells[cX][cY].a1 = 60;
                }

            } else if (this.Cells[cX][cY].h === this.Cells[cX+1][cY+1].h) {

                //  2 same height (cross side) and 2 other #
                //   =                 [cX][cY]
                // # - #      [cX][cY+1]      [cX+1][cY]
                //   =               [cX+1][cY+1]
                this.Cells[cX][cY].Q = false;

                if (this.Cells[cX][cY].h > this.Cells[cX][cY+1].h) {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a1 = 99;        // go up
                } else {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY+1);
                    this.Cells[cX][cY].a1 = 60;        // go down
                }

                if (this.Cells[cX][cY].h > this.Cells[cX+1][cY].h) {
                    this.Cells[cX][cY].c2 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a2 = 60;        // go down
                } else {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY);
                    this.Cells[cX][cY].a2 = 99;        // go up
                }

            } else if (this.Cells[cX][cY+1].h === this.Cells[cX+1][cY].h) {

                //  2 same height (cross side) and 2 other #
                //   #                [cX][cY]
                // = - =     [cX][cY+1]      [cX+1][cY]
                //   #              [cX+1][cY+1]
                this.Cells[cX][cY].Q = false;
                this.Cells[cX][cY].V = false;

                if (this.Cells[cX+1][cY].h > this.Cells[cX+1][cY+1].h) {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY);    // Go up
                    this.Cells[cX][cY].a2 = 99;
                } else {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY+1);  // Go down
                    this.Cells[cX][cY].a2 = 60;
                }

                if (this.Cells[cX+1][cY].h > this.Cells[cX][cY].h) {
                    this.Cells[cX][cY].c1 = this.getColor(cX+1, cY);    // Go down
                    this.Cells[cX][cY].a1 = 60;
                } else {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY);      // Go up
                    this.Cells[cX][cY].a1 = 99;
                }
            } else {

                //  2x2 same height (same side)  and 2 other #
                //  (4 variations)
                //   =
                // # - =
                //   #
                
                this.Cells[cX][cY].Q = false;
                this.Cells[cX][cY].V = false;

                if (this.Cells[cX+1][cY].h > this.Cells[cX+1][cY+1].h) {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY);
                    this.Cells[cX][cY].a2 = 99;
                }
                else {
                    this.Cells[cX][cY].c2 = this.getColor(cX+1, cY+1);
                    this.Cells[cX][cY].a2 = 60;
                }

                if (this.Cells[cX+1][cY].h > this.Cells[cX][cY].h) {
                    this.Cells[cX][cY].c1 = this.getColor(cX+1, cY);
                    this.Cells[cX][cY].a1 = 99;
                } else {
                    this.Cells[cX][cY].c1 = this.getColor(cX, cY);
                    this.Cells[cX][cY].a1 = 60;
                }
            }
        }

    // Set global offset to have grid centered on the canvas.
    this.xOffset = Math.floor((this.Cells[this.Cells.length - 1][0].x - this.canvasWidth) / 2);
    this.yOffset = Math.floor((this.Cells[this.Cells.length - 1][this.Cells[0].length - 1].y - this.canvasHeight) / 2);

    // Calculate the number of cells that can be displayed inside the grid (used in the drawGrid function).
    // We add some more loop to both to take account of height gap.
    this.loopX = Math.floor(this.canvasWidth  / this.xSize) + 3;

    // First display!
    this.draw();
}


/*
 * Loop through every cell to draw the grid.
 * The function draws the grid column by column.
 * 
 */
jowe_grid.prototype.draw = function () {
    // The "sign" is used to calculate the first cell of the column.
    var sign = 1;
    var x = 0, y = 0;
    
    // Estimate from which cell we have to start displaying the grid, the formula
    // doesn't include the height, so the result may not be accurate. That's why
    // we decrease the "start.X" to be sure having all cells well drawn (avoid black holes).
    // Below, the offset is arbitrary set to "-3" (the same for Y with "-2"),
    // but it is dependant of the maximum elevation of the map and the hSize value.
    // It would be better to calculate it at first initialization.
    var start = {
        X : Math.floor((1 / 2) * ((this.yOffset / this.ySize ) + (this.xOffset / this.xSize) - this.Cells[0].length + 1)) - 3,
        Y : Math.floor((1 / 2) * ((this.yOffset / this.ySize ) - (this.xOffset / this.xSize) + this.Cells[0].length - 1)) - 2
    };

    // Reset the canvas (draw the background).
    this.Grid.fillStyle = "rgb(0,0,0)";
    this.Grid.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // We do all loops needed to be sure to fill the whole grid.
    while (x <= this.loopX)
    {
        if ((start.X < 0) || (start.Y < 0)) {
          y = -Math.min(start.X, start.Y);
        } else {
          y = 0;
        }
    
        while (((start.X + y) < (this.Cells.length - 1))
            && ((start.Y + y) < (this.Cells[0].length - 1))
            && ((this.Cells[start.X + y][start.Y + y].y - this.yOffset) < this.canvasHeight))
        {
            if ((this.Cells[start.X + y + 1][start.Y + y + 1].y - this.yOffset) >= 0)
            {
              this.drawCell(start.X + y,start.Y + y);
            }
            y++;
        }
        
        // When "sign" changes, we go to the next column on the right.
        if (sign > 0) {
            start.X += 1;
        } else {
            start.Y -= 1;
        }
        sign *= -1;
        
        x++;
    }
}


/*
 * Draw cell at (cX, cY) coordinates.
 */
jowe_grid.prototype.drawCell =  function (cX, cY, isCursor) {
    if ((cX >= 0) && (cX < (this.Cells.length - 1)) && (cY >= 0) && (cY < (this.Cells[0].length - 1)))
    {
        if ((this.Cells[cX][cY].Q) || (isCursor))
        {
            // set color.
            if (isCursor) {
                this.Grid.fillStyle = "rgb(0,0,0)";
            } else {
                this.Grid.fillStyle = "rgba(" + this.Cells[cX][cY].c1 + this.Cells[cX][cY].a1 + ")";
            }

            // Draw cell.
            this.Grid.beginPath();

            this.Grid.moveTo(this.Cells[cX][cY].x     - this.xOffset, this.Cells[cX][cY].y     - this.yOffset);
            this.Grid.lineTo(this.Cells[cX][cY+1].x   - this.xOffset, this.Cells[cX][cY+1].y   - this.yOffset);
            this.Grid.lineTo(this.Cells[cX+1][cY+1].x - this.xOffset, this.Cells[cX+1][cY+1].y - this.yOffset);
            this.Grid.lineTo(this.Cells[cX+1][cY].x   - this.xOffset, this.Cells[cX+1][cY].y   - this.yOffset);

            this.Grid.fill();

        } else {

            // Set color for first triangle.
            this.Grid.fillStyle = "rgba(" + this.Cells[cX][cY].c1 + this.Cells[cX][cY].a1 + ")";
            this.Grid.beginPath();

            this.Grid.moveTo(this.Cells[cX][cY].x     - this.xOffset, this.Cells[cX][cY].y     - this.yOffset);
            this.Grid.lineTo(this.Cells[cX][cY+1].x   - this.xOffset, this.Cells[cX][cY+1].y   - this.yOffset);

            if (this.Cells[cX][cY].V) {
                // Draw left triangle.
                this.Grid.lineTo(this.Cells[cX+1][cY+1].x - this.xOffset, this.Cells[cX+1][cY+1].y - this.yOffset);

            } else {
                // Draw top triangle.
                this.Grid.lineTo(this.Cells[cX+1][cY].x   - this.xOffset, this.Cells[cX+1][cY].y   - this.yOffset);
            }
            this.Grid.fill();

            // Set color for second triangle.
            this.Grid.fillStyle = "rgba(" + this.Cells[cX][cY].c2 + this.Cells[cX][cY].a2 + ")";
            this.Grid.beginPath();

            this.Grid.moveTo(this.Cells[cX+1][cY].x     - this.xOffset, this.Cells[cX+1][cY].y   - this.yOffset);
            if (this.Cells[cX][cY].V) {
                // Draw right triangle.
                this.Grid.lineTo(this.Cells[cX][cY].x   - this.xOffset, this.Cells[cX][cY].y     - this.yOffset);
            } else {
                // Draw bottom triangle.
                this.Grid.lineTo(this.Cells[cX][cY+1].x - this.xOffset, this.Cells[cX][cY+1].y   - this.yOffset);
            }
            this.Grid.lineTo(this.Cells[cX+1][cY+1].x   - this.xOffset, this.Cells[cX+1][cY+1].y - this.yOffset);
            this.Grid.fill();
        }

        // For debug purpose, display (x,y) of each cell into it.
        //Grid.fillStyle = "rgba(240,0,0,0.95)";
        //Grid.fillText(cX + "," + cY, Cells[cX][cY+1].x - xOffset + hSize, Cells[cX][cY+1].y - yOffset);
    }
}


/*
 * Set new size for cells.
 */
jowe_grid.prototype.setZoom = function(iZoom) {
  this.xSize = iZoom * 6.0;
  this.ySize = this.xSize / this.yRate;
  this.hSize = this.xSize / this.hRate;
  
  if (this.Cells != null)
      this.initializeCells();
}

/*
 * Move grid to new position.
 * Parameters are relatives to the current position.
 * The function check to avoid moving beyond grid visibility.
 */
jowe_grid.prototype.move = function (x_offset, y_offset) {
    
    if (this.Cells[this.Cells.length - 1][0].x > this.canvasWidth) {
      if ((this.xOffset + x_offset) < -this.xSize) {
          this.xOffset = -this.xSize;
      } else if ((this.xOffset + x_offset) > (this.Cells[this.Cells.length - 1][0].x + this.xSize - this.canvasWidth)) {
          this.xOffset = (this.Cells[this.Cells.length - 1][0].x + this.xSize - this.canvasWidth);
      } else {
          this.xOffset += x_offset;
      }
    }
    if (this.Cells[this.Cells.length - 1][this.Cells[0].length - 1].y > this.canvasHeight) {
      if ((this.yOffset + y_offset) < -this.ySize) {
          this.yOffset = -this.ySize;
      } else if ((this.yOffset + y_offset) > (this.Cells[this.Cells.length - 1][this.Cells[0].length - 1].y + this.ySize - this.canvasHeight)) {
          this.yOffset = (this.Cells[this.Cells.length - 1][this.Cells[0].length - 1].y + this.ySize - this.canvasHeight);
      } else {
          this.yOffset += y_offset;
      }
    }
    // Refresh grid.
    this.draw();
}


/*
 * This function find if a point lies within a polygon.
 * nvert          Number of vertices in the polygon.
 * vertx, verty   Arrays containing the x- and y-coordinates of the polygon's vertices.
 * testx, testy   X- and y-coordinate of the test point. 
 */
function pnpoly(nvert, vertx, verty, testx, testy)
{
    var i, j, c = false;
    for (i = 0, j = nvert-1; i < nvert; j = i++) {
        if ( ((verty[i]>testy) !== (verty[j]>testy)) &&
            (testx < (vertx[j]-vertx[i]) * (testy-verty[i]) / (verty[j]-verty[i]) + vertx[i]) )
            c = !c;
    }
    return c;
}


jowe_grid.prototype.testpnpoly = function (xMouse, yMouse, xCell, yCell) {
  var ret = false;
  if ((xCell >= 0) && (xCell < (this.Cells.length - 1)) && (yCell >= 0) && (yCell < (this.Cells[0].length - 1)))
  {
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
 * Draw the cursor at position (x, y).
 *
 * This function is not well accurate because it doesn't care of the height of the cell
 * in the calculation of the position related to the mouse coordinates.
 * TODO:
 * Optimize the "testpnpoly" loop...
 *
 */
jowe_grid.prototype.drawCursor = function (x, y, firstDraw) {
    
    if (this.displayCursor === true)
    {
    
        if((firstDraw === undefined) || (firstDraw === false) )
        {
            this.hideCursor();
        }
        // Calulate the position of the mouse in cell coordinates.
        this.xCursor = Math.floor(((1.0 / 2.0) * ((  (x + this.xOffset) / this.xSize) - this.Cells[0].length + 1.0 + ((y + this.yOffset) / this.ySize))));
        this.yCursor = Math.floor(((1.0 / 2.0) * ((- (x + this.xOffset) / this.xSize) + this.Cells[0].length - 1.0 + ((y + this.yOffset) / this.ySize))));

        var iLoop = 0, iX = 0, iY = 0;
        
        if (this.testpnpoly(x, y, this.xCursor, this.yCursor) == false)
        {

          while (iLoop < 3)
          {
            iX--;
            iY++;
            if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true)
            {
              this.xCursor += iX;
              this.yCursor += iY;
              break;
            }
            if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true)
            {
              this.xCursor -= iX;
              this.yCursor -= iY;
              break;
            }

            iY--;
            if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true)
            {
              this.xCursor += iX;
              this.yCursor += iY;
              break;
            }
            if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true)
            {
              this.xCursor -= iX;
              this.yCursor -= iY;
              break;
            }
            
            iX++;
            iY--;
            if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true)
            {
              this.xCursor += iX;
              this.yCursor += iY;
              break;
            }
            if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true)
            {
              this.xCursor -= iX;
              this.yCursor -= iY;
              break;
            }

            iX--;
            if (this.testpnpoly(x, y, this.xCursor + iX, this.yCursor + iY) == true)
            {
              this.xCursor += iX;
              this.yCursor += iY;
              break;
            }
            if (this.testpnpoly(x, y, this.xCursor - iX, this.yCursor - iY) == true)
            {
              this.xCursor -= iX;
              this.yCursor -= iY;
              break;
            }
            
            iLoop++;
          }
        }
        // Draw cursor.
        this.drawCell(this.xCursor, this.yCursor, true);
    }
}

/*
 * Remove the cursor from grid.
 * Basically, redraws the cell where the cursor was the last time.
 */
jowe_grid.prototype.hideCursor = function () {
    this.drawCell(this.xCursor, this.yCursor);
}

/*
 * Toggle cursor state (enabled/disabled).
 */
jowe_grid.prototype.toggleCursor = function () {

  if (!this.displayCursor) {
    this.displayCursor = true;
    this.drawCursor(-1, -1, true);
  } else {
    this.displayCursor = false;
    this.hideCursor();
  }
}
