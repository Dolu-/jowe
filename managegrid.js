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
- Change the color management: more colors, reduce size of the 'rgba' string.
- The water level should be unique, i.e. we don't need to show different levels on water.
  It has to be displayed in another color (deeper blue).
- Option to change orientation of the display (North/South/East/West).
- Add tool to rise/sink a cell.
- Add function to save/load map to/from a file.
- Add "minimap".

 */

// Handler to the canvas object used to display the grid.
var Grid;

// Array of cells.
var Cells = null;

// (Half) Size of cell in pixel (beware of the 2D perspective).
var xSize = 24;

// How much the cell will be flattened (and so the map will look).
var yRate = 2.0;
var ySize = xSize / yRate;

// Rate used to display the height (if less than 2, could "hide" cells behind).
var hRate = 3.0;
var hSize = xSize / hRate;

// To show the grid (stroke).
var bgColor = 0;
var canvasHeight = 0;
var canvasWidth = 0;

var loopX = 0;
var loopY = 0;

// (Left,Top) coordinates of the area used to display the grid.
var xOffset = 0;
var yOffset = 0;

// Display a cursor that follow the mouse.
var displayCursor = false;
// Cursor position.
var xCursor = -1;
var yCursor = -1;

function getColor(x, y)
{
    var c = '0,0,0,0.';
    if (Cells[x][y].h > 6) {
        c = '80,80,80,0.'; // gray
    } else if (Cells[x][y].h > 2) {
        c = '0,210,0,0.'; // green
    } else {
        c = '0,0,200,0.'; // blue
    }
    return c;
}

function generateGrid(w, h)
{
    // Borders of the working height map to exclude from final result.
    var Crop = 1;

    // We'll exclude all the border lines to avoid weird point,
    // so we enlarge the map size with (width+2) and (height+2).

    // For debug purpose, time of grid generation.
    //var date1 = new Date();

    var Map = doHeightMap(w + (2 * Crop), h + (2 * Crop));
    
    // For debug purpose, time of grid generation.
    //var date2 = new Date();
    //dInfo.html((date2.getTime() - date1.getTime()));

    // Crop the working map to get the requested map.
    Cells = [];
    Cells.length = w;
    for(var x = Crop; x < (w + Crop); x++) {
        Cells[x - Crop] = [];
        Cells[x - Crop].length = h;
        for(var y = Crop; y < (h + Crop); y++) {
            Cells[x - Crop][y - Crop] = {
                x: 0,
                y: 0,
                h: Map[x][y],
                Q: true,        // Is quad?
                c1: '0,0,0,0.',  // Color for quad, or for left triangle (if vertical) or for top triangle (if horizontal)
                a1: 80,          // Alpha value for color c1
                c2: '0,0,0,0.',  // Color for right or bottom triangle
                a2: 80,          // Alpha value for color c2
                V: true         // Is vertical? (for triangle only)
            };
        }
    }
    initializeCells();
}


/*
 * Initialize the array of cells with the calculated (x,y) coordinate,
 * so the drawing function has no calculation to do.
 */
