/*
********************************************************************************
jOWE - javascript Opensource Word Engine
http://code.google.com/p/jowe/
********************************************************************************

Copyright (c) 2010-2011 Ludovic L.

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
This is the Javascript demo file of the jOWE project.

TODO :
- All stuff related to Grid dragging should probably be located elsewhere.
  Not sure it has to be in the "jowe-demo.js" file.

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

var dInfo,
    cGrid, dGrid,
    cMap, dMap,
    lblZoom,
    lblCursorX, lblCursorY, lblCellType,
    lblCellHeight, lblCellFertility, lblCellRainfall, lblCellTemperature, lblCellPopulation;

var joweGrid;

// For debug purpose only - speed tests.
var dbg_date = [];
var isdebug = false;

/*
 * Local variables.
 */

var iZoom = 1;
 
/*
 * Global variables to manage grid dragging.
 */

var bDrag = false, xDrag = 0, yDrag = 0;

/*
 *
 */
function grid_onMouseDown(event)
{
    var obj,
        x = event.pageX - this.offsetLeft,
        y = event.pageY - this.offsetTop;

    // Navigation dans les objets parents pour le calcul du d�calage de position.
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

function grid_onMouseMove(event)
{
    var obj,
        x = event.pageX - this.offsetLeft,
        y = event.pageY - this.offsetTop;

    // Navigation dans les objets parents pour le calcul du d�calage de position.
    if (obj = this.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }

    // For debug purpose, display mouse position.
    //dInfo.html('Mouse (x, y) = (' + event.pageX + ', ' + event.pageY + ') => (' + x + ', ' + y + ')');
    if (bDrag === true) {
        if ((Math.abs(x - xDrag) > 10) || (Math.abs(y - yDrag) > 10))
        {
            joweGrid.move((x - xDrag), (y - yDrag));
            xDrag = x;
            yDrag = y;
        }
    } else {
        if (joweGrid.displayCursor === true) {
            joweGrid.drawCursor(x, y);
            var cursor = joweGrid.cursor_position();
            lblCursorX.html(cursor.x < 0 ? '-' : cursor.x);
            lblCursorY.html(cursor.y < 0 ? '-' : cursor.y);
            if ((cursor.x >= 0) && (cursor.y >= 0)) {
                lblCellType.html(c[myWorld.height.item[cursor.x][cursor.y]][3]);
                lblCellHeight.html(myWorld.height.item[cursor.x][cursor.y]);
                lblCellFertility.html(myWorld.fertility.item[cursor.x][cursor.y]);
                lblCellRainfall.html(myWorld.rainfall.item[cursor.x][cursor.y]);
                lblCellTemperature.html(myWorld.temperature.item[cursor.x][cursor.y]);
                lblCellPopulation.html(myWorld.population.item[cursor.x][cursor.y]);
             }
        }
    }
}

function grid_onKeyPress(event)
{
    // For debug purpose, display code of key pressed.
    //dInfo.html('b-Keycode = (' + event.keyCode + ')');
}

function grid_onMouseUp(event)
{
    // End of grid dragging.
    bDrag = false;
    // If cursor is visible, refresh its state.
    if (joweGrid.displayCursor === true) {
        joweGrid.drawCursor(-1, -1, true);
    }
}

/*
 *
 */
function map_onMouseDown(event)
{
    var obj,
        x = event.pageX - this.offsetLeft,
        y = event.pageY - this.offsetTop;

    // Navigation dans les objets parents pour le calcul du d�calage de position.
    if (obj = this.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }

    //alert('x=' + x + ',y' + y);
    joweGrid.Minimap_onClick(x, y);
}

function bUpdateGrid_onClick()
{
    var w = $("#txtGridWidth").val() * 1,
        h = $("#txtGridHeight").val() * 1;
    
    joweGrid.resize(w, h);
}

function bCreateWorld_onClick()
{
    // For debug purpose.
    if (isdebug) dbg_date[0] = new Date();
    if (isdebug) dInfo.html("");

    var w = $("#txtWorldWidth").val() * 1,
        h = $("#txtWorldHeight").val() * 1,
        p = $("#txtWorldPitch").val() * 1,
        r = $("#txtWorldRatio").val() * 1;

    myWorld = new WorldMap(w, h, p, r);

    // For debug purpose.
    if (isdebug) dbg_date[11] = new Date();
    
    joweGrid.initialize(myWorld.height.item
                       ,myWorld.fertility.item
                       ,myWorld.rainfall.item
                       ,myWorld.temperature.item
                       ,myWorld.population.item);
    
    // For debug purpose.
    if (isdebug) dbg_date[12] = new Date();
    
    joweGrid.initializeCells();

    // For debug purpose.
    if (isdebug) dbg_date[13] = new Date();
    
    bUpdateGrid_onClick();

    // For debug purpose.
    if (isdebug) dbg_date[100] = new Date();
    
    if (isdebug) dInfo.append("initialize=" + (dbg_date[3].getTime() - dbg_date[2].getTime()) + "<br />");
    if (isdebug) dInfo.append("generate=" + (dbg_date[4].getTime() - dbg_date[3].getTime()) + "<br />");
    if (isdebug) dInfo.append("smooth=" + (dbg_date[5].getTime() - dbg_date[4].getTime()) + "<br />");
    if (isdebug) dInfo.append("crop=" + (dbg_date[6].getTime() - dbg_date[5].getTime()) + "<br />");
    if (isdebug) dInfo.append("doHeightMap (Total)=" + (dbg_date[6].getTime() - dbg_date[2].getTime()) + "<br />");
    if (isdebug) dInfo.append("initialize=" + (dbg_date[12].getTime() - dbg_date[11].getTime()) + "<br />");
    if (isdebug) dInfo.append("initializeCells=" + (dbg_date[13].getTime() - dbg_date[12].getTime()) + "<br />");
    //if (isdebug) dInfo.append("draw=" + (dbg_date[15].getTime() - dbg_date[14].getTime()) + "<br />");
    if (isdebug) dInfo.append("bUpdateGrid_onClick (Total)=" + (dbg_date[100].getTime() - dbg_date[13].getTime()) + "<br />");
    if (isdebug) dInfo.append("bCreateGrid_onClick (Total)=" + (dbg_date[100].getTime() - dbg_date[0].getTime()) + "<br />");
}

/*
 * Toggle water details on/off
 */
function bWaterDetails_onClick()
{
    $("#bWaterDetails").toggleClass('active')
    joweGrid.waterDetails = !joweGrid.waterDetails;
    joweGrid.initializeCells(true);
    bUpdateGrid_onClick();
}

/*
 * Set level of zoom in the grid.
 */
function btnZoom(i)
{
    iZoom += i;
    lblZoom.html('<p>'+iZoom+'</p>');
    joweGrid.setZoom(iZoom);
}

function bMode_onClick()
{
    $(".selected").toggleClass('selected');
    $(this).toggleClass('selected');
    if (($(this).attr('id') === 'bModeNormal') && (joweGrid.mode != 'h')) {
        joweGrid.mode = 'h'
        joweGrid.initializeCells(true);
        bUpdateGrid_onClick();
    } else if (($(this).attr('id') === 'bModeFertility') && (joweGrid.mode != 'f')) {
        joweGrid.mode = 'f'
        joweGrid.initializeCells(true);
        bUpdateGrid_onClick();
    } else if (($(this).attr('id') === 'bModeRainfall') && (joweGrid.mode != 'r')) {
        joweGrid.mode = 'r'
        joweGrid.initializeCells(true);
        bUpdateGrid_onClick();
    } else if (($(this).attr('id') === 'bModeTemperature') && (joweGrid.mode != 't')) {
        joweGrid.mode = 't'
        joweGrid.initializeCells(true);
        bUpdateGrid_onClick();
    } else if (($(this).attr('id') === 'bModePopulation') && (joweGrid.mode != 'p')) {
        joweGrid.mode = 'p'
        joweGrid.initializeCells(true);
        bUpdateGrid_onClick();
    }
}

function bUpdateMap_onClick()
{
    var w = $("#txtMapWidth").val() * 1,
        h = $("#txtMapHeight").val() * 1;
        
    joweGrid.InitializeMinimap("cMap", w, h, "#000");
    joweGrid.drawminimap();
}

function bShowGrid_onClick()
{
    dGrid.toggle();
    $("#bShowGrid").toggleClass('active')
    
    // if (joweGrid.Minimap !== null) {
        // joweGrid.Mnimap = null;
    // } else {
        bUpdateGrid_onClick();
    // }
}

function bShowMap_onClick()
{
    dMap.toggle();
    $("#bShowMap").toggleClass('active')
    
    if (joweGrid.Minimap !== null) {
        joweGrid.Mnimap = null;
    } else {
        bUpdateMap_onClick();
    }
}

function bShowInformation_onClick()
{
    $("#bInformation").toggleClass('active')
    $("#dDetailInformation").toggle();
}

function iBrick_onClick()
{
  //alert(JSON.stringify(myWorld.height.item));
  //$("#dSaveJSON").html(JSON.stringify(myWorld.height.item));
  // $.ajax({
    // type : 'POST',
    // url  : 'jowe-savejson.php',
    // data : {json : JSON.stringify(myWorld)},
    // success : function(data) {
        // alert(data);
    // }
  // });
  $("#dSaveJSON").html(JSON.stringify(myWorld));
}

$(
function ()
{
    // Initialize objects.
    dInfo = $("#dHelp");
    cGrid = $("#cGrid");
    dGrid = $("#dGrid");
    cMap = $("#cMap");
    dMap = $("#dMap");
    lblZoom = $("#bZoomLabel");
    lblCursorX = $("#lblCursorX");
    lblCursorY = $("#lblCursorY");
    lblCellType = $("#lblCellType");
    lblCellHeight = $("#lblCellHeight");
    lblCellFertility = $("#lblCellFertility");
    lblCellRainfall = $("#lblCellRainfall");
    lblCellTemperature = $("#lblCellTemperature");
    lblCellPopulation = $("#lblCellPopulation");
    
    // Get the canvas size.
    var w = cGrid.attr("width") * 1,
        h = cGrid.attr("height") * 1;
    // Set the input values.
    $("#txtGridWidth").val(w);
    $("#txtGridHeight").val(h);

    // Try to initialize grid (only if "canvas" is supported by the browser).
    if (joweGrid = new jowe_grid("cGrid", w, h, "#000")) {

        // Set initial zoom.
        iZoom = lblZoom.text() * 1;
        btnZoom(0);
    
        cGrid.mousedown(grid_onMouseDown);
        cGrid.mousemove(grid_onMouseMove);
        cGrid.mouseup(grid_onMouseUp);

        dGrid.keypress(grid_onKeyPress);
        
        cMap.mousedown(map_onMouseDown);
        
        $("#dCreateWorld").click(iBrick_onClick);
        
        // Assign action to toolbar buttons.
        $("#bCreateWorld").click(bCreateWorld_onClick);
        
        $("#bModeNormal").click(bMode_onClick);
        $("#bModeFertility").click(bMode_onClick);
        $("#bModeRainfall").click(bMode_onClick);
        $("#bModeTemperature").click(bMode_onClick);
        $("#bModePopulation").click(bMode_onClick);
        
        $("#bShowGrid").click(bShowGrid_onClick);
        $("#bUpdateGrid").click(bUpdateGrid_onClick);
        
        $("#bShowMap").click(bShowMap_onClick);
        $("#bUpdateMap").click(bUpdateMap_onClick);

        $("#bInformation").click(bShowInformation_onClick);
        $("#bShowCursor").click(function () { $("#bShowCursor").toggleClass('active'); joweGrid.toggleCursor(); });
        $("#bWaterDetails").click(bWaterDetails_onClick);
        $("#bCenter").click(function () { joweGrid.center(); joweGrid.draw(); });
        $("#bZoomIn").click(function () { if (iZoom < 15) btnZoom(1); });
        $("#bZoomOut").click(function () { if (iZoom > 1) btnZoom(-1); });
        
        // Capture "enter" and do click on each toolbar button.
        $(".button").bind('keypress', function (event) { if (event.keyCode === 13) $(this).click(); });
        
        //$("#bRotateLeft").click(function () {joweGrid.rotate(-1);});
        //$("#bRotateRight").click(function () {joweGrid.rotate(1);});
    }
}
);
