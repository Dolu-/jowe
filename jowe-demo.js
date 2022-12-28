/*
********************************************************************************
jOWE - javascript Opensource Word Engine
https://github.com/Dolu-/jowe
********************************************************************************

Copyright (c) 2010-2022 Ludovic L.

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

// Create city object (as global).
var myCity;

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
function grid_onMouseDown(event) {
    var obj,
        x = event.pageX - this.offsetLeft,
        y = event.pageY - this.offsetTop;

    // Navigation dans les objets parents pour le calcul du décalage de position.
    if (obj = this.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }
    this.style.cursor = "grabbing";
    bDrag = true;
    xDrag = x;
    yDrag = y;
}

function grid_onMouseUp(event) {
    this.style.cursor = "grab";
    // End of grid dragging.
    bDrag = false;
    // If cursor is visible, refresh its state.
    if (joweGrid.displayCursor === true) {
        joweGrid.drawCursor(-1, -1, true);
    }
}

function grid_onMouseMove(event) {
    var obj,
        x = event.pageX - this.offsetLeft,
        y = event.pageY - this.offsetTop;

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
        if ((Math.abs(x - xDrag) > 10) || (Math.abs(y - yDrag) > 10)) {
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
                lblCellType.html(c[myCity.map.height[cursor.x][cursor.y]][3]);
                lblCellHeight.html(myCity.map.height[cursor.x][cursor.y]);
                lblCellFertility.html(myCity.map.fertility[cursor.x][cursor.y]);
                lblCellRainfall.html(myCity.map.rainfall[cursor.x][cursor.y]);
                lblCellTemperature.html(myCity.map.temperature[cursor.x][cursor.y]);
                lblCellPopulation.html(myCity.map.population[cursor.x][cursor.y]);
            }
        }
    }
}

function grid_onKeyPress(event) {
    // For debug purpose, display code of key pressed.
    //dInfo.html('b-Keycode = (' + event.keyCode + ')');
}

/*
 *
 */
function map_onMouseDown(event) {
    var obj,
        x = event.pageX - this.offsetLeft,
        y = event.pageY - this.offsetTop;

    // Navigation dans les objets parents pour le calcul du décalage de position.
    if (obj = this.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }

    //alert('x=' + x + ',y' + y);
    joweGrid.Minimap_onClick(x, y);
}

function bUpdateGrid_onClick() {
    var w = document.getElementById('txtGridWidth').valueAsNumber,
        h = document.getElementById('txtGridHeight').valueAsNumber;

    joweGrid.resize(w, h);
}