function initializeCells() {
    // Main offset to display the map.
    // (calculated to have no coordinate less than 0 neither X nor Y)
    var FromX = (xSize * (Cells[0].length - 1));
    var FromY = (hSize * Cells[0][0].h);

    // First stage, calculate (x, y) coordinates.
    for(var x = 0; x < Cells.length; x++ )
    {
        // Create an object for each cell with (x,y) coordinate to display it.
        // Height is added as property (not used for now).
        for(var y = 0; y < Cells[0].length; y++ )
        {
            Cells[x][y].x = FromX + ((x - y) * xSize);
            Cells[x][y].y = FromY + ((x + y) * ySize) - (Cells[x][y].h * hSize);
        }
    }
    // Second stage, calculate display type and colors.
    for(var cX = 0; cX < (Cells.length - 1); cX++)
        for(var cY = 0; cY < (Cells[0].length - 1); cY++)
        {
            if ((Cells[cX][cY].h === Cells[cX+1][cY].h) &&
                (Cells[cX][cY].h === Cells[cX][cY+1].h) &&
                (Cells[cX][cY].h === Cells[cX+1][cY+1].h)) {

                // All same height.
                Cells[cX][cY].c1 = getColor(cX, cY);

            } else if (((Cells[cX][cY].h === Cells[cX+1][cY].h)
                && (Cells[cX][cY+1].h === Cells[cX+1][cY+1].h)
                && (Cells[cX][cY].h !== Cells[cX+1][cY+1].h))
            || ((Cells[cX][cY].h === Cells[cX][cY+1].h)
                && (Cells[cX+1][cY].h === Cells[cX+1][cY+1].h)
                && (Cells[cX][cY].h !== Cells[cX+1][cY+1].h))) {

                //  2x2 same height (opposite side).
                if (Cells[cX][cY].h > Cells[cX+1][cY+1].h) {
                    Cells[cX][cY].c1 = getColor(cX, cY);
                    Cells[cX][cY].a1 = 99;
                } else {
                    Cells[cX][cY].c1 = getColor(cX+1, cY+1);
                    Cells[cX][cY].a1 = 60;
                }

            } else if ((Cells[cX][cY].h === Cells[cX+1][cY+1].h)
                && (Cells[cX][cY].h === Cells[cX+1][cY].h)) {

                // 3 same height.
                //   =
                // # - =
                //   =
                Cells[cX][cY].Q = false;
                Cells[cX][cY].c2 = getColor(cX, cY);

                if (Cells[cX][cY].h > Cells[cX][cY+1].h) {
                    Cells[cX][cY].c1 = getColor(cX, cY);
                    Cells[cX][cY].a1 = 99;
                } else {
                    Cells[cX][cY].c1 = getColor(cX, cY+1);
                    Cells[cX][cY].a1 = 60;
                }

            } else if ((Cells[cX][cY].h === Cells[cX+1][cY+1].h) && (Cells[cX][cY].h === Cells[cX][cY+1].h)) {

                // 3 same height.
                //   =
                // = - #
                //   =
                Cells[cX][cY].Q = false;
                Cells[cX][cY].c1 = getColor(cX, cY);

                if (Cells[cX][cY].h > Cells[cX+1][cY].h) {
                    Cells[cX][cY].c2 = getColor(cX, cY);
                    Cells[cX][cY].a2 = 60;
                } else {
                    Cells[cX][cY].c2 = getColor(cX+1, cY);
                    Cells[cX][cY].a2 = 99;
                }

            } else if ((Cells[cX][cY].h === Cells[cX][cY+1].h)
                && (Cells[cX][cY].h === Cells[cX+1][cY].h)) {

                // 3 same height.
                //   =
                // = - =
                //   #
                Cells[cX][cY].Q = false;
                Cells[cX][cY].V = false;
                Cells[cX][cY].c1 = getColor(cX, cY);

                if (Cells[cX][cY].h > Cells[cX+1][cY+1].h) {
                    Cells[cX][cY].c2 = getColor(cX, cY);
                    Cells[cX][cY].a2 = 99;
                } else {
                    Cells[cX][cY].c2 = getColor(cX+1, cY+1);
                    Cells[cX][cY].a2 = 60;
                }

            } else if ((Cells[cX+1][cY].h === Cells[cX+1][cY+1].h)
                && (Cells[cX][cY+1].h === Cells[cX+1][cY+1].h)) {

                // 3 same height.
                //   #
                // = - =
                //   =
                Cells[cX][cY].Q = false;
                Cells[cX][cY].V = false;
                Cells[cX][cY].c2 = getColor(cX+1, cY+1);

                if (Cells[cX][cY].h > Cells[cX+1][cY+1].h) {
                    Cells[cX][cY].c1 = getColor(cX, cY);
                    Cells[cX][cY].a1 = 99;
                } else {
                    Cells[cX][cY].c1 = getColor(cX+1, cY+1);
                    Cells[cX][cY].a1 = 60;
                }

            } else if (Cells[cX][cY].h === Cells[cX+1][cY+1].h) {

                //  2 same height (cross side) and 2 other #
                //   =                 [cX][cY]
                // # - #      [cX][cY+1]      [cX+1][cY]
                //   =               [cX+1][cY+1]
                Cells[cX][cY].Q = false;

                if (Cells[cX][cY].h > Cells[cX][cY+1].h) {
                    Cells[cX][cY].c1 = getColor(cX, cY);
                    Cells[cX][cY].a1 = 99;        // go up
                } else {
                    Cells[cX][cY].c1 = getColor(cX, cY+1);
                    Cells[cX][cY].a1 = 60;        // go down
                }

                if (Cells[cX][cY].h > Cells[cX+1][cY].h) {
                    Cells[cX][cY].c2 = getColor(cX, cY);
                    Cells[cX][cY].a2 = 60;        // go down
                } else {
                    Cells[cX][cY].c2 = getColor(cX+1, cY);
                    Cells[cX][cY].a2 = 99;        // go up
                }

            } else if (Cells[cX][cY+1].h === Cells[cX+1][cY].h) {

                //  2 same height (cross side) and 2 other #
                //   #                [cX][cY]
                // = - =     [cX][cY+1]      [cX+1][cY]
                //   #              [cX+1][cY+1]
                Cells[cX][cY].Q = false;
                Cells[cX][cY].V = false;

                if (Cells[cX+1][cY].h > Cells[cX+1][cY+1].h) {
                    Cells[cX][cY].c2 = getColor(cX+1, cY);    // Go up
                    Cells[cX][cY].a2 = 99;
                } else {
                    Cells[cX][cY].c2 = getColor(cX+1, cY+1);  // Go down
                    Cells[cX][cY].a2 = 60;
                }

                if (Cells[cX+1][cY].h > Cells[cX][cY].h) {
                    Cells[cX][cY].c1 = getColor(cX+1, cY);    // Go down
                    Cells[cX][cY].a1 = 60;
                } else {
                    Cells[cX][cY].c1 = getColor(cX, cY);      // Go up
                    Cells[cX][cY].a1 = 99;
                }
            } else {

                //  2x2 same height (same side)  and 2 other #
                //  (4 variations)
                //   =
                // # - =
                //   #
                
                Cells[cX][cY].Q = false;
                Cells[cX][cY].V = false;

                if (Cells[cX+1][cY].h > Cells[cX+1][cY+1].h) {
                    Cells[cX][cY].c2 = getColor(cX+1, cY);
                    Cells[cX][cY].a2 = 99;
                }
                else {
                    Cells[cX][cY].c2 = getColor(cX+1, cY+1);
                    Cells[cX][cY].a2 = 60;
                }

                if (Cells[cX+1][cY].h > Cells[cX][cY].h) {
                    Cells[cX][cY].c1 = getColor(cX+1, cY);
                    Cells[cX][cY].a1 = 99;
                } else {
                    Cells[cX][cY].c1 = getColor(cX, cY);
                    Cells[cX][cY].a1 = 60;
                }
            }
        }

    // Set global offset to have grid centered on the canvas.
    xOffset = Math.floor((Cells[Cells.length - 1][0].x - canvasWidth) / 2);
    yOffset = Math.floor((Cells[Cells.length - 1][Cells[0].length - 1].y - canvasHeight) / 2);

    // Calculate the number of cells that can be displayed inside the grid
    // (used in the drawGrid function).
    // loopY is divided by 2 as we draw cells top to bottom, then left to right.
    // We add some more loop to both to take account of height gap.
    loopX = Math.floor(canvasWidth  / xSize) + 3;
    loopY = Math.floor(canvasHeight / (2 * ySize)) + 2;

    // First display!
    drawGrid();
}

