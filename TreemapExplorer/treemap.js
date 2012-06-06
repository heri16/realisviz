// ---------------------------------------------------------------------------
// ------------------- D3 Overrides for HTML5 transitions --------------------
// ---------------------------------------------------------------------------

if (Modernizr.csstransitions) {

  d3.transition.prototype.duration_o = d3.transition.prototype.duration;
  d3.transition.prototype.duration = function(milli) {
    // CSS3: transition-duration: 5s
    modCssClassProperty("treemap.css", ".cell", "-webkit-transition-duration", milli+"ms, "+milli+"ms, "+milli+"ms, "+milli+"ms");
    return this;
  };

  d3.transition.prototype.delay_o = d3.transition.prototype.delay;
  d3.transition.prototype.delay = function(milli) {
    // CSS3: transition-delay: 2s
    modCssClassProperty("treemap.css", ".cell", "-webkit-transition-delay", milli+"ms, "+milli+"ms, "+milli+"ms, "+milli+"ms");
    return this;
  };

  d3.selection.prototype.transition_o = d3.selection.prototype.transition;
  d3.selection.prototype.transition = function() {
    this.duration = d3.transition.prototype.duration;
    this.delay = d3.transition.prototype.delay
    return this;
  };

}

// ---------------------------------------------------------------------------
// --------------------- Library Class constructor here ----------------------
// ---------------------------------------------------------------------------

function D3Treemap(containerSelector) {

  // Input variables you can change
  this.w = 600;
  this.h = 500;
  this.pad = [0,0,0,0];
  this.sticky = true;

  // These are color scales
  var tColor = d3.scale.category20c();

  var pscale = d3.scale.linear()
      .domain([2000,40000])
      .range([1.0,0.2])
      .clamp(true);

  var cscale =  d3.scale.linear()
      .domain([0,10])
      .range([1.0,0.2])
      .clamp(true);

  var customScale =  d3.scale.linear()
      .range([1.0,0.2])
      .clamp(true);

  var dcolor = d3.scale.linear()
    .domain([0,100])
    .interpolate(d3.interpolateRgb)
    .range(["#ff0000", "#0000ff"]);

  // This simply inserts a new empty html div element, which the treemap will fill.
  this.tdiv = d3.select(containerSelector).append("div")
      .style("position", "relative")
      .style("width", this.w + "px")
      .style("height", this.h + "px")
      .attr("oncontextmenu", "return false;");

  // These are the default variables & functions used to generate the treemap
  this.treemap = null;
  this.parsedCsv = new Array();
  this.availableColumns = [];
  this.columnsKeyArray = {};
  this.columnsQuantileArray = {};


  //this.nestOrder = [ ];
  this.nestOrder = [ 'Property Type', 'Type of Sale', 'Postal Sector' ];
  this.rollupFunc = preCalculateStatsRollupFunc;         // Choices: [ allRowsRollupFunc, preCalculateStatsRollupFunc ]
  this.leafSizeFunc = calCountSizeFunc;        // Choices: [ calCountSizeFunc, fetchCountSizeFunc ]
  this.backgroundFunc = calAvgPsmPriceBgFunc(tColor, pscale);  // Choices: [ calAvgPsmPriceBgFunc, fetchAvgPsmPriceBgFunc ]
  this.nestOrderBinArray = {};

}
// ---------------------------------------------------------------------------
// ------------------ Procedural Programming ends here -----------------------
// ---------------------------------------------------------------------------

