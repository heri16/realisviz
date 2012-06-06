


var m = [20, 60, 20, 60],
    w = 960 - m[1] - m[3],
    h = 500 - m[0] - m[2],
	  h2 = h,
    format = d3.time.format("%d-%b-%Y"),
	mformat = d3.time.format("%Y-%m"),
    mformat2 = d3.time.format("%Y-%m-%d"),
    minterval = d3.time.months;

// Scales. Note the inverted domain for the y-scale: bigger is up!
var x = d3.time.scale().range([0, w]),
	x2 = d3.time.scale().range([2, w+2]),
    y = d3.scale.linear().range([h, 0]),
    y2 = d3.scale.linear().range([h2,0]);

// Axes.
var xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true),
    yAxis = d3.svg.axis().scale(y).ticks(7).orient("right");
    y2Axis = d3.svg.axis().scale(y2).ticks(4).orient("left");

// A line generator, for the dark stroke.
  var line = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) {
		return x(mformat2.parse(d.key + "-15"));
	})
    .y(function(d) {
		return y(d.values['maxPsmPrice']);
	});

// Add an SVG element with the desired dimensions and margin.
  var svg = d3.select("#focusDiv").append("svg:svg")
      .attr("class", "fchart")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
    .append("svg:g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")")
	  .attr("height", h)
	  .attr("width", w);

  var glayer0 = svg.append("svg:g").attr("height", h).attr("width", w);
  var glayer1 = svg.append("svg:g").attr("height", h).attr("width", w);
  var glayer2 = svg.append("svg:g").attr("height", h).attr("width", w);

  // Add the x-axis.
  glayer0.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (h) + ")")
      .call(xAxis);

  // Add the y-axis.
  glayer0.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (w+1) + ",0)")
      .call(yAxis);
  // Add the y2-axis.
  glayer0.append("svg:g")
      .attr("class", "y2 axis")
      .attr("transform", "translate(-1 ,0)")
      .call(y2Axis);      

  // Add axes labels
  glayer0.append("svg:text")
    .attr("x", 0)
    .attr("y", h + 10)
    .attr("dy", 3)
    .attr("text-anchor", "middle")
    .text("Year");
  glayer0.append("svg:text")
    .attr("x", w)
    .attr("y", -10)
    .attr("dx", -3)
    .attr("text-anchor", "start")
    .text("Price");
  glayer0.append("svg:text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("dx", -3)
    .attr("text-anchor", "end")
    .text("Units");
   
  // Add interactive label 
  var interactText = glayer0.append("svg:text")
    .attr("x", 20)
    .attr("y", 20)
    .attr("text-anchor", "start")
    .text("");
  
  // Add the clip path.
  svg.append("svg:clipPath")
      .attr("id", "clip")
    .append("svg:rect")
      .attr("width", w)
      .attr("height", h);

/*
// An area generator, for the light fill.
var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.date); })
    .y0(h)
    .y1(function(d) { return y(d.price); });
*/

/*
  // Add the area path.
  svg.append("svg:path")
      .attr("class", "area")
      .attr("clip-path", "url(#clip)")
      .attr("d", area(values));
*/

function focusChart(data) {
  //console.dir(data);
/*
  // Parse dates and numbers. We assume values are sorted by date.
  data.forEach(function(d) {
	d['Contract Date'] = format.parse(d['Contract Date']);
    d['Unit Price ($ psm)'] = +d['Unit Price ($ psm)'];
  });
*/
  
  // put them in property type json
  var data1 = d3.nest()
      .key(function(d) { return d['Property Type']; })
	  .key(function(d) { return d['Type of Sale']; })
	  .key(function(d) { return mformat(d['Contract Date']); }).sortKeys(d3.ascending)
	  .rollup(function(d) {
	      var totalPrice = d3.sum(d, function(e) { return e['Unit Price ($ psm)']; } );
		  var maxPsmPrice = Math.round(totalPrice / d.length);
          var totalUnits = 0;
				   for (dRow in d){
				   		totalUnits += parseInt(d[dRow]["No. of Units"]);
				   }
	       return { "rows": d, "maxPsmPrice": maxPsmPrice, "totalUnits": totalUnits };
		 })
      .entries(data);

    //console.dir(data1);

  var data2 = d3.nest()
			  .key(function(d) { return mformat(d['Contract Date']); }).sortKeys(d3.ascending)
			  .rollup(function(d) {
                   var totalPrice = d3.sum(d, function(e) { return e['Unit Price ($ psm)']; } );
                   var maxPsmPrice = Math.round(totalPrice / d.length);
				   var totalUnits = 0;
				   for (dRow in d){
				   		totalUnits += parseInt(d[dRow]["No. of Units"]);
				   }

				   return { "rows": d, "totalUnits": totalUnits, "maxPsmPrice": maxPsmPrice };
				 })
			  .entries(data);
  //console.dir(data2);


  // Compute the minimum and maximum date, and the maximum price.
  var maxX = mformat2.parse(d3.max(data2, function(d){ return d.key; }) + "-15");
  var minX = mformat2.parse(d3.min(data2, function(d){ return d.key; }) + "-15");
  x.domain([minX, maxX]);
  x2.domain([minX, maxX]);

  // var prices = data2.map(function(r) { return r.values.maxPsmPrice; });
  var maxY = d3.max(data2, function(d){ return d.values.maxPsmPrice;});
  var minY = 0;
  y.domain([minY, maxY * 1.1]);
  y2.domain([0, d3.max(data2, function(d) { return d.values.totalUnits; }) * 1.1 ]);

  // Ask axes to morph to accomodate new values.
  svg.selectAll(".x.axis").transition().duration(1000).call(xAxis);
  svg.selectAll(".y.axis").transition().duration(1000).call(yAxis);
  svg.selectAll(".y2.axis").transition().duration(1000).call(y2Axis);

  // Clear out old lines & bars.
  svg.selectAll("path.line").remove();
  svg.selectAll("rect.bar").remove();

  // Insert new lines & bars.
  generateBars(data2, "bar");
  generateAllLines(data1);
  
  // Generate Raw-Data table headers
  $("#dataTableHead > tr").empty();
  for (var colName in data[0]) {
    $("#dataTableHead > tr").append("<th>"+colName+"</th>");
  }
  
  /*

  var hierarchy = d3.layout.hierarchy()
      .children(function(d) { return (d.values instanceof Array) ? d.values : null })
	  .value(function(d) { return d.values.rows; } );

  hierarchy.nodes({"key": "ROOT", "values": values});
    */

  /*
  // On click, update the x-axis.
  svg.on("click", function() {
    var n = values.length - 1,
        i = Math.floor(Math.random() * n / 2),
        j = i + Math.floor(Math.random() * n / 2) + 1;
    x.domain([values[i].date, values[j].date]);
    var t = svg.transition().duration(750);
    t.select(".x.axis").call(xAxis);
    t.select(".line").attr("d", line(values));
  }); */

}

  function generateBars(data, className) {
      var barWidth = w / data.length;
      var intX = x2.ticks(minterval, 1);
      barWidth = (x2(intX[1]) - x2(intX[0]));
  
      console.dir(data);
      glayer1.selectAll("rect." + className)
		.data(data, function(d) { return d ? d.key : null; })
      .enter().append("svg:rect")
	    .attr("class", className)
        .attr("clip-path", "url(#clip)")
		.attr("x", function(d, i) { return x2(mformat.parse(d.key)); })
		.attr("y", function(d) { return y2(d.values.totalUnits); })
		.attr("width", barWidth)
		.attr("height", function(d) { return h2 - (y2(d.values.totalUnits)) - 1; })
      .on("mouseover",function(d,i){
					$("#displayTransactionPeriod").text(d.key);
					$("#displayPropertyType").text(d.values.rows[0]["Property Type"]);
					$("#displayTypeOfSales").text(d.values.rows[0]["Type of Sale"]);
					$("#displayAvgPrice").text("$" + d.values.maxPsmPrice);
					$("#displayTotalUnits").text(d.values.totalUnits + " units");
        })
      .on("click",function(d,i){
					var dTable = $("#dataTable").dataTable();
					dTable.fnClearTable();
					
					var rowsData = [];
					var rowlimit = d.values.rows.length <= 1000 ? d.values.rows.length : 1000;
					for (var i = 0; i < rowlimit; i++){
						var rowData = [];
						for (var colName in d.values.rows[0]) {
							var cellVal = d.values.rows[i][colName];
							rowData.push(cellVal);
						}
						rowsData.push(rowData);
					}
					
					$("#dataTableDiv").dialog({ width: 800, title: 'Raw Data' });
					dTable.fnAddData(rowsData);
					
					/*$("#dataTableBody").empty();
					var rowlimit = d.values.rows.length <= 1000 ? d.values.rows.length : 1000;
					for (var i = 0; i < rowlimit; i++){
						var rowString = "<tr>";
						for (var colName in d.values.rows[0]) {
							var cssColor = (i % 2) ? "odd" : "even";
							var cellVal = d.values.rows[i][colName];
							rowString += "<td>" + cellVal + "</td>";
						}
						rowString += "</tr>";
						$("#dataTableBody").append(rowString);
					}*/
					
					/*
					var aoColumns = [];
					for (var colName in d.values.rows[0]) {
						aoColumns.push({"mDataProp": colName});
					}
					var dTable = $("#dataTable").dataTable({ "aoColumns": aoColumns });
					dTable.fnClearTable();
					dTable.fnAddData(d.values.rows);
					*/

        });
  }
  
  function redrawBars2(data) {
    var rectBarsTransDelay = 0;
    var needRescaleBars = rescaleBarsAxis(data);
    if (needRescaleBars) {
      rescaleBars("bar");
      rescaleBars("bar2");
      rectBarsTransDelay = 1000;
    }
    
    svg.selectAll("rect.bar")
      .transition().delay(rectBarsTransDelay).duration(500)
        .style("opacity", 0)
        .remove();
    
    svg.selectAll("rect.bar2")
      .transition().delay(rectBarsTransDelay).duration(500)
        .style("fill-opacity", 1)
      .transition().delay(rectBarsTransDelay+500).duration(500)
        .style("fill", "steelblue")
        .attr("class", "bar");
  }

  function rescaleBarsAxis(data) {
      var maxY2 = d3.max(data, function(d) { return d.values.totalUnits});
      var currentY2Domain = y2.domain();
      var currentMaxY2 = currentY2Domain[1];
      
      var needRescaleBarsAxis = true;
      if (maxY2 < currentMaxY2*(1/4)) {
        y2.domain([0, maxY2*4]);
      } else if (maxY2 > currentMaxY2) { 
        y2.domain([0, maxY2*1.1]);
      } else {
        needRescaleBarsAxis = false;
      }
      
      if (needRescaleBarsAxis) { svg.selectAll(".y2.axis").transition().duration(1000).call(y2Axis); }
      return needRescaleBarsAxis;
  }

  function rescaleBars(className) {  
      var rect = svg.selectAll("rect." + className);
		  
      rect.transition()
		  .duration(1000)
		  .attr("y", function(d) { return y2(d.values.totalUnits); })
		  .attr("height", function(d) { return Math.abs(h2 - y2(d.values.totalUnits) - 1); });

  }

  function redrawBars(data, className) {
      var barWidth = w / data.length;
      var intX = x2.ticks(minterval, 1);
      barWidth = (x2(intX[1]) - x2(intX[0]));
     
	  var rect = svg.selectAll("rect." + className)
		  .data(data, function(d) { return d ? d.key : null; });

      // What to do for new data that previously do not exist.
      rect.enter().append("svg:rect")
            .attr("class", className)
            .attr("x", function(d, i) {
                  var date = mformat.parse(d.key);
                  //console.log(date.toString(), date);
                  return x2(date);
              })
            .attr("y", y2(0) )
            .attr("width", barWidth)
            .attr("height", h2 - y2(0))
          .transition()
            .duration(1000)
            .attr("y", function(d) { return y2(d.values.totalUnits); })
		    .attr("height", function(d) { return Math.abs(h2 - y2(d.values.totalUnits) - 1); });

      // What to do for data that existed & staying
      rect.transition()
		  .duration(1000)
          .attr("x", function(d, i) {
                  var date = mformat.parse(d.key);
                  //console.log(date.toString(), date);
                  return x2(date);
              })
		  .attr("y", function(d) { return y2(d.values.totalUnits); })
		  .attr("height", function(d) { return Math.abs(h2 - y2(d.values.totalUnits) - 1); });

      // What to do for data that is existed, but is deleted.
      rect.exit().transition()
            .duration(1000)
            .attr("y", y2(0) )
            .attr("height", h2 - y2(0));
            //.remove();


  }
  




function generateAllLines(data) {

  console.dir(data);

  /*
  var stack = new Array();
  for (i in data) { stack.push(data[i]); }

  var currentNode;
  while (currentNode = stack.pop()) {
    if (currentNode.values instanceof Array) {
      for(i in currentNode.values) {
        stack.push(currentNode.values[i]);
      }
    } else {
      generateLine("123", currentNode);
    }
  }
  */


    var level1 = data;
    for (var i in level1) {
    //console.log(level1[i].key);
    var level2 = level1[i].values;


    // generateParentLine(level1[i].key, level2);

    for (var j in level2) {
      //console.log(level1[i].key + " > " + level2[j].key);
      var level3 = level2[j].values;


      for (var k in level3) {
        //var maxPsmPrice = level3[k].values['maxPsmPrice'];
        //console.log(level3[k].key + ": " + maxPsmPrice);
      }

      generateLine(level1[i].key + " > " + level2[j].key, level3);

    }

  }
}

  function generateLine(lineId, data) {
    //console.dir([data]);
    glayer2.append("svg:path")
	  .data([data])
	  .attr("d", line)
      .attr("class", "line")
      .attr("clip-path", "url(#clip)")
	  .attr("data-lineId", lineId)
	  .call(function (selection){
          selection.append("svg:title").text(lineId);
        })
	  .on("mouseover", function(d, i) {
	      generateBars(d, "bar2");
	      interactText.text(lineId);
	      
	      $("#displayTransactionPeriod").text("");
	      $("#displayPropertyType").text(d[0].values.rows[0]["Property Type"]);
	      $("#displayTypeOfSales").text(d[0].values.rows[0]["Type of Sale"]);
	      $("#displayAvgPrice").text("");
          $("#displayTotalUnits").text("");
	    })
	  .on("mouseout", function(d, i) {
	      var el = d3.select(this);
	      if (!el.classed("lselected")) {
	        svg.selectAll("rect.bar2").remove();
	      }
	      interactText.text("");
	    })
	  .on("click", function(d, i) {
        var evt = d3.event;
        var el = d3.select(this);
        //console.dir(evt);
        //console.dir(d);
        
        // alert(el.attr("data-lineId"));

        svg.selectAll("path.line.lselected").classed("lselected", false);
        el.classed("lselected", true);

        // Redraw bar charts that represents this selected line.
        //redrawBars(d, "bar");
        redrawBars2(d);
        
        var maxY = d3.max(data, function(d) { return d.values.maxPsmPrice});
        var currentYDomain = y.domain();
        var currentMaxY = currentYDomain[1];
        if(maxY < currentMaxY*(3/4) || maxY > currentMaxY) {
          if(maxY < 15000) { maxY = 15000 };
          y.domain([0, maxY*1.1]);
          svg.selectAll(".y.axis").transition().delay(1000).duration(1000).call(yAxis);
          svg.selectAll("path.line").transition().delay(1000).duration(1000).attr("d", line);
        }

    });
  }


  function generateParentLine(lineId, obj) {
    line.y(function(d) {
		var maxPsmPrice = d3.max(d.values, function(d) { return d['maxPsmPrice']; } );
		//alert(d.values[0].['maxPsmPrice']);
		return y(maxPsmPrice);
	//	console.dir(d);
	});

    glayer2.append("svg:path")
	  .data([obj])
	  .attr("d", line)
      .attr("class", "line")
      .attr("clip-path", "url(#clip)")
	  .attr("data-lineId", lineId)
	  .on("click", function(d, i) {
	    var evt = d3.event;
		var el = d3.select(this);

		alert(el.attr("data-lineId"));
    //highlightBreadcrumb(el.attr("data-lineId"));
		//console.dir(evt);
		//console.dir(d);
	  });
  }

function highlightBreadcrumb(lineId) {
  $(".colKeysWindow > div").style("font-color", "white");
  var arrColKeys = lineId.split(" > ");
  for (i in arrColKeys) {
    $("div [data-colKey=" + arrColKeys[i] + "]").style("font-color", "red");
  }
}