/*
 * Draw cell at (cX, cY) coordinates.
 */
function drawCell(cX, cY)
{
    if ((cX >= 0) && (cX < (Cells.length - 1)) && (cY >= 0) && (cY < (Cells[0].length - 1)))
    {
        if (Cells[cX][cY].Q)
        {
            // set color.
            Grid.fillStyle = "rgba(" + Cells[cX][cY].c1 + Cells[cX][cY].a1 + ")";

            // Draw cell.
            Grid.beginPath();

            Grid.moveTo(Cells[cX][cY].x     - xOffset, Cells[cX][cY].y     - yOffset);
            Grid.lineTo(Cells[cX][cY+1].x   - xOffset, Cells[cX][cY+1].y   - yOffset);
            Grid.lineTo(Cells[cX+1][cY+1].x - xOffset, Cells[cX+1][cY+1].y - yOffset);
            Grid.lineTo(Cells[cX+1][cY].x   - xOffset, Cells[cX+1][cY].y   - yOffset);

            Grid.fill();

        } else {

            // Set color for first triangle.
            Grid.fillStyle = "rgba(" + Cells[cX][cY].c1 + Cells[cX][cY].a1 + ")";
            Grid.beginPath();

            Grid.moveTo(Cells[cX][cY].x     - xOffset, Cells[cX][cY].y     - yOffset);
            Grid.lineTo(Cells[cX][cY+1].x   - xOffset, Cells[cX][cY+1].y   - yOffset);

            if (Cells[cX][cY].V) {
                // Draw left triangle.
                Grid.lineTo(Cells[cX+1][cY+1].x - xOffset, Cells[cX+1][cY+1].y - yOffset);

            } else {
                // Draw top triangle.
                Grid.lineTo(Cells[cX+1][cY].x   - xOffset, Cells[cX+1][cY].y   - yOffset);
            }
            Grid.fill();

            // Set color for second triangle.
            Grid.fillStyle = "rgba(" + Cells[cX][cY].c2 + Cells[cX][cY].a2 + ")";
            Grid.beginPath();

            Grid.moveTo(Cells[cX+1][cY].x     - xOffset, Cells[cX+1][cY].y   - yOffset);
            if (Cells[cX][cY].V) {
                // Draw right triangle.
                Grid.lineTo(Cells[cX][cY].x   - xOffset, Cells[cX][cY].y     - yOffset);
            } else {
                // Draw bottom triangle.
                Grid.lineTo(Cells[cX][cY+1].x - xOffset, Cells[cX][cY+1].y   - yOffset);
            }
            Grid.lineTo(Cells[cX+1][cY+1].x   - xOffset, Cells[cX+1][cY+1].y - yOffset);
            Grid.fill();
        }

        // For debug purpose, display (x,y) of each cell into it.
        //Grid.fillStyle = "rgba(240,0,0,0.95)";
        //Grid.fillText(cX + "," + cY, Cells[cX][cY+1].x - xOffset + hSize, Cells[cX][cY+1].y - yOffset);
    }
}