D3Treemap.prototype.loadCsvData = function (fileUrl, dateFormat) {
  var o = this;

  delete o.datetimeF;
  o.datetimeF = d3.time.format(dateFormat);

  //console.dir(timeF.parse("15-MAR-11"));
  //console.dir(timeF.parse("2011-03-15"));
  //console.dir(timeF.parse("15-MAR-2011"));

  d3.select("#loadByCustom").text("Loading...");

  // Load data & nest by selection before placing inside treeObj.
  d3.csv(fileUrl, function (csv) {
    var loadByCustomEl = d3.select("#loadByCustom");

    if (csv == null) {
      alert("Source csv file not found.");
      throw new Error("Source csv not found");
    }

    loadByCustomEl.text("Parsing...");
    //alert("Parsing...");

    // Clean blank lines in csv
    while (csv[csv.length - 1]['Project Name'] == "") {
      csv.splice(csv.length - 1, 1);
    }
    //log(csv);

    // Parse numerical values/strings using + operator (to improve performance)
    var i = csv.length;
    while (i--) {
      parseRow(csv[i]);
    }

    // Append new csv data to existing
    var buffCsv = o.parsedCsv.concat(csv);
    delete o.parsedCsv;
    o.parsedCsv = buffCsv;
    var parsedCsv = o.parsedCsv;

    for (var column in parsedCsv[0]) {
      if (o.availableColumns.indexOf(column) == -1) {
        o.availableColumns.push(column);
      }
    }
    //alert("Total Rows: " + parsedCsv.length);

    loadByCustomEl.text("Calculating Columns...");
    //alert("Calculating Columns...");
    o.calculateColumnsKeysAndQuantiles();

    loadByCustomEl.text("Generating Treemap...");
    //alert("Generating Treemap...");
    o.renestData();

    loadByCustomEl.text("Populating Columns...");
    //alert("Populating Columns...");

    // Populate Jquery Sortable Nesting Lists
    populateNestLists(o.nestOrder, o.availableColumns.filter(function (e, i, a) { return (o.nestOrder.indexOf(e) == -1); }));
    setTimeout(function() {
        populateNestListsDistinctVals("#nestOrderList", o.columnsKeyArray, o.datetimeF);
        populateNestListsDistinctVals("#availColList", o.columnsKeyArray, o.datetimeF);
      }, 100);

    /*
    // Nest the CSV data in this order
    var data = d3.nest()
            //.key(function(d) { return d['Planning Area']; })
            .key(function (d) {
              return d['Property Type'];
            })
            .key(function (d) {
              return d['Type of Sale'];
            })
            .key(function (d) {
              return d['Postal Sector'];
            })
            //.key(function(d) { return d['Area (sqm)'] >= 120 ? '>120sqm' : '<120sqm' ; })
            //.key(genNestBinFunc('Area (sqm)', [50,100,150]))
            .rollup(o.rollupFunc)
            .entries(parsedCsv);

    //log(data);

    var rootNode = {"key":"ALL", "values":data};
    o.generateTreemap(rootNode);
    //focusChart(parsedCsv);

    */

    loadByCustomEl.text("Load");
  });
};

function parseRow(row) {
  for (var key in row) {
    if (key.indexOf('Code') != -1) {
       // If Postal Code, or other codes, skip it.
      continue;
    }
    else if (key.indexOf('Date') != -1) {
      // If Date, parse it
      var date = row[key];
      //date = datetimeF.parse(row[key]);
      if (date) row[key] = date;
    }
    else if (!isNaN(row[key])) {
      // If Numerical, parse it
      row[key] = +row[key];
    }
  }
}

// Generate & Render Treemap unto browser's DOM/SVG.
D3Treemap.prototype.generateTreemap = function (rootNode) {
  var treemap = this.treemap;

  if (treemap) {
    // Remove all existing cells.
    //tdiv.selectAll("div").remove();

    treemap.sticky(false);
    treemap.sticky(true);
    treemap.value(this.leafSizeFunc);

  } else {

    treemap = d3.layout.treemap()
            .padding(this.pad)
            .size([this.w, this.h])
            .sticky(this.sticky)
            .children(function (d) {
              return (Array.isArray(d.values)) ? d.values : null;
            })
            .value(this.leafSizeFunc);

    this.treemap = treemap;
  }

  delete treemap.rootNode;
  treemap.rootNode = rootNode;

  // This is the original form of the next few lines
  //  div.data([rootNode]).selectAll("div")
  //    .data(treemap.nodes)

  /*
   tdiv.selectAll("div").data(treemap.nodes(treemap.rootNode))
   .enter().append("div")
   .attr("class", "cell")
   .style("background-color", backgroundFunc)
   .call(cell)
   //.classed("invisible", function(d) { return d.depth <= 1 ? false : true; })
   .attr("data-showall", function(d) { return d.depth <= 1 ? false : true; })
   .text(function(d) {
   if (d.key) {
   return d.key;
   } else if (d['Project Name']) {
   return d['Project Name'];
   } else {
   return null;
   }
   })
   .classed("hasChildren", function(d) { return d.children ? true : false; });
   */

  var cells = this.tdiv.selectAll("div").data(treemap.nodes(treemap.rootNode));

  cells.exit().remove();
  cells.enter().append("div").attr("class", "cell");

  cells.attr("data-showall", function (d) { return d.depth <= 1 ? false : true; })
          .text(function (d) {
            if (d.key) {
              return d.key;
            } else {
              return null;
            }
          })
          .style("opacity", 1)
          .classed("invisible", false)
          .classed("hasChildren", function (d) { return d.children ? true : false; })
        .transition().duration(1000)
          .style("background-color", this.backgroundFunc)
          .call(cell);


  // Next, wire treemap nodes events
  wireTreemapNodesEvents(this);

  // Lastly, button events must be wired.
  wireButtonEvents(this);

  // Reset buttons
  resetButtonStates(this);

  // Fire starting animations
  //div.selectAll("div .invisible").classed("invisible", false).call(fadeIn);

  var o = this;
  setTimeout(function() {
    o.toggleTitle(true);
  }, 1000);

};

