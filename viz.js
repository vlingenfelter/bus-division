// VIZ.JS
// Processes data and makes the visual
// dependencies:
//  - d3 v4 (generates the chart)
//  - Textures.js (used to fill the pie chart)

// get the width/height of the browser window
var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

// initialize variables for mobile responsiveness
var margin, width, height, mobile;
// initialize variables used in BusDivision function
var distinctHalfhour, busCrowding, thisData;

// if statment for large screens vs small screens
// checks to see if this is being viewed on a laptop or on a tablet/phone
// moble: boolean where true means this webpage is being viewed on mobile
if (w > 1025) {
  w -= 40;
  // set the dimensions and margins of the graph
  margin = {
    top: 165,
    right: (w * 0.28),
    bottom: 20,
    left: (w * 0.28)
  }
  width = w - margin.left - margin.right;
  height = 900 - margin.top - margin.bottom;
  mobile = false;
} else {
  w -= 20;
  // set the dimensions and margins of the graph
  margin = {
    top: (h * 0.15),
    right: (w * 0.28),
    bottom: 50,
    left: 100
  }
  width = w - margin.left - margin.right;
  height = (h * 0.8) - margin.top - margin.bottom;
  mobile = true;
}


// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("id", "svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");

// append div for the tool tip
// tool tip is always on screen but is not always visible
// this div will hold the pie chart
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// append legend div
// always on screen but not always visible
// sits beneath the tool tip
var legend = d3.select("body").append("div")
  .attr("class", "tooltip")
  .attr("id", "legend")
  .style("opacity", 0);

// get the data for the pie chart
var sources = {};
d3.csv("sources.csv", function(data) {
  for (var i = 0; i < data.length; i++) {
    var key = data[i].route;
    var values = {
      hv: data[i].hv * 1,
      dv: data[i].dv * 1,
      dt: data[i].dt * 1,
      pf: data[i].pf * 1
    }
    sources[key] = values;
  }
})

// little helper function
// takes in an object and a value within that objects
// finds the key associated with that object
function getKeyByValue(object, value) {
  return Object.keys(object).find(function(key) {return object[key] === value});
}

