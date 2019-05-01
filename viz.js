var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

var margin, width, height, mobile;

if (w > 1025) {
  w -= 40;
  // set the dimensions and margins of the graph
  margin = {top: 165, right: (w * 0.28) , bottom: 20, left:(w * 0.28)}
  width = w - margin.left - margin.right;
  height = 900 - margin.top - margin.bottom;
  mobile = false;
} else {
  w -= 20;
  // set the dimensions and margins of the graph
  margin = {top: (h * 0.15), right: (w * 0.28), bottom: 50, left:100 }
  width = w - margin.left - margin.right;
  height = (h * 0.8) - margin.top - margin.bottom;
  mobile = true;
}



// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

var legend = d3.select("body").append("div")
            .attr("class", "tooltip")
            .attr("id", "legend")
            .style("opacity", 0);


var sources  = {};
d3.csv("sources.csv", function(data) {
  for (var i=0; i<data.length; i++) {
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

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

//read data
d3.csv("buses.csv", function(data) {
  thisData = data;
  // Get the different categories and count them
  var categories = data.columns.slice(1)
  var n = categories.length

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


  // Add X axis
  var x = d3.scaleLinear()
    .domain([3, 27])
    .range([ 0, width]);

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
      })).on("mouseover", function(d, i) {
        console.log(i);
      });

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
    .attr("class", "y-axis")
    .style("font-size", 14)
    .call(d3.axisLeft(yName));

  svg.selectAll(".y-axis")
      .selectAll("text")
      .on("mouseover", function(d, i) {
          var classKey = `.class-${d}`;
          var littleWidth = (margin.right / 3) * 2;
          var littleHeight = littleWidth;
          var radius = littleWidth/2;
          var key = d;
          var title = `<h3>Route ${d}</h3>`;
          var legendVals = {
            hv: "Headway variability",
            dt: "Dropped Trips",
            dv: "Demand variability",
            pf: "Planned frequency"
          }

          d3.selectAll("path")
            .transition()
            .duration(500)
            .style("opacity", 0);
          d3.selectAll(classKey)
            .transition()
            .duration(500)
            .style("opacity", 1);

          div.transition()
             .duration(500)
             .style("opacity", 1);
          div.html(title)
             .style("left", (d3.event.pageX + width + 30) + "px")
             .style("top", (d3.event.pageY - radius - 24 ) + "px");

          var littleWidth = (margin.right / 3) * 2;
          var littleHeight = littleWidth;
          var radius = littleWidth/2;
          var pieData = Object.values(sources[key]);
          var t1 = textures.lines().thicker().stroke("white").background("black"),
              t2 = textures.circles().thicker().fill("white").stroke("white").background("black"),
              t3 = textures.lines().heavier().thinner().orientation("5/8").stroke("black").background("white"),
              t4 = textures.lines().thicker().orientation("7/8").stroke("black").background("white");

          var littleSVG = div.append("svg")
             .attr("width", littleWidth)
             .attr("height", littleHeight * 2)
          .append("g")
              .attr("transform",
                   "translate(" + radius + "," + radius + ")");

          littleSVG.call(t1);
          littleSVG.call(t2);
          littleSVG.call(t3);
          littleSVG.call(t4);

          var arc = d3.arc()
             .outerRadius(radius - 10)
             .innerRadius(0);

          var pie = d3.pie()
              .sort(null)
              .value(function(d) { return d; });

          var color = function(s, d) {
            var colorKey = getKeyByValue(s, d);
            if (colorKey == "dt") { // dropped trips
              return t1.url();
            } else if (colorKey == "hv") { // headway variability
              return t2.url();
            } else if (colorKey == "dv") { // demand variability
              return t3.url();
            } else if (colorKey == "pf"){ // planned frequency
              return t4.url();
            }
          };

          var g = littleSVG.selectAll(".arc")
                .data(pie(pieData))
                .enter().append("g")
                .attr("class", "arc")
                .append("path")
                .attr("d", arc)
                .style("fill", function(d) { return color(sources[key], d.data); });

          var g = littleSVG.selectAll(".arc-outline")
                      .data(pie(pieData))
                      .enter().append("g")
                      .attr("class", "arc-outline")
                      .append("path")
                      .attr("d", arc)
                      .style("fill", "none");

          var legend = littleSVG.selectAll('.legend')
                    .data(Object.values(legendVals))
                    .enter().append('g')
                    .attr("class", "legend")
                    .attr("transform", function (d, i) {
                      if (mobile) {
                        return "translate(-" + radius + "," + (radius + 10 + (i * 30)) + ")";
                      } else {
                        return "translate(-" + (radius / 2) + "," + (radius + 10 + (i * 30)) + ")"}
                      });
          legend.append('rect')
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 20)
                .attr("height", 20)
                .style("fill", function (d) {
                          return color(legendVals, d)
                      });

          legend.append('text')
                .attr("x", 30)
                .attr("y", 15)
                .text(function(d) { return d});

      })
      .on("mouseout", function(d, i) {
        d3.selectAll("path")
          .transition()
          .duration(500)
          .style("opacity", 1);

        div.transition()
          .duration(500)
          .style("opacity", 0);
      });

  // Add areas
  svg.selectAll("area")
    .data(busCrowding)
    .enter()
    .append("path")
      .attr("transform", function(d){return("translate(0," + (yName(d.key)-height) +")" )})
      .attr("class", function(d) {return "class-" + d.key})
      .datum(function(d){return(d.density)})
      .attr("fill", "black")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d",  d3.line()
          .curve(d3.curveBasis)
          .x(function(d) { return x(d[0]); })
          .y(function(d) { return y(d[1]); })
      );

})