D3Treemap.prototype.toggleTitle = function (force) {

  if (!force && d3.select("#toggleTitle").classed("active") == true) {

    this.tdiv.selectAll("div")
        .data(this.treemap.padding([0,1,1,0]).nodes(this.treemap.rootNode))
      .transition().duration(1500)
        .call(cell);

    d3.select("#toggleTitle").classed("active", false);

  } else {
    this.tdiv.selectAll("div")
        .data(this.treemap.padding([12,4,4,4]).nodes(this.treemap.rootNode))
      .transition().duration(1500)
        .call(cell);

    d3.select("#toggleTitle").classed("active", true);
  }

};

D3Treemap.prototype.renestData = function() {
  var nestOrder = this.nestOrder;
  var nestOrderBinArray = this.nestOrderBinArray;

  var nest = d3.nest();
  var len = nestOrder.length;
  for (var i = 0; i < len; i++) {
    var colName = nestOrder[i];

    if (nestOrderBinArray[colName]) {
      nest.key(genNestBinFunc(colName, nestOrderBinArray[colName]));
      //log(colName + "=> " + nestOrderBinArray[colName]);
    } else {
      nest.key(genNestKeyFunc(colName));
      //log(colName);
    }
  }
  var data = nest.rollup(this.rollupFunc).entries(this.parsedCsv);

  //log(data);

  var rootNode = {"key":"ALL", "values":data};
  this.generateTreemap(rootNode);

};

D3Treemap.prototype.calculateColumnsKeysAndQuantiles = function() {
  var parsedCsv = this.parsedCsv;
  var availableColumns = this.availableColumns;
  var columnsKeyArray = this.columnsKeyArray;
  var columnsQuantileArray = this.columnsQuantileArray;

  var i = availableColumns.length;
  while (i--) {
    var colName = availableColumns[i];   // e.g. "Property Type"


    if (parsedCsv[0][colName].constructor === Number) {
      delete columnsKeyArray[colName];
      var colPopulation = parsedCsv.map(function(e) { return e[colName]; }).sort(d3.ascending);
      columnsKeyArray[colName] = colPopulation.distinctB(true);

    } else {

      delete columnsKeyArray[colName];
      columnsKeyArray[colName] = parsedCsv.map(function(e) { return e[colName]; }).distinctC().sort();
    }

    // Auto-binning if too many unique categories
    /*
    if ( columnsKeyArray[colName].length > 20 && columnsKeyArray[colName][0].constructor === Number && colName.indexOf('Postal') == -1) {
      log("binning..." + colName);
      var colPopulation = colPopulation.sort();
      columnsQuantileArray[colName] = [];
      var p = [0, 0.25, 0.5, 0.75, 1];

      for (var i in p) {
        columnsQuantileArray[colName].push(d3.quantile(colPopulation, p[i]));
      }
      log("bone binning.");
    }
    */

  }
};

// ---------------------------------------------------------------------------
// -------------------- UI Enhancements starts here --------------------------
// ---------------------------------------------------------------------------

