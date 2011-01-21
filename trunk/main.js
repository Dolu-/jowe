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
NOTICE:
- This file can be seen as a working aera. As the project goes on, stuff will be
  moved in more appropriated files.

TODO :
- All stuff related to Grid dragging should probably be located elsewhere.
  Not sure it has to be in the "managegrid.js" file.
- When dragging the grid with cursor activated, at cursor removal, sometimes
  the cell containing which contained the cursor is displayed with bad color.
  (to fix, "hide" cursor before starting a drag process).
- To fix, drag for small grids (smaller thant canvas) gives flickering results.

*/

/*
 * Global objects (jQuery shorcuts).
 */

var dInfo;
var cGrid;
var dGrid;

/*
 * Global variables to manage grid dragging.
 */

var bDrag = false;
var xDrag = 0;
var yDrag = 0;


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

    dInfo.html('Mouse (x, y) = (' + event.pageX + ', ' + event.pageY + ') => (' + x + ', ' + y + ')');
    if (bDrag == true) {
        if ((Math.abs(x - xDrag) > 10) || (Math.abs(y - yDrag) > 10) )
        {
            moveGrid((x - xDrag), (y - yDrag));
            xDrag = x;
            yDrag = y;
        }
    } else {
        //drawCursor(event.pageX, event.pageY)
        drawCursor(x, y);
    }
}

function gridOnKeyPress(event)
{
    dInfo.html('b-Keycode = (' + event.keyCode + ')');
}

function gridOnMouseUp(event)
{
//    var x = event.pageX - this.offsetLeft;
//    var y = event.pageY - this.offsetTop;
//    var obj;
//
//    // Navigation dans les objets parents pour le calcul du décalage de position.
//    if (obj = this.offsetParent) {
//        do {
//            x -= obj.offsetLeft;
//            y -= obj.offsetTop;
//        } while (obj = obj.offsetParent);
//    }
//
//    if (bDrag == true) {
//        moveGrid((x - xDrag), (y - yDrag));
//    }
    bDrag = false;
}

function toggleCursor()
{
    if($(this).is(':checked')) {
        displayCursor = true;
        drawCursor(-1, -1, true);

    } else {
        displayCursor = false;
        hideCursor();
    }
}

function btnGenerate_onClick()
{
    var w = $("#txtGridWidth").val() * 1;
    var h = $("#txtGridHeight").val() * 1;

    generateGrid(w, h);

    btnCanvas_onClick();
}

function btnCanvas_onClick()
{
    var w = $("#txtCanvasWidth").val() * 1;
    var h = $("#txtCanvasHeight").val() * 1;
    if ((canvasWidth !== w) || (canvasHeight !== h)) {
        $("#cGrid").attr({
            width: w,
            height: h
        });
    }

    initializeGrid("cGrid", w, h, 0);
    initializeCells();
}

function btnDisplay_onClick()
{
    var c = $("#txtCellSize").val() * 1;
    xSize = c;
    ySize = c / 2.0;
    hSize = c / hRate;
    btnCanvas_onClick();
}

$(
    function(){

        dInfo = $("#dInfo");

        var w = $("#cGrid").attr("width") * 1;
        var h = $("#cGrid").attr("height") * 1;

        $("#txtCanvasWidth").val(w);
        $("#txtCanvasHeight").val(h);
        
        if (initializeGrid("cGrid", w, h, 0)) {
            
            cGrid = $("#cGrid");
            cGrid.mousedown(gridOnMouseDown);
            cGrid.mousemove(gridOnMouseMove);
            cGrid.mouseup(gridOnMouseUp);

            dGrid = $("#dGrid");
            dGrid.keypress(gridOnKeyPress);

            $("#btnGenerate").click(btnGenerate_onClick);
            $("#btnCanvas").click(btnCanvas_onClick);
            $("#btnDisplay").click(btnDisplay_onClick);

            $("#chkCursor").click(toggleCursor);
        }
    } );