/*
 * Loop through every cell to draw the grid.
 * The function draws the grid column by column.
 * 
 */
function drawGrid()
{
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
        X : Math.floor((1 / 2) * ((yOffset / ySize ) + (xOffset / xSize) - Cells[0].length + 1)) - 3,
        Y : Math.floor((1 / 2) * ((yOffset / ySize ) - (xOffset / xSize) + Cells[0].length - 1)) - 2
    };

    // Reset the canvas (draw the background).
    Grid.fillStyle = "rgb(0,0,0)";
    Grid.fillRect(0, 0, canvasWidth, canvasHeight);

    // We do all loops needed to be sure to fill the whole grid.
    while (x <= loopX)
    {
        if ((start.X < 0) || (start.Y < 0)) {
          y = -Math.min(start.X, start.Y);
        } else {
          y = 0;
        }
    
        while (((start.X + y) < (Cells.length - 1))
            && ((start.Y + y) < (Cells[0].length - 1))
            && ((Cells[start.X + y][start.Y + y].y - yOffset) < canvasHeight))
        {
            if ((Cells[start.X + y + 1][start.Y + y + 1].y - yOffset) >= 0)
            {
              drawCell(start.X + y,start.Y + y);
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

function testpnpoly(xMouse, yMouse, xCell, yCell)
{
  var ret = false;
  if ((xCell >= 0) && (xCell < (Cells.length - 1)) && (yCell >= 0) && (yCell < (Cells[0].length - 1)))
  {
    var vertx = [], verty = [];
    vertx[0] = Cells[xCell  ][yCell  ].x - xOffset;
    vertx[1] = Cells[xCell  ][yCell+1].x - xOffset;
    vertx[2] = Cells[xCell+1][yCell+1].x - xOffset;
    vertx[3] = Cells[xCell+1][yCell  ].x - xOffset;
    verty[0] = Cells[xCell  ][yCell  ].y - yOffset;
    verty[1] = Cells[xCell  ][yCell+1].y - yOffset;
    verty[2] = Cells[xCell+1][yCell+1].y - yOffset;
    verty[3] = Cells[xCell+1][yCell  ].y - yOffset;
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
function drawCursor(x, y, firstDraw)
{
    if (displayCursor === true)
    {
        if((firstDraw === undefined) || (firstDraw === false) )
        {
            hideCursor();
        }
        // Calulate the position of the mouse in cell coordinates.
        xCursor = Math.floor(((1.0 / 2.0) * ((  (x + xOffset) / xSize) - Cells[0].length + 1.0 + ((y + yOffset) / ySize))));
        yCursor = Math.floor(((1.0 / 2.0) * ((- (x + xOffset) / xSize) + Cells[0].length - 1.0 + ((y + yOffset) / ySize))));

        var iLoop = 0, iX = 0, iY = 0;
        
        if (testpnpoly(x, y, xCursor, yCursor) == false)
        {

          while (iLoop < 3)
          {
            iX--;
            iY++;
            if (testpnpoly(x, y, xCursor + iX, yCursor + iY) == true)
            {
              xCursor += iX;
              yCursor += iY;
              break;
            }
            if (testpnpoly(x, y, xCursor - iX, yCursor - iY) == true)
            {
              xCursor -= iX;
              yCursor -= iY;
              break;
            }

            iY--;
            if (testpnpoly(x, y, xCursor + iX, yCursor + iY) == true)
            {
              xCursor += iX;
              yCursor += iY;
              break;
            }
            if (testpnpoly(x, y, xCursor - iX, yCursor - iY) == true)
            {
              xCursor -= iX;
              yCursor -= iY;
              break;
            }
            
            iX++;
            iY--;
            if (testpnpoly(x, y, xCursor + iX, yCursor + iY) == true)
            {
              xCursor += iX;
              yCursor += iY;
              break;
            }
            if (testpnpoly(x, y, xCursor - iX, yCursor - iY) == true)
            {
              xCursor -= iX;
              yCursor -= iY;
              break;
            }

            iX--;
            if (testpnpoly(x, y, xCursor + iX, yCursor + iY) == true)
            {
              xCursor += iX;
              yCursor += iY;
              break;
            }
            if (testpnpoly(x, y, xCursor - iX, yCursor - iY) == true)
            {
              xCursor -= iX;
              yCursor -= iY;
              break;
            }
            
            iLoop++;
          }
        }
        
        // set color.
        Grid.fillStyle = "rgb(0,0,0)";

        // Draw cursor as a quad.
        Grid.beginPath();

        Grid.moveTo(Cells[xCursor  ][yCursor  ].x - xOffset, Cells[xCursor  ][yCursor  ].y - yOffset);
        Grid.lineTo(Cells[xCursor  ][yCursor+1].x - xOffset, Cells[xCursor  ][yCursor+1].y - yOffset);
        Grid.lineTo(Cells[xCursor+1][yCursor+1].x - xOffset, Cells[xCursor+1][yCursor+1].y - yOffset);
        Grid.lineTo(Cells[xCursor+1][yCursor  ].x - xOffset, Cells[xCursor+1][yCursor  ].y - yOffset);

        Grid.fill();
    }
}

/*
 * Remove the cursor from grid.
 * Basically, redraws the cell where the cursor was the last time.
 */
function hideCursor()
{
    drawCell(xCursor, yCursor);
}

/*
 * Move grid to new position.
 * Parameters are relatives to the current position.
 * The function check to avoid moving beyond grid visibility.
 */
function moveGrid(x_offset, y_offset)
{
    if (Cells[Cells.length - 1][0].x > canvasWidth) {
      if ((xOffset + x_offset) < -xSize) {
          xOffset = -xSize;
      } else if ((xOffset + x_offset) > (Cells[Cells.length - 1][0].x + xSize - canvasWidth)) {
          xOffset = (Cells[Cells.length - 1][0].x + xSize - canvasWidth);
      } else {
          xOffset += x_offset;
      }
    }
    if (Cells[Cells.length - 1][Cells[0].length - 1].y > canvasHeight) {
      if ((yOffset + y_offset) < -ySize) {
          yOffset = -ySize;
      } else if ((yOffset + y_offset) > (Cells[Cells.length - 1][Cells[0].length - 1].y + ySize - canvasHeight)) {
          yOffset = (Cells[Cells.length - 1][Cells[0].length - 1].y + ySize - canvasHeight);
      } else {
          yOffset += y_offset;
      }
    }
    // Refresh grid.
    drawGrid();
}

/*
 * Toggle cursor state (enabled/disabled).
 */
function gridToggleCursor()
{
  if(!displayCursor) {
    displayCursor = true;
    drawCursor(-1, -1, true);
  } else {
    displayCursor = false;
    hideCursor();
  }
}
/*
 * Set new size for cells.
 */
function gridSetZoom(iZoom)
{
  xSize = iZoom * 6.0;
  ySize = xSize / yRate;
  hSize = xSize / hRate;
  
  if (Cells != null)
      initializeCells();
}

/*
 * Initialize the grid (based on canvas tag).
 * Parameters :
 * canvasGridId is the "id" of the canvas used to display the grid.
 * width is the width of the canvas.
 * height is the height of the canvas.
 * backgroundcolor is the color used for the background of the canvas.
 */
function initializeGrid(canvasGridId, width, height, backgroundcolor)
{
    var canvas = document.getElementById(canvasGridId);
    // Test for canvas availability.
    if (canvas.getContext) {
        Grid = canvas.getContext("2d");

        bgColor = backgroundcolor;
        canvasWidth = width;
        canvasHeight = height;

        Grid.fillStyle = "rgb(0,0,0)";
        Grid.fillRect(0, 0, canvasWidth, canvasHeight);

        return true;
    } else {
        return false;
    }
}