function wireTreemapNodesEvents(o) {
  var tdiv = o.tdiv;
  var treemap = o.treemap;

  tdiv.selectAll("div").on("click", function(d, i) {
    var e = d3.event, datum = d, dep = d.depth;
    if (d.children) {
      //alert("Key: " + d.key + ", i: " + i);

      tdiv.selectAll("div")
        .filter(function(d) {
          if (d.parent) {
            return d.depth == dep+1 && d.parent == datum;
          } else {
            return d.depth == dep+1;
          }
        })
          .style("opacity", 0.0)
          .classed("invisible", false)
        .transition().duration(500)
          .style("opacity", 1.0);

      var rows = combineAllChildrenRows(d);
      //console.dir(rows);
      //focusChart(rows);
    } else {
      //alert("Key: " + d.key + ", Average Psm Price: " + d.values['avgPsmPrice']);
      //focusChart(d.values.rows);

      var postalSector = d.values.rows[0]["Postal Sector"];
      //$('#singaporeMap').dialog({width: 700, height: 440});
      //$("#"+postalSector).dblclick();
      //$("#"+postalSector).toggleClass("sectorSelected");
    }
  });

  tdiv.selectAll("div").on("mousedown", function(d, i) {
    var e = d3.event;

    if (e.which === 3) {
      zeroWithChildren(d);

      tdiv.selectAll("div")
          .data(treemap.value(function(d) { return d.value; }).nodes(treemap.rootNode))
        .transition().duration(500)
          .call(cell);

      e.preventDefault();
    }

    //return false;
  });

  tdiv.selectAll("div").on("mouseover", function(d, i) {
    var e = d3.event;

    if (!d.children) {
      var postalSector = d.values.rows[0]["Postal Sector"];
      //$("#"+postalSector).not(".sectorSelected").dblclick();
    }

  });

  tdiv.selectAll("div").on("mouseout", function(d, i) {
    var e = d3.event;

    if (!d.children) {
      var postalSector = d.values.rows[0]["Postal Sector"];
      //$("#"+postalSector).not(".sectorSelected").click();
    }
  });
}