function bCreateWorld_onClick() {
    // For debug purpose.
    if (isdebug) dbg_date[0] = new Date();
    if (isdebug) dInfo.html("");

    var w = document.getElementById('txtWorldWidth').valueAsNumber,
        h = document.getElementById('txtWorldHeight').valueAsNumber,
        p = 8,    // document.getElementById('txtWorldPitch').valueAsNumber,
        r = 3.1;  // document.getElementById('txtWorldRatio').valueAsNumber;

    myCity = new CityMap(w, h, p, r);
    myCity.setSeeds(document.getElementById('txtMapSeed').valueAsNumber);
    myCity.doCityMap();

    // For debug purpose.
    if (isdebug) dbg_date[11] = new Date();

    joweGrid.initialize(myCity.map.height
        , myCity.map.fertility
        , myCity.map.rainfall
        , myCity.map.temperature
        , myCity.map.population);

    document.getElementById('lblAvgHeight').innerHTML = myCity.average_height.toFixed(1);
    document.getElementById('lblAvgFertility').innerHTML = myCity.average_fertility.toFixed(1);
    document.getElementById('lblAvgRainfall').innerHTML = myCity.average_rainfall.toFixed(1);
    document.getElementById('lblAvgTemperature').innerHTML = myCity.average_temperature.toFixed(1);
    document.getElementById('lblSumPopulation').innerHTML = myCity.total_population.toFixed(0);

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

/**
 * Toggle water details on/off.
 */
function bWaterDetails_onClick() {
    this.classList.toggle('active');
    joweGrid.waterDetails = !joweGrid.waterDetails;
    joweGrid.initializeCells(true);
    bUpdateGrid_onClick();
}

/**
 * Set level of zoom in the grid.
 * @param {int} i zoom level.
 */
function btnZoom(i) {
    iZoom += i;
    lblZoom.innerHTML = '<p>' + iZoom + '</p>';
    joweGrid.setZoom(iZoom);
}

function grid_onWheel(event) {
    event.preventDefault();
    iZoom += event.deltaY * -0.01;
    // Restrict zoom.
    iZoom = Math.min(Math.max(1, iZoom), 12);
    lblZoom.innerHTML = '<p>' + iZoom + '</p>';
    joweGrid.setZoom(iZoom);
}

function bMode_onClick() {
    document.getElementsByClassName('selected')[0].classList.toggle('selected');
    this.classList.toggle('selected');
    var selectedMode = this.dataset.mode;

    if (joweGrid.mode != selectedMode) {
        joweGrid.mode = selectedMode;
        joweGrid.initializeCells(true);
        bUpdateGrid_onClick();
    }
}

function bUpdateMap_onClick() {
    var w = document.getElementById('txtMapWidth').valueAsNumber,
        h = document.getElementById('txtMapHeight').valueAsNumber;

    joweGrid.InitializeMinimap('cMap', w, h, '#000');
    joweGrid.drawminimap();
}

function bShowGrid_onClick() {
    this.classList.toggle('active');
    dGrid.classList.toggle('d-none');

    // if (joweGrid.Minimap !== null) {
    // joweGrid.Mnimap = null;
    // } else {
    bUpdateGrid_onClick();
    // }
}

function bShowMap_onClick() {
    this.classList.toggle('active');
    dMap.classList.toggle('d-none');

    if (joweGrid.Minimap !== null) {
        joweGrid.Mnimap = null;
    } else {
        bUpdateMap_onClick();
    }
}

function bShowInformation_onClick() {
    document.getElementById('dDetailInformation').classList.toggle('d-none');
    document.getElementById('bInformation').classList.toggle('active');
}

function iBrick_onClick() {
    //alert(JSON.stringify(myCity.height.item));
    //$("#dSaveJSON").html(JSON.stringify(myCity.height.item));
    // $.ajax({
    // type : 'POST',
    // url  : 'jowe-savejson.php',
    // data : {json : JSON.stringify(myCity)},
    // success : function(data) {
    // alert(data);
    // }
    // });

    // Display JSON result.
    document.getElementById('tJSON').innerHTML = '<textarea style="width:98%;min-height:240px;font:11px DejaVu Sans Mono;">// Size : ' + JSON.stringify(myCity).length + ' octets\n' +
        'var myCity = ' + JSON.stringify(myCity).replace(/,"/gi, '\n            ,"') + ';\n' +
        '</textarea>';

}

function MapSeed_onClick() {
    var mapSeed = document.getElementById('txtMapSeed');
    var seed = mapSeed.valueAsNumber;
    if (this.id.substr(0, 1) == 'p') {
        mapSeed.value = seed - 1;
    } else {
        mapSeed.value = seed + 1;
    }
    bCreateWorld_onClick();
}

window.addEventListener('DOMContentLoaded', (event) => {
    // Initialize objects.
    dInfo = document.getElementById('dHelp');
    cGrid = document.getElementById('cGrid');
    dGrid = document.getElementById('dGrid');
    cMap = document.getElementById("cMap");
    dMap = document.getElementById("dMap");

    lblZoom = document.getElementById('bZoomLabel');
    lblCursorX = document.getElementById('lblCursorX');
    lblCursorY = document.getElementById('lblCursorY');
    lblCellType = document.getElementById('lblCellType');
    lblCellHeight = document.getElementById('lblCellHeight');
    lblCellFertility = document.getElementById('lblCellFertility');
    lblCellRainfall = document.getElementById('lblCellRainfall');
    lblCellTemperature = document.getElementById('lblCellTemperature');
    lblCellPopulation = document.getElementById('lblCellPopulation');

    // Get the canvas size.
    var w = cGrid.width,
        h = cGrid.height;
    // Set the input values.
    document.getElementById('txtGridWidth').valueAsNumber = w;
    document.getElementById('txtGridHeight').valueAsNumber = h;

    document.getElementById('pMapSeed').onclick = MapSeed_onClick;
    document.getElementById('nMapSeed').onclick = MapSeed_onClick;

    // Try to initialize grid (only if "canvas" is supported by the browser).
    if (joweGrid = new jowe_grid('cGrid', w, h, '#000')) {

        // Set initial zoom.
        iZoom = lblZoom.innerText * 1;
        btnZoom(0);

        cGrid.onmousedown = grid_onMouseDown;
        cGrid.onmousemove = grid_onMouseMove;
        cGrid.onmouseup = grid_onMouseUp;
        cGrid.onwheel = grid_onWheel;

        dGrid.onkeypress = grid_onKeyPress;

        cMap.onmousedown = map_onMouseDown;

        // Assign action to toolbar buttons.
        document.getElementById('bCreateWorld').onclick = bCreateWorld_onClick;
        document.getElementById('bWorldJSON').onclick = iBrick_onClick;

        document.getElementById('bModeNormal').onclick = bMode_onClick;
        document.getElementById('bModeFertility').onclick = bMode_onClick;
        document.getElementById('bModeRainfall').onclick = bMode_onClick;
        document.getElementById('bModeTemperature').onclick = bMode_onClick;
        document.getElementById('bModePopulation').onclick = bMode_onClick;

        document.getElementById('bShowGrid').onclick = bShowGrid_onClick;
        document.getElementById('bUpdateGrid').onclick = bUpdateGrid_onClick;

        document.getElementById('bShowMap').onclick = bShowMap_onClick;
        document.getElementById('bUpdateMap').onclick = bUpdateMap_onClick;

        document.getElementById('bInformation').onclick = bShowInformation_onClick;
        document.getElementById('bShowCursor').onclick = function () { this.classList.toggle('active'); joweGrid.toggleCursor(); };
        document.getElementById('bWaterDetails').onclick = bWaterDetails_onClick;
        document.getElementById('bCenter').onclick = function () { joweGrid.center(); joweGrid.draw(); };
        document.getElementById('bZoomIn').onclick = function () { if (iZoom < 12) btnZoom(1); };
        document.getElementById('bZoomOut').onclick = function () { if (iZoom > 1) btnZoom(-1); };

        // Capture "enter" and do click on each toolbar button.
        //$(".button").bind('keypress', function (event) { if (event.keyCode === 13) $(this).click(); });

        //$("#bRotateLeft").click(function () {joweGrid.rotate(-1);});
        //$("#bRotateRight").click(function () {joweGrid.rotate(1);});
    }
});
