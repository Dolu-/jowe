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
This is the Javscript demo file of the jOWE project.

TODO :
- All stuff related to Grid dragging should probably be located elsewhere.
  Not sure it has to be in the "managegrid.js" file.

  */

/*
 * Global objects (jQuery shorcuts).
 *
 * dInfo is the debug info area. All output message will be display here.
 * cGrid is the canvas object.
 * dGrid is the div which contains the canvas tag.
 *       (Needed to capture keyboard inputs as the canvas don't capture key stroke)
 */

//var dInfo;
var cGrid;
var dGrid;

var joweGrid;

/*
 * Local variables.
 */

var iZoom = 5;
 
/*
 * Global variables to manage grid dragging.
 */

var bDrag = false;
var xDrag = 0;
var yDrag = 0;

/*
 *
 */
function gridOnMouseDown(event)
{
    var x = event.pageX - this.offsetLeft;
    var y = event.pageY - this.offsetTop;
    var obj;

    // Navigation dans les objets parents pour le calcul du décalage de position.
    if (obj = this.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }

    bDrag = true;
    xDrag = x;
    yDrag = y;
}

function gridOnMouseMove(event)
{
    var x = event.pageX - this.offsetLeft;
    var y = event.pageY - this.offsetTop;
    var obj;

    // Navigation dans les objets parents pour le calcul du décalage de position.
    if (obj = this.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }

    // For debug purpose, display mouse position.
    //dInfo.html('Mouse (x, y) = (' + event.pageX + ', ' + event.pageY + ') => (' + x + ', ' + y + ')');
    if (bDrag === true) {
        if ((Math.abs(x - xDrag) > 10) || (Math.abs(y - yDrag) > 10) )
        {
            joweGrid.move((x - xDrag), (y - yDrag));
            xDrag = x;
            yDrag = y;
        }
    } else {
        if (joweGrid.displayCursor === true) {
            joweGrid.drawCursor(x, y);
        }
    }
}

function gridOnKeyPress(event)
{
    // For debug purpose, display code of key pressed.
    //dInfo.html('b-Keycode = (' + event.keyCode + ')');
}

function gridOnMouseUp(event)
{
    // End of grid dragging.
    bDrag = false;
    // If cursor is visible, refresh its state.
    if (joweGrid.displayCursor === true) {
        joweGrid.drawCursor(-1, -1, true);
    }
}

function bCreateGrid_onClick()
{
    var w = $("#txtGridWidth").val() * 1;
    var h = $("#txtGridHeight").val() * 1;

    joweGrid.initializeGrid(doHeightMap(w, h));

    bUpdateGrid_onClick();
}

function bUpdateGrid_onClick()
{
    var w = $("#txtCanvasWidth").val() * 1;
    var h = $("#txtCanvasHeight").val() * 1;
    if ((joweGrid.canvasWidth !== w) || (joweGrid.canvasHeight !== h)) {
        $("#cGrid").attr({
            width: w,
            height: h
        });
        joweGrid.canvasWidth = w;
        joweGrid.canvasHeight = h;
    }

    joweGrid.initializeCells();
    joweGrid.draw();
}

/*
 * Set level of zoom in the grid.
 */
function btnZoom(i)
{
  iZoom += i;
  $("#bZoomLabel").html(iZoom);
  joweGrid.setZoom(iZoom);
}

$(
function()
{
  // Initialize objects.
  //dInfo = $("#dInfo");
  cGrid = $("#cGrid");
  dGrid = $("#dGrid");

  // Get the canvas size.
  var w = cGrid.attr("width") * 1;
  var h = cGrid.attr("height") * 1;
  // Set the input values.
  $("#txtCanvasWidth").val(w);
  $("#txtCanvasHeight").val(h);

  // Try to initialize grid (only if "canvas" is supported by the browser).
  if (joweGrid = new jowe_grid("cGrid", w, h, 0)) {

      // Set initial zoom.
      $("#bZoomLabel").html(iZoom);
      joweGrid.setZoom(iZoom);
  
      cGrid.mousedown(gridOnMouseDown);
      cGrid.mousemove(gridOnMouseMove);
      cGrid.mouseup(gridOnMouseUp);

      dGrid.keypress(gridOnKeyPress);

      
      // Assign action to toolbar buttons.
      $("#bCreateGrid").click(bCreateGrid_onClick);
      $("#bUpdateGrid").click(bUpdateGrid_onClick);
      $("#bShowCursor").click(function () {joweGrid.toggleCursor();});
      $("#bWaterDetails").click(function () {joweGrid.waterDetails = !joweGrid.waterDetails; bUpdateGrid_onClick();});
      $("#bZoomIn").click(function () {if (iZoom < 15) btnZoom(1);});
      $("#bZoomOut").click(function () {if (iZoom > 1) btnZoom(-1);});

  }
}
);