function wireButtonEvents(o) {
  var tdiv = o.tdiv;
  var treemap = o.treemap;

  d3.select("#sizeByUnitPrice").on("click", function() {
    tdiv.selectAll("div")
        .data(treemap.value(function(d) { return d.values['avgPsmPrice']; }).nodes(treemap.rootNode))
      .transition().duration(1500)
        .style("background-color", fetchCountBgFunc)
        .call(cell);

    d3.select("#sizeByCount").classed("active", false);
    d3.select("#sizeByArea").classed("active", false);
    d3.select("#sizeByUnitPrice").classed("active", true);
  });

  d3.select("#sizeByCount").on("click", function() {
    tdiv.selectAll("div")
        .data(treemap.value(function(d) { return d.values['count']; }).nodes(treemap.rootNode))
      .transition().duration(1500)
        .style("background-color", fetchAvgPsmPriceBgFunc)
        .call(cell);

    d3.select("#sizeByCount").classed("active", true);
    d3.select("#sizeByArea").classed("active", false);
    d3.select("#sizeByUnitPrice").classed("active", false);
  });

  d3.select("#sizeByArea").on("click", function() {
    tdiv.selectAll("div")
        //.data(treemap.value(function(d) { return d.values['avgArea']; }).nodes(treemap.rootNode))
        .data(treemap.value(genCalColumnTotalSizeFunc("Area (sqm)")).nodes(treemap.rootNode))
      .transition().duration(1500)
        //.style("background-color", fetchAvgPsmPriceBgFunc)
        .style("background-color", genCalColumnAvgBgFunc(10, pscale, "Unit Price ($ psm)", "No. of Units"))
        .call(cell);

    d3.select("#sizeByCount").classed("active", false);
    d3.select("#sizeByArea").classed("active", true);
    d3.select("#sizeByUnitPrice").classed("active", false);
  });

  d3.select("#renderByCustom").on("click", function() {
    var sizeByColumn = d3.select("#sizeByCustom").node().value;
    var colorByColumn = d3.select("#colorByCustom").node().value;

    var q = columnsQuantileArray[colorByColumn]
    var lightScale = q ? customScale.domain([ q[0], q[3] ]) : pscale;

    tdiv.selectAll("div")
        .data(treemap.value(genCalColumnTotalSizeFunc(sizeByColumn)).nodes(treemap.rootNode))
      .transition().duration(1500)
        .style("background-color", genCalColumnAvgBgFunc(10, lightScale, colorByColumn, "No. of Units"))
        .call(cell);

    d3.select("#sizeByCount").classed("active", false);
    d3.select("#sizeByArea").classed("active", false);
    d3.select("#sizeByUnitPrice").classed("active", false);
  });

  d3.select("#toggleTitle").on("click", function() { o.toggleTitle(); });

  d3.select("#toggleSticky").on("click", function() {
    var newSticky = !d3.select("#toggleSticky").classed("active");

    treemap.sticky(newSticky);
    if (newSticky) {
      // Rebind data inserting sticky-mode's z-column.
      tdiv.selectAll("div")
          .data(treemap.nodes(treemap.rootNode));
    } else {
      // Relayout optimally (as stickymode is now off)
      tdiv.selectAll("div")
          .data(treemap.nodes(treemap.rootNode))
        .transition().duration(1000)
          .call(cell);
    }

    d3.select("#toggleSticky").classed("active", newSticky);
    d3.select("#relayoutSticky").property("disabled", !newSticky);
  });

  d3.select("#relayoutSticky").on("click", function() {
    tdiv.selectAll("div")
          .data(treemap.sticky(false).nodes(treemap.rootNode))
        .transition().duration(500)
          .call(cell);

    tdiv.selectAll("div")
          .data(treemap.sticky(true).nodes(treemap.rootNode));
  });

  d3.select("#toggleShowAll").on("click", function() {
    if (d3.select("#toggleShowAll").classed("active") == true) {
      tdiv.selectAll("div [data-showall=true]").attr("data-showall", false).call(fadeOut).classed("invisible", true);
      d3.select("#toggleShowAll").classed("active", false);
    } else {
      tdiv.selectAll("div .invisible").attr("data-showall", true).classed("invisible", false).call(fadeIn);
      d3.select("#toggleShowAll").classed("active", true);
    }
  });

  d3.select("#renestData").on("click", function() {
    var nestOrder = [];
    d3.select("#nestOrderList").selectAll("li").each(function(d) {
      nestOrder.push(d);
    });

    o.nestOrder = nestOrder;
    o.renestData();
  });
}

function resetButtonStates(o) {
  d3.select("#toggleShowAll").classed("active", true);
  d3.select("#toggleTitle").classed("active", false);
  d3.select("#toggleSticky").classed("active", true);
}

function populateNestLists(activeColumns, inactiveColumns) {
  // Populate jquery sortable lists

  d3.select("#nestOrderList").selectAll("li").remove();
  var li = d3.select("#nestOrderList").selectAll("li")
            .data(activeColumns)
          .enter().append("li")
            .attr("class", "ui-state-default")
            .attr("data-colName", function(d) { return d; });
  li.append("span").attr("class", "ui-icon ui-icon-arrowthick-2-e-w");
  li.append("div").text(function(d) { return d; });

  d3.select("#availColList").selectAll("li").remove();
  var li = d3.select("#availColList").selectAll("li")
            .data(inactiveColumns)
          .enter().append("li")
            .attr("class", "ui-state-default")
            .attr("data-colName", function(d) { return d; });
  li.append("span").attr("class", "ui-icon ui-icon-arrowthick-2-e-w");
  li.append("div").text(function(d) { return d; });

}


function populateNestListsDistinctVals(columnsListId, columnsKeyArray, datetimeF) {

  var columnsListSelection = d3.select(columnsListId).selectAll("li");
  if (columnsListSelection.select("div.colKeysWindow").empty()) {
    columnsListSelection.append("div").attr("class", "colKeysWindow");
  }

  columnsListSelection.select("div.colKeysWindow")
      .text(function(d) {
        var html = [];

        var columnKeys = columnsKeyArray[d];

        if (columnKeys[0] instanceof Date) {
          var i = columnKeys.length;
          while (i--) {
            var colKey = columnKeys[i];
            try { colKey = datetimeF(colKey); } catch(ex) {}
            //html.push("<div data-colKey='" + colKey + "'>" + colKey + "</div>");
            html.push("\n",colKey);
          }

        } else {
          var i = columnKeys.length;
          while (i--) {
            var colKey = columnKeys[i];
            //html.push("<div data-colKey='" + colKey + "'>" + colKey + "</div>");
            html.push("\n", columnKeys[i]);
          }
        }

        return html.reverse().join("");
      });

}

