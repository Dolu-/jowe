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
This is a Javascript demo file for the jOWE project.
This file needs "jowe-core.js" to work.

NOTICE :
A "City" is composed of 5 HeightMap objects :
  - height
  - fertility
  - rainfall
  - temperature
  - population

The object represents a large area that contains the city.

********************************************************************************

Probably need to put colors array in that file.
Also add other parameters (constants) like water level.

Dynamic properties ? (what if we remove only rainfall, or if it's not completed)

Have to split jowe-ui to 2 (or more) objects ?
=> jowe-ui-city
=> jowe-ui-world
(and a higher level object "jowe-ui-core" with common methods/functions)

*/

"use strict";

/**
 * @fileOverview This file contains the CityMap object (<a href="http://code.google.com/p/jowe/">jOWE</a>).
 * @author Ludovic Lefebvre
 * @version 1.0
 */

/**
 * Creates a new random city map object.<br />
 * A "City" is composed of 5 HeightMap objects :<br />
 *   - height<br />
 *   - fertility<br />
 *   - rainfall<br />
 *   - temperature<br />
 *   - population<br />
 * <br />
 * The object represents a large area that contains the city.<br />
 * Beware, if you request large city map, it will required 4x the size in memory as it will generate 4 heightmap with the same size.<br />
 * 
 * @class Creates an map that represents a city area.
 * @see How to use the <a href="http://jowe.ouebfrance.com/examples-jowe-ui-city.html">CityMap</a> object?
 * @param {number} [opt_width=100]  Width of the map to be generated (between 50 and 500).
 * @param {number} [opt_height=100] Height of the map to be generated (between 50 and 500).
 */ 
function CityMap(opt_width, opt_height) {

  var rand, width, height;

  /**
   * Generate a random value between min and max (both included), result is floored.
   * @param {number} min
   * @param {number} max
   * @return {number} Random value.
   * @private
   */
  function p_randomMinMax(min, max) {
    return Math.floor((rand() * ((max - min) + 1)) + min);
  }

  /**
   * Set seed for every heightmap that will be used in the doCityMap process.
   * @param {number} height Seed to be used for height map.
   * @param {number} [fertility=height] Seed to be used for fertility map.
   * @param {number} [rainfall=height+1] Seed to be used for rainfall map.
   * @param {number} [temperature=height] Seed to be used for temperature map.
   * @param {number} [city=height] Seed to be used for city map.
   * @protected
   */
  this.setSeeds = function (height, fertility, rainfall, temperature, city) {
    this.height_seed = height;
    
    this.fertility_seed   = (((fertility !== undefined) && (fertility !== null) && (!isNaN(fertility))) ? fertility : this.height_seed);
    this.rainfall_seed    = (((rainfall !== undefined) && (rainfall !== null) && (!isNaN(rainfall))) ? rainfall : this.height_seed + 1);
    this.temperature_seed = (((temperature !== undefined) && (temperature !== null) && (!isNaN(temperature))) ? temperature : this.height_seed);
    this.city_seed        = (((city !== undefined) && (city !== null) && (!isNaN(city))) ? city : this.height_seed);
    
    // Use Alea() if exists.
    if (typeof Alea == 'undefined') {
      rand = Math.random;
    } else {
      rand = Alea(height);
    }
  }
  
  /**
   * Generate a random city map.
   * @protected
   */
  this.doCityMap = function () {
    // City consists of 5 arrays : Elevation, Fertility, Rainfall, Temperature, Population.
    var x, y,
        elevation,
        fertility,
        rainfall,
        temperature,
        population;
    
    /********************************************************************************
     * STEP 1 :
     * Elevation (height) process.
     * Standard generation, no 
     */
    elevation = new HeightMap(this.height_pitch, this.height_ratio, width, height);
    elevation.setAleaSeed(this.height_seed);
    // makeMap() includes calls to initialize() and fillCorners().
    elevation.makeMap();

    /*
     * TODO : Variations to reduce water :
     * 1/2, 2/3, 3/4 of the map without water (straight or skew)
     *
    for(x = 0; x < width / 2; x += 1) {
      for(y = 0; y <= height; y += 1) {
        if (elevation.item[x][y] < 3) {
          elevation.item[x][y] += 3;
        }
      }
    }

    for(x = 0; x <= width * 3 / 4; x += 1) {
      for(y = 0; y <= height + 1; y += 1) {
        if (elevation.item[x][y] < 3) {
          elevation.item[x][y] += 3;
        }
      }
    }
    
    for(x = 0; x <= width + 1; x += 1) {
        for(y = 0; y <= height / 2; y += 1) {
        if (elevation.item[x][y] < 3) {
          elevation.item[x][y] += 3;
        }
      }
    }
    */
    
    elevation.smooth();
    elevation.crop();
    /**
     * End of Elevation (height) process.
    /********************************************************************************/
    

    /********************************************************************************
     * STEP 2 :
     * Fertility process. Soil fertility goes from 0 (bad/none) to 100 (excellent).
     */
    fertility = new HeightMap(this.fertility_pitch, this.fertility_ratio, width, height);
    fertility.setAleaSeed(this.fertility_seed);
    fertility.makeMap();
    fertility.smooth();
    fertility.crop();
    // Fertility : Post processing, remove fertility for ocean, see and snow.
    for(x = 0; x < width; x += 1) {
      for(y = 0; y < height; y += 1) {
        if ((elevation.item[x][y] <= this.fertility_height_min) || (elevation.item[x][y] >= this.fertility_height_max)) {
          fertility.item[x][y] = 0;
        }
      }
    }
    /**
     * End of Fertility process.
    /********************************************************************************/

    
    /********************************************************************************
     * STEP 3 :
     * Rainfall process. Rainfall goes from 0 (none) to 20 (very often)
     */
    rainfall = new HeightMap(this.rainfall_pitch, this.rainfall_ratio, width, height);
    rainfall.setAleaSeed(this.rainfall_seed);
    rainfall.makeMap();
    // Rainfall : Post processing, but before smooth and crop, snow areas should have reduced rainfall.
    for(x = 0; x < width; x += 1) {
      for(y = 0; y < height; y += 1) {
        if (elevation.item[x][y] >= this.rainfall_height_max) {
          rainfall.item[x][y] = rainfall.item[x][y] % 5;
        }
      }
    }
    rainfall.smooth();
    rainfall.crop();
    /**
     * End of Rainfall process.
    /********************************************************************************/

    
    /********************************************************************************
     * STEP 4 :
     * Temperature process. Average temperature goes from 0 (5°C) to 20 (25°C)
     * [0 => 5°C, 5 => 10°C, 10 => 15°C, 15 => 20°C, 20 => 25°C]
     * This could be changed later, user could decide to move up or down the limits.
     */
    temperature = new HeightMap(this.temperature_pitch, this.temperature_ratio, width, height);
    temperature.setAleaSeed(this.temperature_seed);
    temperature.makeMap();
    // Temperature : Post processing, snow areas should have reduced temperature.
    for(x = 0; x < width; x += 1) {
      for(y = 0; y < height; y += 1) {
        if (elevation.item[x][y] >= this.temperature_height_max) {
          temperature.item[x][y] = temperature.item[x][y] % 10;
        } else if (temperature.item[x][y] < 5) {
          temperature.item[x][y] += 1;
        }
      }
    }
    temperature.smooth();
    temperature.crop();
    /**
     * End of Temperature process.
    /********************************************************************************/

    
    /********************************************************************************
     * STEP 5 :
     * Forest/Desert process.
     */
    // How to set desert or forest ?
    // a) internal process
    // Processed in the same heightmap. Desert and forest are both opposite.
    // With an heightmap of 7 (0,1,2 => desert) (3,4 => nothing) (5,6,7 => forest)
    // b) internal or external process
    // According to the level of temperature, rainfall, fertility and height,
    // we determine which part of the map could be a forest or a desert.
    // while drawing the map - let the user decide, or preprocess to avoid recurrent calculations.
    //
    // Desert from 0% to 100% => Fertility   from 10 to  0
    // Desert from 0% to 100% => Temperature from 17 to 20
    // Desert from 0% to 100% => Rainfall    from  3 to  0
    // Desert area            => Height      from  2 to  6
    //
    // Forest from 0% to 100% to 0% => Fertility   from 55 to 65 to 75
    // Forest from 0% to 100% to 0% => Temperature from 16 to 18 to 20
    // Forest from 0% to 100% to 0% => Rainfall    from 16 to 18 to 20
    // Forest area                  => Height      from  2 to  5
    /**
     * End of Fertility process.
    /********************************************************************************/
    

    /********************************************************************************
     * STEP 6 :
     * Population process. Population goes from 0 to 100 (eq. 1000 people/km²).
     * City size is user-defined and fit in the current map.
     */
    // Temporary heightmap object used to generate a populated area.
    var city = new HeightMap(this.city_pitch, this.city_ratio, this.city_width, this.city_height);
    city.setAleaSeed(this.city_seed);
    city.initialize(-1);
    city.fillBorders(0, 4);
    city.doMap(this.city_width, this.city_height, false);
    // Put the temporary object in final array with the right size.
    // Create an empty heightmap with the required size.
    population = new  HeightMap(0, 0, width, height);
    population.initialize(0);
    // Generate random location for the city.
    var h = 0, w2 = ~~(this.city_width/2), h2 = ~~(this.city_height / 2);
    while ((h < this.city_height_min) || (h > 6)) {
      x = p_randomMinMax(5, width  - this.city_width  - 5);
      y = p_randomMinMax(5, height - this.city_height - 5);
      h = elevation.item[x + w2][y + h2];
    }
    // Copy the temporary city array into the population heightmap.
    population.copy(city, x, y);
    // Crop to the requested size.
    population.crop(width, height)
    // Population : Post processing, reduce or increase the total population to match approximatively the requested amount.
    
    /**
     * End of Temperature process.
     * @ignore
    /********************************************************************************/

    this.average_height = 0;
    this.average_fertility = 0;
    this.average_rainfall = 0;
    this.average_temperature = 0;
    this.total_population = 0;

    this.map = {
                height: [],
                fertility: [],
                rainfall: [],
                temperature: [],
                population: []
               };
    for(x = 0; x < width; x += 1) {
      this.map.height[x]       = [];
      this.map.fertility[x]    = [];
      this.map.rainfall[x]     = [];
      this.map.temperature[x]  = [];
      this.map.population[x]   = [];
      for(y = 0; y < height; y += 1) {
        this.map.height[x][y]       = elevation.item[x][y];
        this.map.fertility[x][y]    = fertility.item[x][y];
        this.map.rainfall[x][y]     = rainfall.item[x][y];
        this.map.temperature[x][y]  = temperature.item[x][y];
        if (this.city_height_min <= elevation.item[x][y]) {
          this.map.population[x][y] = population.item[x][y];
          this.total_population    += population.item[x][y];
        } else {
          this.map.population[x][y] = 0;
        }
        this.average_height       += elevation.item[x][y];
        this.average_fertility    += fertility.item[x][y];
        this.average_rainfall     += rainfall.item[x][y];
        this.average_temperature  += temperature.item[x][y];
      }
    }
    
    // Calculate values for current city.
    this.average_height      /= (width * height);
    this.average_fertility   /= (width * height);
    this.average_rainfall    /= (width * height);
    this.average_temperature /= (width * height);
    this.total_population    *= 100;
    
    // this.ratio = {ocean : 0, sea : 0, plain : 0, moutain : 0, snow : 0};
  }

  if ((opt_width !== undefined) && (opt_width !== null) && (!isNaN(opt_width)) && (opt_width >= 50) && (opt_width <= 500)) {
    width = opt_width;
  } else {
    width = 100;
  }
  
  if ((opt_height !== undefined) && (opt_height !== null) && (!isNaN(opt_height)) && (opt_height >= 50) && (opt_height <= 500)) {
    height = opt_height;
  } else {
    height = 100;
  }
  
  // Default values for heightmaps.
  this.height_pitch = 8;
  this.height_ratio = 3.1;
  
  this.fertility_pitch = 100;
  this.fertility_ratio = 0.1;
  this.fertility_height_min = 2;
  this.fertility_height_max = 8;

  this.rainfall_pitch = 20;
  this.rainfall_ratio = 3.9;
  this.rainfall_height_max = 8;
  
  this.temperature_pitch = 20;
  this.temperature_ratio = 5;
  this.temperature_height_max = 7;

  this.city_pitch = 100;
  this.city_ratio = 0.1;
  this.city_width = 30
  this.city_height = 30;
  this.city_height_min = 3;
  
  this.setSeeds(1000);
}
