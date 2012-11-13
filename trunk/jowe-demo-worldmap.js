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
This is the Javascript file for the demo world map generator of the jOWE project.

TODO :
- More comments...

960-640-320-160- 80
540-360-180- 90- 45

*/

var height_color = [ // From ocean to coastal sea (21).
                    '#195A9C','#195AA0','#195AA4','#195AA8','#195BAC',
                    '#1A5DAF','#1A5EB2','#1B60B5','#1C63BB','#1D67C2',
                    '#1E6BC9','#2070D1','#2272D4','#2577D9','#297CDF',
                    '#2D81E6','#338DF3','#3A9BFF','#46AAFF','#53BAFF',
                    '#79DBFF',
                    // Green variations (plains) (9)
                    '#5EA953','#4EA546','#3FA139','#2F9D2C','#209920',
                    '#209920','#33932C','#468E38','#5F9737',
                    // Green/yellow (hills) (3)
                    '#819D3A','#A1B252','#C0C85C',
                    // Brown (Mountains) (4)
                    '#AD9743','#A27D24','#996415','#8B530F',
                    // Gray (High mountains) (3)
                    '#836F4C','#9B8C75','#BDB8AA'
                    ],
    oHeightMap = null,
    oCanvasMap = null,
    param = {a : 0, w : 960, h : 540, x : 0, y : 0, z : 1, b : 10, s : 2010, n : 1.5},
    text_dbg,
    hcolor = [];
   
function DrawCities() {
  if ($("#showCities").attr('checked') == "checked") {
    oCanvasMap.map.font = "11px Arial";
    oCanvasMap.map.textBaseline = 'bottom';
    $(".city").each(function (){
      if ($(this).hasClass("c-sel")) {
        oCanvasMap.map.fillStyle = '#ff0000';
      } else {
        oCanvasMap.map.fillStyle = '#000000';
      }
      var x = $(".city-x", this).text(),
          y = $(".city-y", this).text();
      if (!isNaN(x) && !isNaN(y)) {
        x *= 1;
        y *= 1;
        oCanvasMap.map.fillText($(".city-n", this).val(), x + 5, y);
        oCanvasMap.map.fillRect(x - 2.5, y - 2.5, 5, 5);
      }
    });
  }
}

function CanvasDraw(bWithoutCities) {

  // Adjust canvas size.
  $("#dMap").css({width : param.w, height : param.h});

  // Create UI object.
  oCanvasMap = new jowe_ui_2d_pixel("dMap", param.w, param.h, '#000');
  
  if (!bWithoutCities) {
    oCanvasMap.onCompleted = DrawCities;
  }

  // Start debug time calculation.
  var start = new Date().getTime();

  setHcolor();

  oCanvasMap.draw(oHeightMap.item, param.a, param.x, param.y, hcolor, param.z);

  // End debug time calculation.
  var end = new Date().getTime();
  
  // Display processing time.
  $("#tresult").html(text_dbg + "<em>Pixel map drawn in " + (end - start) + "ms</em></p>");
  // Reset debug text.
  text_dbg = "";
}

function GenerateMap() {
  param.w = 1 * $("#twidth").val(),
  param.h = 1 * $("#theight").val();

  // Adjust the values if it goes to far.
  if (param.w < 4) param.w = 4;
  if (param.h < 4) param.h = 4;
  if (param.b < 1) param.b = 1;
  param.n = 1 * param.n.toFixed(1);
  
  setHcolor();
  
  // Create heightmap object (pitch is equal to the size of the color array) :
  oHeightMap = new HeightMap(hcolor.length - 1, param.n);
  
  // Start debug time calculation.
  var start = new Date().getTime();

  // Generate map.
  oHeightMap.setAleaSeed(param.s);
  oHeightMap.setSide(param.w, param.h);
  oHeightMap.initialize(-1);
  oHeightMap.fillBorders(0,param.b);
  oHeightMap.makeMap();
  oHeightMap.smooth();
  //oHeightMap.sink(1);
  oHeightMap.crop();
  
  // End debug time calculation.
  var end = new Date().getTime();

  // Display values.
  $("#mseed").val(param.s);
  $("#mborder").val(param.b);
  $("#mnoise").val(param.n);
  
  // Display processing time.
  text_dbg = "<p><em>Heightmap processed in " + (end - start) + "ms</em><br />";
}

function setValue() {
    // Get values.
    param.b = 1 * $("#mborder").val();
    param.s = 1 * $("#mseed").val();
    param.n = 1 * $("#mnoise").val();

    // According to class, set increment or decrement value.
    var inc = ($(this).hasClass("inc1") ? 1 : ($(this).hasClass("inc0") ? 0.1 : 5));
    // According to the id, increase or decrease value of the given parameter.
    if (this.id.substr(1,1) == 'p') {
      param[this.id.substr(0,1)] += inc;
    } else if (this.id.substr(1,1) == 'm') {
      param[this.id.substr(0,1)] -= inc;
    }
    
    // Map creation.
    GenerateMap();
    
    // Draw the canvas.
    CanvasDraw();
  }