// ---------------------------------------------------------------------------
// ------------------ Algorithmic Arsenal starts here ------------------------
// ---------------------------------------------------------------------------


// ------- Begin: Static algorithms that pre-calculate -------

function preCalculateStatsRollupFunc(d) {
  var maxPsmPrice = d3.max(d, function(e) { return e['Unit Price ($ psm)']; } );
  var avgPsmPrice = 0;
  var count = 0;
  var avgArea = 0;

  // d is array of all rows with each nesting-property type.
  var i = d.length;
  while (i--) {
    var di = d[i];
    var psmPrice = +di['Unit Price ($ psm)'];
    var unitCount = +di['No. of Units'];
    var area = +di['Area (sqm)'];

    avgPsmPrice += psmPrice * unitCount;    // avgPsmPrice += psmPrice;
    count += unitCount;   // count ++;
    avgArea += area * unitCount;
  }

  avgPsmPrice = avgPsmPrice / count;
  avgArea = avgArea / count;
  return {"maxPsmPrice":maxPsmPrice, "avgPsmPrice":avgPsmPrice, "count":count, "avgArea":avgArea, "rows": d};
}

function preCalculateMaxStatsRollupFunc(d) {
  var maxPsmPrice = d3.max(d, function(d) {return d['Unit Price ($psm)']; });
  return {"rows": d, "maxPsmPrice": maxPsmPrice};
}

function fetchCountSizeFunc(d) {
  return d['No. of Units'] ? +d['No. of Units'] : +d.values['count'];
}

function fetchAvgPsmPriceBgFunc(d) {
  if (d.children) {
    return tColor((d.parent ? d.parent.key + "-" : null) + d.key);
    //return "grey";
  } else if (d.values && d.values['avgPsmPrice']) {
    return d3.hsl(10, 0.8, pscale(d.values.avgPsmPrice));
  } else {
    return null;
  }
}

function fetchCountBgFunc(d) {
  if (d.children) {
    return tColor((d.parent ? d.parent.key + "-" : null) + d.key);
    //return "grey";
  } else if (d.values && d.values['count']) {
    return d3.hsl(300, 0.8, cscale(d.values.count));
  } else {
    return null;
  }
}


// ------- Begin: Static algorithms that calculate-on-the-fly -------

function allRowsRollupFunc(d) {
  return {"rows": d};
}

function calCountSizeFunc(d) {
  return d.values.rows.reduce(function(prevVal, curVal, idx, array) {
    return prevVal + curVal['No. of Units'];
  }, 0);
}

function calAvgPsmPriceSizeFunc(d) {
  var count = calCountSizeFunc(d);
  var total = d.values.rows.reduce(function(prevVal, curVal, idx, array) {
      return prevVal + (curVal['Unit Price ($ psm)'] * curVal['No. of Units']);
    }, 0);
  var avgPsmPrice = total/count;

  return avgPsmPrice;
}

function calAvgPsmPriceBgFunc(color1, lightScale) {

  return function(d) {
    if (d.children) {
      return color1((d.parent ? d.parent.key + "-" : null) + d.key);
      //return "grey";
    } else if (d.values && d.values.rows) {
      var avgPsmPrice = calAvgPsmPriceSizeFunc(d);

      return d3.hsl(10, 0.8, lightScale(avgPsmPrice));
    } else {
      return null;
    }
  }
}


// ------- Begin: Dynamic generators for algorithms that calculate-on-the-fly -------

function genCalColumnTotalSizeFunc(colName) {
  return function(d) {
    return d.values.rows.reduce(function(prevVal, curVal, idx, array) {
      return prevVal + curVal[colName];
    }, 0);
  };
}

