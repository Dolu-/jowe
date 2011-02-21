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
 * lblZoom is the label which display the zoom level.
 */

var dInfo;
var cGrid;
var dGrid;
var cMini;
var dMini;

var lblZoom;
var txtGridWidth, txtGridHeight;
var txtCanvasWidth, txtCanvasHeight;

var joweGrid;
var joweMinimap;

// For debug purpose only - speed tests.
// var dbg_date = [];

/*
 * Local variables.
 */

var iZoom = 1;
 
/*
 * Global variables to manage grid dragging.
 */

var bDrag = false;
var xDrag = 0, yDrag = 0;

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
    // For debug purpose.
    // dbg_date[0] = new Date();
    // dInfo.html("");

    var w = txtGridWidth.val() * 1;
    var h = txtGridHeight.val() * 1;
    
    doHeightMap(w, h);

    // For debug purpose.
    // dbg_date[11] = new Date();
    
    joweGrid.initialize(myMap.item);
    
    // For debug purpose.
    // dbg_date[12] = new Date();
    
    bUpdateGrid_onClick();

    // For debug purpose.
    // dbg_date[100] = new Date();
    // dInfo.append("start=" + (dbg_date[2].getTime() - dbg_date[1].getTime()) + "<br />");
    // dInfo.append("initialize=" + (dbg_date[3].getTime() - dbg_date[2].getTime()) + "<br />");
    // dInfo.append("generate=" + (dbg_date[4].getTime() - dbg_date[3].getTime()) + "<br />");
    // dInfo.append("smooth=" + (dbg_date[5].getTime() - dbg_date[4].getTime()) + "<br />");
    // dInfo.append("crop=" + (dbg_date[6].getTime() - dbg_date[5].getTime()) + "<br />");
    // dInfo.append("doHeightMap (Total)=" + (dbg_date[6].getTime() - dbg_date[1].getTime()) + "<br />");
    // dInfo.append("initialize=" + (dbg_date[12].getTime() - dbg_date[11].getTime()) + "<br />");
    // dInfo.append("initializeCells=" + (dbg_date[14].getTime() - dbg_date[13].getTime()) + "<br />");
    // dInfo.append("draw=" + (dbg_date[15].getTime() - dbg_date[14].getTime()) + "<br />");
    // dInfo.append("bUpdateGrid_onClick (Total)=" + (dbg_date[100].getTime() - dbg_date[12].getTime()) + "<br />");
    // dInfo.append("bCreateGrid_onClick (Total)=" + (dbg_date[100].getTime() - dbg_date[0].getTime()) + "<br />");
}

function bUpdateGrid_onClick()
{
    var w = txtCanvasWidth.val() * 1;
    var h = txtCanvasHeight.val() * 1;
    if ((joweGrid.canvasWidth !== w) || (joweGrid.canvasHeight !== h)) {
        cGrid.attr({ width: w, height: h });
        joweGrid.canvasWidth = w;
        joweGrid.canvasHeight = h;
    }

    // For debug purpose.
    // dbg_date[13] = new Date();
    
    joweGrid.initializeCells();
    
    // For debug purpose.
    // dbg_date[14] = new Date();
    
    joweGrid.draw();
    
    // For debug purpose.
    // dbg_date[15] = new Date();

}

/*
 * Set level of zoom in the grid.
 */
function btnZoom(i)
{
  iZoom += i;
  lblZoom.html(iZoom);
  joweGrid.setZoom(iZoom);
}

function bShowMinimap_onClick() {
    dMini.toggle();
    joweMinimap.resize(60, 60);
}

$(
function()
{
  // Initialize objects.
  dInfo = $("#dHelp");
  cGrid = $("#cGrid");
  dGrid = $("#dGrid");
  cMini = $("#cMini");
  dMini = $("#dMini");
  lblZoom = $("#bZoomLabel");
  txtGridWidth = $("#txtGridWidth");
  txtGridHeight = $("#txtGridHeight");
  txtCanvasWidth = $("#txtCanvasWidth");
  txtCanvasHeight = $("#txtCanvasHeight");

  // Get the canvas size.
  var w = cGrid.attr("width") * 1;
  var h = cGrid.attr("height") * 1;
  // Set the input values.
  txtCanvasWidth.val(w);
  txtCanvasHeight.val(h);

  // Try to initialize grid (only if "canvas" is supported by the browser).
  if (joweGrid = new jowe_grid("cGrid", w, h, 0)) {

      // Set initial zoom.
      iZoom = lblZoom.html() * 1;
      btnZoom(0);
  
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
      //$("#bRotateLeft").click(function () {joweGrid.rotate(-1);});
      //$("#bRotateRight").click(function () {joweGrid.rotate(1);});

  }

  /*
  joweMinimap = new jowe_minimap("cMini", 0, 0, "#000", joweGrid);
  if (joweMinimap) {
      $("#bShowMinimap").click(bShowMinimap_onClick);
  }
  */
  
}
);