function setHcolor() {
  hcolor = [];
  var i = 0;
  $("#listColor input").each(function () {
    if ($(this).attr('checked') == 'checked') {
      hcolor[i++] = $(this).val();
    }
  });
  //alert(JSON.stringify(hcolor));
}
  
$(function (){

  //$("#bsave").click(function (){window.location = document.getElementById("dMap").toDataURL("image/png");});
  
  // Create the color list.
  var ctxt = "";
  for(var c = 0; c < height_color.length; c += 1) {
    ctxt += '<div style="background:' + height_color[c] + '">'
          + '<input type="checkbox" checked="checked" value="' + height_color[c] + '" />'
          + '<div>' + height_color[c] + '</div></div>';
  }
  $("#listColor").html(ctxt);
  
  // Generate and draw map on submit.
  $("#bCreateWorld").click(function () {
    // Get values.
    param.b = 1 * $("#mborder").val();
    param.s = 1 * $("#mseed").val();
    param.n = 1 * $("#mnoise").val();
    GenerateMap();
    CanvasDraw();
  });
  
 $("#showCities").click(function() {
    if ((oHeightMap != null) && (oHeightMap.item != null)) {
      CanvasDraw();
    }
  });
  
  // Clone the "Add" section to insert a new city.
  $(".b-add").live("click", function (){
    if ((oHeightMap != null) && (oHeightMap.item != null)) {
      $("#cities").prepend($(this).parent('div').clone());
      $(this).removeClass('b-add bAdd').addClass('b-del bDel');
    } else {
      alert("Can't add city until a map has been generated.");
    }
  });

  // Delete the current selected city.
  $(".b-del").live("click", function (){
    $(this).parent('div').remove();
    // Redraw the canvas to reflect the changes.
    CanvasDraw();
  });

  // Change the background of the selected city.
  $(".city").live("click", function () {
    $(".c-sel").removeClass("c-sel");
    $(this).addClass("c-sel");
    if ((oHeightMap != null) && (oHeightMap.item != null)) {
      // Redraw the canvas to "highlight" the plot corresponding to the selected city.
      CanvasDraw();
    }
  });
  
   // Capture mousedown event on canvas to set X-Y coordinates to currently selected city.
  $("#dMap").mousedown(function (e) {
    var csel = $(".c-sel");
    // Check if a city is selected.
    if ((csel != null) && (oCanvasMap != null) && (oHeightMap != null) && (oHeightMap.item != null)) {
      // Translate mouse position to reflect map position.
      o = oCanvasMap.translateXY(e.offsetX, e.offsetY, param.a, param.x, param.y, param.z, oHeightMap.item.length, oHeightMap.item[0].length);
      // Set x-y coordinates for selected city.
      $(".city-x", csel).text(~~(o.x));
      $(".city-y", csel).text(~~(o.y));
      CanvasDraw();
    }
  });
  
  // Increment or decrement value.
  $("#sp, #sm, #bp, #bm, #np, #nm").click(setValue);

  // Display the current world as a JSON structure.
  $("#bWorldJSON").click(function (){

    if ((oHeightMap != null) && (oHeightMap.item != null)) {
      // Force redraw of world map without cities.
      CanvasDraw(true);
      // Set the world values.
      var world = {
          name   : $("#wname").val(),
          seed   : param.s,
          noise  : param.n,
          border : param.b,
          pitch  : hcolor.length - 1,
          colors : hcolor,
          width  : 1 * $("#twidth").val(),
          height : 1 * $("#theight").val(),
          cities : [],
          image  : oCanvasMap.map.canvas.toDataURL()
      }
      
      // Goes through each city to get its name and coordinates and add it to the world.
      var i = 0, bHasIssue = false;
      $(".city").each(function (){
        var cx = $(".city-x", this).text(),
            cy = $(".city-y", this).text();
        if (!isNaN(cx) && !isNaN(cy)) {
          world.cities[i++] = {name : $(".city-n", this).val(), x : cx, y : cy};
        } else if (!bHasIssue) {
          bHasIssue = true;
          alert("Don't forget to locate each city on the world map (by pointing it with your mouse),\n" +
                "otherwise it won't be included in the JSON result structure.\n\n" +
                "'" + $(".city-n", this).val() + "' has no coordinates!");
        }
      });

      // Display JSON result.
      $("#tJSON").html('<textarea style="width:98%;min-height:180px;font:11px DejaVu Sans Mono;">// Size : ' + JSON.stringify(world).length + ' octets\n' +
                       'var world = ' + JSON.stringify(world).replace(/,"/gi, '\n            ,"') + ';\n' +
                       '</textarea>');
      // Force redraw.
      CanvasDraw();
    }
  });
  
});