function genCalColumnAvgSizeFunc(colName, countColName) {
  if (countColName === undefined) {
    // Normal Average
    return function(d) {
      var count = d.values.rows.length;
      var total = d.values.rows.reduce(function(prevVal, curVal, idx, array) {
            return prevVal + curVal[colName];
          }, 0);
      var colAverage = total/count;

      return colAverage;
    };

  } else {
    // Weighted Average
    return function(d) {
      var count = genCalColumnTotalSizeFunc(countColName)(d);
      var total = d.values.rows.reduce(function(prevVal, curVal, idx, array) {
            return prevVal + (curVal[colName] * curVal[countColName]);
          }, 0);
      var colAverage = total/count;

      return colAverage;
    };
  }
}

function genCalColumnAvgBgFunc(hue, lightScale, colName, countColName) {
  return function(d) {
    if (d.children) {
      return tColor((d.parent ? d.parent.key + "-" : null) + d.key);
      //return "grey";
    } else if (d.values && d.values.rows) {
      var colAverage = genCalColumnAvgSizeFunc(colName, countColName)(d);

      return d3.hsl(hue, 0.8, lightScale(colAverage));
    } else {
      return null;
    }
  };
}


// ------- Begin: Dynamic generators for nesting algorithms -------

function genNestKeyFunc(colName) {
  // This is rescope/closures programming technique.
  // See: http://stackoverflow.com/questions/2382359/how-to-copy-a-variable-in-javascript
  return function(d) { return d[colName]; };
}

function genNestBinFunc(colName, binArray) {
  binArray.sort(d3.ascending);
  return function(d) {
    for (var i in binArray) {
      if (d[colName] <= binArray[i]) {
        return "<=" + binArray[i];
      }
    }
    return ">" + binArray[binArray.length-1];
  };
}


// ---------------------------------------------------------------------------
// ------------------ Helper functions starts here ---------------------------
// ---------------------------------------------------------------------------

function cell() {
  this
      .style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return d.dx + "px"; })
      .style("height", function(d) { return d.dy + "px"; })
      .style("border-width", function(d) { return (d.dx == 0 || d.dy == 0) ? "0px" : null; });
}

function combineAllChildrenRows(d) {
  return recurseAllChildrenRows(d);
}

function recurseAllChildrenRows(d) {
  if (d.children)
  {
    var childs = d.values;
    var collectorArray = new Array();

    var i = childs.length;
    while (i--) {
      var eachChild = childs[i];
      var eachChildRows = recurseAllChildrenRows(eachChild);
      collectorArray = collectorArray.concat(eachChildRows);
    }
    return collectorArray;
  }
  else
  {
    return d.values.rows;
  }
}

function zeroWithChildren(datum) {
	datum.value = 0;
	if(datum.children) {
    var i = datum.children.length;
		while (i--) {
			zeroWithChildren(datum.children[i]);
		}
	}
}

function fadeIn() {
  this
        .style("opacity", 0.0)
      .transition().duration(500)
        .style("opacity", 1.0);
}

function fadeOut() {
  this
        .style("opacity", 1.0)
      .transition().duration(500)
        .style("opacity", 0.0);
}

function log(msg, args) {
  var params = null;
  var logDiv = document.getElementById('log');

  if (msg === null) msg = "null";
  if (args) {
    params = [msg];
    params = params.concat(args);
    console.log.apply(console, params);
   }

  try {
    var timeString = (new Date()).toLocaleTimeString();
    timeString = "<small>" + timeString + "</small>";

    if (typeof msg === "object") {
      console.dir(msg);
      logDiv.innerHTML += timeString + "<br />" + JSON.stringify(msg) + "<hr />";
    } else {
      logDiv.innerHTML += timeString + "<br />" + msg + "<hr />";
    }
  } catch(ex) {
    //console.warn("Error:", ex.type);
  }

  return msg;
}

// ---------------------------------------------------------------------------
// -------------- Array Filter Unique/Distinct fast algorithms ---------------
// ---------------------------------------------------------------------------

// Very Good for presorted number/string arrays on Firefox
// Very Good for unsorted number/string arrays on Firefox
Array.prototype.distinctA = function(sorted) {
  var array = (sorted ? this : this.sort());
  var len = array.length, nw = (len >= 1 ? [array[0]] : []);
  for(var i = 1; i < len; i++) {
    if(nw[nw.length -1] != array[i]) {
      nw.push(array[i]);
    }
  }
  return nw;
};