//read data
d3.csv("buses.csv", function(data) {
  // dummy variable that I set up to check the data format
  thisData = data;

  // Get the different categories (bus routes) and count them
  // categories: array(String) -> name of each bus route
  var categories = Object.keys(data[0]);
  categories = categories.filter(function(item) {
    // remove "halfhour" because it is not a bus route
    return item !== "halfhour"
  });
  // n: int -> number of bus routes
  var n = categories.length

  // get each halfhour in the dataset
  // this is used later when reformatting the data
  distinctHalfhour = [...new Set(data.map(function(d) {return d.halfhour}))];

  // bus crowding is empty array that will be filled in
  busCrowding = [];

  // for each bus route
  // make an object in the array BusCrowding that contains
  // key: name of route
  // density: array of densities that will be used to make the path element heights
  for (var i = 0; i < n; i++) {
    key = categories[i];
    density = [];
    busCrowding.push({
      key: key,
      density: density
    })
  }

  // for each route
  // for each halfhour
  // add an array that contains [halfhour, crowding]
  for (var i = 0; i < busCrowding.length; i++) {
    for (var j = 0; j < distinctHalfhour.length; j++) {
      busCrowding[i].density.push([(distinctHalfhour[j] * 1), (data[j][busCrowding[i].key] * 1)])
    }
  }


  // make x scale
  // this is the scale for the times
  var x = d3.scaleLinear()
    .domain([3, 27])
    .range([0, width]);

  // add X axis to the SVG
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .attr("class", "x-axis")
    .style("font-size", 14)
    .call(d3.axisBottom(x).tickFormat(function(d, i) { // right now it's just showing position not time seg
      // make sure that it is parsing times of day correctly
      if (((i + 1) % 2) == 0) {
        if (parseInt(d) > 12 && parseInt(d) < 24) {
          return `${parseInt(d) - 12}p`;
        } else if (parseInt(d) > 24) {
          return `${parseInt(d) - 24}a`;
        } else if (parseInt(d) == 24) {
          return "12a";
        } else if (parseInt(d) == 12) {
          return "12p";
        } else {
          return `${d}a`;
        }
      }
    }));

  // Create a Y scale for densities
  var y = d3.scaleLinear()
    .domain([0, 200])
    .range([height, 0]);

  // Create the Y axis for names
  var yName = d3.scaleBand()
    .domain(categories)
    .range([0, height])
    .paddingInner(1)
  svg.append("g")
    .attr("class", "y-axis")
    .style("font-size", 14)
    .call(d3.axisLeft(yName));

  // make the y axis responsive
  // on mouseover:
  //    - highlights the corresponding svg path element via CSS classes
  //    - tool tip is populated with pie chart showing crowding by source
  //    - legend becomes visible
  //    - x axis moves up to be closer to the highlighted path element
  svg.selectAll(".y-axis")
    .selectAll("text")
    .on("mouseover", function(d, i) {
      // make figure out the class string that will be used to select path element
      var classKey = `.class-${d}`;
      // calculate the width and height of the of the tool tips
      // width will be 2/3 of the margin
      // height of pie chart will be same as width
      var littleWidth = (margin.right / 3) * 2;
      var littleHeight = littleWidth;
      // radius of the pie chart
      var radius = littleWidth / 2;
      var key = d;
      // generate title string
      var title = `<h3>Route ${key}</h3>`;
      // generate legend value object
      var legendVals = {
        hv: "Headway variability",
        dt: "Dropped Trips",
        dv: "Demand variability",
        pf: "Planned frequency"
      }

      // make every path element disappear
      d3.selectAll("path")
        .transition()
        .duration(500)
        .style("opacity", 0);
      // make the selected path element stay full opacity
      d3.selectAll(classKey)
        .transition()
        .duration(500)
        .style("opacity", 1);

      // make the tooltip appear
      div.transition()
        .duration(500)
        .style("opacity", 1);
      // give the tooltip the proper title
      div.html(title)
        .style("left", (margin.left + width + 10) + "px")
        .style("top", (d3.event.pageY - radius - 24) + "px");

      // bring in the data that will be used to generate the pie
      // this is coming from the crowding by sources data
      var pieData = Object.values(sources[key]);

      // make the variables for the textures that will fill the pie chart
      // t1: dropped trips
      // t2: headway variability
      // t3: demand variability
      // t4: planned frequency
      var t1 = textures.lines().thicker().stroke("white").background("black"),
        t2 = textures.circles().thicker().fill("white").stroke("white").background("black"),
        t3 = textures.lines().heavier().thinner().orientation("5/8").stroke("black").background("white"),
        t4 = textures.lines().thicker().orientation("7/8").stroke("black").background("white");

      // make the little SVG that will go in the tool tip
      var littleSVG = div.append("svg")
        .attr("width", littleWidth)
        .attr("height", littleHeight * 2)
        .append("g")
        .attr("transform",
          "translate(" + radius + "," + radius + ")");

      // call all textures
      littleSVG.call(t1);
      littleSVG.call(t2);
      littleSVG.call(t3);
      littleSVG.call(t4);

      // set up the circle for the pie chart
      var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

      // make sort the datas into the proper categories
      var pie = d3.pie()
        .sort(null)
        .value(function(d) {
          return d;
        });

      // function that makes the color scale
      // color(s, d) -> texture
      // where S is an object that contains key value pairs
      // and D is a value contained within S
      var color = function(s, d) {
        // get the key that corresponds to the given value
        var colorKey = getKeyByValue(s, d);
        // if statement: returns corresponding texture for each key
        // TO DO: change this from if statement to an object key pair operation
        if (colorKey == "dt") { // dropped trips
          return t1.url();
        } else if (colorKey == "hv") { // headway variability
          return t2.url();
        } else if (colorKey == "dv") { // demand variability
          return t3.url();
        } else if (colorKey == "pf") { // planned frequency
          return t4.url();
        }
      };

      // make group to append pie chart to
      // this will be the first layer of the pie chart
      // which has a thick black outline and texture fills for values
      var g = littleSVG.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc")
        .append("path")
        .attr("d", arc)
        .style("fill", function(d) {
          return color(sources[key], d.data);
        });

      // make second layer of pie chart
      // this will contain the white outline of the pie
      // white outline sits ontop of the first layer
      var g2 = littleSVG.selectAll(".arc-outline")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc-outline")
        .append("path")
        .attr("d", arc)
        .style("fill", "none");

      // create the legend for the pie chart
      var legend = littleSVG.selectAll('.legend')
        .data(Object.values(legendVals))
        .enter().append('g')
        .attr("class", "legend")
        .attr("transform", function(d, i) {
          if (mobile) {
            return "translate(-" + radius + "," + (radius + 10 + (i * 30)) + ")";
          } else {
            return "translate(-" + (radius / 2) + "," + (radius + 10 + (i * 30)) + ")"
          }
        });

      // add the little swatches of patterns
      legend.append('rect')
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d) {
          return color(legendVals, d)
        });

      // add the corresponding category titles
      legend.append('text')
        .attr("x", 30)
        .attr("y", 15)
        .text(function(d) {
          return d
        });

      // find the top of the svg in absolute terms (essentially, this needs work)
      var titleHeight = document.getElementById('title').offsetHeight;

      // move the x axis up to the highlighted element
      var xAxis = d3.selectAll(".x-axis")
        .transition()
        .duration(500)
        // take mouse position and corrected it by the top margin of the SVG
        // the height of the title of the page
        // and 28 px (the top margin of the title is 30px)
        .attr("transform", "translate(0," + (d3.event.pageY - margin.top - titleHeight - 28) + ")");
    })
    // mouseout function:
    //  - restores the x axis to bottom of the svg
    //  - makes the tooltip invisible
    //  - makes all path elements visible
    .on("mouseout", function(d, i) {
      // make all path elements visible
      d3.selectAll("path")
        .transition()
        .duration(500)
        .style("opacity", 1);

      // make tool tip invisible
      div.transition()
        .duration(500)
        .style("opacity", 0);

      // bring xAxis down to bottom of the SVG
      var xAxis = d3.selectAll(".x-axis")
        .transition()
        .duration(500)
        .attr("transform", "translate(0," + height + ")")
        .attr("class", "x-axis")
    });

  // add the path elements for each bus route
  // IMPORTANT NOTE:
  // path elements must be drawn with the data already in ORDER
  // meaning that the halfhours must go from least to greatest
  // otherwise the path elements will have visible bottoms and look ugly
  svg.selectAll("area")
    .data(busCrowding)
    .enter()
    .append("path")
    .attr("transform", function(d) {
      return ("translate(0," + (yName(d.key) - height) + ")")
    })
    .attr("class", function(d) {
      return "class-" + d.key
    })
    .datum(function(d) {
      return (d.density)
    })
    .attr("fill", "black")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .curve(d3.curveBasis)
      .x(function(d) {
        return x(d[0]);
      })
      .y(function(d) {
        return y(d[1]);
      })
    );

  svg.selectAll("area")
    .data(busCrowding)
    .enter()
    .append("path")
    .attr("transform", function(d) {
      return ("translate(0," + (yName(d.key) - height) + ")")
    })
    .attr("id", function(d) {
      return "class-" + d.key
    })
    .attr("class", "invisible")
    .datum(function(d) {
      return (d.density)
    })
    .attr("fill", "transparent")
    .attr("stroke", "transparent")
    .attr("stroke-width", 15)
    .attr("d", d3.line()
      .curve(d3.curveBasis)
      .x(function(d) {
        return x(d[0]);
      })
      .y(function(d) {
        return y(d[1]);
      })
    );

  d3.selectAll(".invisible")
    .on("mouseover", function(d) {
      // make all path elements invisible
      d3.selectAll("path")
        .transition()
        .duration(500)
        .style("opacity", 0);


      // get selectors
      var thisClass = d3.select(this).attr('id');
      var key = thisClass.split("-")[1];

      // get string for visible path element
      var selectorClass = "." + thisClass;

      // get the corresponding visible path element
      d3.selectAll(selectorClass)
        .transition()
        .duration(500)
        .style("opacity", 1);

      // calculate the width and height of the of the tool tips
      // width will be 2/3 of the margin
      // height of pie chart will be same as width
      var littleWidth = (margin.right / 3) * 2;
      var littleHeight = littleWidth;
      // radius of the pie chart
      var radius = littleWidth / 2;
      // generate title string
      var title = `<h3>Route ${key}</h3>`;
      // generate legend value object
      var legendVals = {
        hv: "Headway variability",
        dt: "Dropped Trips",
        dv: "Demand variability",
        pf: "Planned frequency"
      }

      // make the tooltip appear
      div.transition()
        .duration(500)
        .style("opacity", 1);
      // give the tooltip the proper title
      div.html(title)
        .style("left", (margin.left + width + 10) + "px")
        .style("top", (d3.event.pageY - radius - 24) + "px");

      // bring in the data that will be used to generate the pie
      // this is coming from the crowding by sources data
      var pieData = Object.values(sources[key]);

      // make the variables for the textures that will fill the pie chart
      // t1: dropped trips
      // t2: headway variability
      // t3: demand variability
      // t4: planned frequency
      var t1 = textures.lines().thicker().stroke("white").background("black"),
        t2 = textures.circles().thicker().fill("white").stroke("white").background("black"),
        t3 = textures.lines().heavier().thinner().orientation("5/8").stroke("black").background("white"),
        t4 = textures.lines().thicker().orientation("7/8").stroke("black").background("white");

      // make the little SVG that will go in the tool tip
      var littleSVG = div.append("svg")
        .attr("width", littleWidth)
        .attr("height", littleHeight * 2)
        .append("g")
        .attr("transform",
          "translate(" + radius + "," + radius + ")");

      // call all textures
      littleSVG.call(t1);
      littleSVG.call(t2);
      littleSVG.call(t3);
      littleSVG.call(t4);

      // set up the circle for the pie chart
      var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

      // make sort the datas into the proper categories
      var pie = d3.pie()
        .sort(null)
        .value(function(d) {
          return d;
        });

      // function that makes the color scale
      // color(s, d) -> texture
      // where S is an object that contains key value pairs
      // and D is a value contained within S
      var color = function(s, d) {
        // get the key that corresponds to the given value
        var colorKey = getKeyByValue(s, d);
        // if statement: returns corresponding texture for each key
        // TO DO: change this from if statement to an object key pair operation
        if (colorKey == "dt") { // dropped trips
          return t1.url();
        } else if (colorKey == "hv") { // headway variability
          return t2.url();
        } else if (colorKey == "dv") { // demand variability
          return t3.url();
        } else if (colorKey == "pf") { // planned frequency
          return t4.url();
        }
      };

      // make group to append pie chart to
      // this will be the first layer of the pie chart
      // which has a thick black outline and texture fills for values
      var g = littleSVG.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc")
        .append("path")
        .attr("d", arc)
        .style("fill", function(d) {
          return color(sources[key], d.data);
        });

      // make second layer of pie chart
      // this will contain the white outline of the pie
      // white outline sits ontop of the first layer
      var g2 = littleSVG.selectAll(".arc-outline")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc-outline")
        .append("path")
        .attr("d", arc)
        .style("fill", "none");

      // create the legend for the pie chart
      var legend = littleSVG.selectAll('.legend')
        .data(Object.values(legendVals))
        .enter().append('g')
        .attr("class", "legend")
        .attr("transform", function(d, i) {
          if (mobile) {
            return "translate(-" + radius + "," + (radius + 10 + (i * 30)) + ")";
          } else {
            return "translate(-" + (radius / 2) + "," + (radius + 10 + (i * 30)) + ")"
          }
        });

      // add the little swatches of patterns
      legend.append('rect')
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", function(d) {
          return color(legendVals, d)
        });

      // add the corresponding category titles
      legend.append('text')
        .attr("x", 30)
        .attr("y", 15)
        .text(function(d) {
          return d
        });

      var pathHeight = document.getElementsByClassName(thisClass);
      var bottom = pathHeight[0].getBoundingClientRect().bottom;
      var svgTop = document.getElementById("svg").getBoundingClientRect().top;
      var offset = bottom - svgTop;

      // move the x axis up to the highlighted element
      var xAxis = d3.selectAll(".x-axis")
        .transition()
        .duration(500)
        // take mouse position and corrected it by the top margin of the SVG
        // the height of the title of the page
        // and 28 px (the top margin of the title is 30px)
        .attr("transform", "translate(0," + (offset - margin.top) + ")");
    })
    .on("mouseout", function(d) {
      // return all paths to visible
      d3.selectAll("path")
        .transition()
        .duration(500)
        .style("opacity", 1);

      // make tool tip invisible
      div.transition()
        .duration(500)
        .style("opacity", 0);

      // bring xAxis down to bottom of the SVG
      var xAxis = d3.selectAll(".x-axis")
        .transition()
        .duration(500)
        .attr("transform", "translate(0," + height + ")")
        .attr("class", "x-axis")
    })


})
