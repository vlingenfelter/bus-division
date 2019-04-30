// set the dimensions and margins of the graph
var margin = {top: 165, right: 0, bottom: 20, left:30},
    width = 1000 - margin.left - margin.right,
    height = 1100 - margin.top - margin.bottom;


// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

//read data
d3.csv("buses.csv", function(data) {
  thisData = data;
  // Get the different categories and count them
  var categories = data.columns.slice(1)
  var n = categories.length

  // Add X axis
  var x = d3.scaleLinear()
    .domain([3, 27])
    .range([ 0, width ]);

  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Create a Y scale for densities
  var y = d3.scaleLinear()
    .domain([0, 200])
    .range([ height, 0]);

  // Create the Y axis for names
  var yName = d3.scaleBand()
    .domain(categories)
    .range([0, height])
    .paddingInner(1)
  svg.append("g")
    .call(d3.axisLeft(yName));


  const distinctHalfhour = [...new Set(data.map(x => x.halfhour))];

  busCrowding = [];
  for (var i=0; i < n; i++) {
    key = categories[i];
    density = [];
    busCrowding.push({key: key, density: density})
  }

  for (var i=0; i < busCrowding.length; i++) {
    for (var j=0; j < distinctHalfhour.length; j++) {
      busCrowding[i].density.push([(distinctHalfhour[j] * 1), (data[j][busCrowding[i].key] * 1)])
    }
  }

  // Add areas
  svg.selectAll("areas")
    .data(busCrowding)
    .enter()
    .append("path")
      .attr("transform", function(d){return("translate(0," + (yName(d.key)-height) +")" )})
      .datum(function(d){return(d.density)})
      .attr("fill", "black")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d",  d3.line()
          .curve(d3.curveBasis)
          .x(function(d) { return x(d[0]); })
          .y(function(d) { return y(d[1]); })
      )

})