// Very Very Good for presorted number/string arrays on Chrome
Array.prototype.distinctB = function(sorted) {
  if (!sorted) this.sort();
  return this.filter(function(e, i, arr) {
    return e !== arr[i - 1]
  });
};

// Very Good for unsorted number/string arrays on Chrome
Array.prototype.distinctC = function () {
  var ret = [],
          vals = {},
          l = this.length,
          val;
  for (var i = 0; i < l; i++) {
    val = this[i];
    if (!vals[val]) {
      vals[val] = true;
      ret[ret.length] = val;
    }
  }
  return ret;
};

// Average for unsorted number/string arrays on Chrome/Firefox
Array.prototype.distinctD = function() {
  return this.filter(function(e, i, arr) {
    return e in this ? false : this[e] = true;
  }, {});
};


// ---------------------------------------------------------------------------
// -------------------- Tutorial Example kept here ---------------------------
// ---------------------------------------------------------------------------

/*

d3.json("../data/flare.json", function(json) {
  div.data([json]).selectAll("div")
      .data(treemap.nodes)
    .enter().append("div")
      .attr("class", "cell")
      .style("background", function(d) { return d.children ? color(d.name) : null; })
      .call(cell)
      .text(function(d) { return d.children ? null : d.name; });

  d3.select("#size").on("click", function() {
    div.selectAll("div")
        .data(treemap.value(function(d) { return d.size; }))
      .transition()
        .duration(1500)
        .call(cell);

    d3.select("#size").classed("active", true);
    d3.select("#count").classed("active", false);
  });

  d3.select("#count").on("click", function() {
    div.selectAll("div")
        .data(treemap.value(function(d) { return 1; }))
      .transition()
        .duration(1500)
        .call(cell);

    d3.select("#size").classed("active", false);
    d3.select("#count").classed("active", true);
  });
});

*/


// ---------------------------------------------------------------------------
// ------------------ Jquery functions starts here ---------------------------
// ---------------------------------------------------------------------------

function wireBinSlider(binSliderEl, o) {

  var colName = binSliderEl.attr("data-colName");
  var colQuantileArray = o.columnsQuantileArray[colName];
  var colBinArray = o.nestOrderBinArray[colName];
  var nestOrderBinArray = o.nestOrderBinArray;
  
  var thisSliderStatus = $('<div></div>').addClass("binSlider-status");
  binSliderEl.before(thisSliderStatus);

  binSliderEl.slider({
    //range: true,//don't set range
    //min: 0,
    //max: 300;
    //step: 10,
    //values: [ 50, 100, 150, 280 ],
    min: colQuantileArray[0],
    max: colQuantileArray[colQuantileArray.length-2] + 10,
    step: 1,
    values: (colBinArray ? colBinArray : colQuantileArray.slice(1, colQuantileArray.length-1)),
    slide: function(evt,ui) {
      thisSliderStatus.text(ui.values.join(" - "));
      return true;
    },
    change: function(evt,ui) {
      nestOrderBinArray[colName] = ui.values;
      //log(nestOrderBinArray);
    }
  });

  nestOrderBinArray[colName] = binSliderEl.slider("values");
  thisSliderStatus.text(binSliderEl.slider("values").join(" - "));
}

function wireKeyFilter(keyFilterEl, o) {

  var colName = keyFilterEl.attr("data-colName");
  var columnsKeyArray = o.columnsKeyArray;
  var datetimeF = o.datetimeF;

  keyFilterEl.html(function() {
    var html = [];

    var columnKeys = columnsKeyArray[colName];
    if (columnKeys[0] instanceof Date) {
      var i = columnKeys.length;
      while (i--) {
        var colKey = columnKeys[i];
        html.push("<option value='" + colKey + "' selected='selected'>" + colKey + "</option>");
      }

    } else {
      var i = columnKeys.length;
      while (i--) {
        var colKey = columnKeys[i];
        html.push("<option value='" + colKey + "' selected='selected'>" + colKey + "</option>");
      }
    }

    return html.reverse().join("");
  });

  keyFilterEl.multiselect({
    minWidth: 130
  }).multiselectfilter({
    autoReset: true
  });

}

