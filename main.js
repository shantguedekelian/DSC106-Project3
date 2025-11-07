// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
// import * as topojson from "https://cdn.jsdelivr.net/npm/topojson@3/+esm";

// const svg = d3.select("svg");
// const width = parseInt(svg.style("width"));
// const height = parseInt(svg.style("height"));

// // US-only projection
// const projection = d3.geoAlbersUsa()
//   .translate([width / 2, height / 2])
//   .scale(1000);

// const path = d3.geoPath().projection(projection);

// // Load US states
// d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(usData => {
//   const states = topojson.feature(usData, usData.objects.states);

//   svg.selectAll("path")
//     .data(states.features)
//     .enter()
//     .append("path")
//     .attr("d", path)
//     .attr("fill", "#eee")
//     .attr("stroke", "#999");

//   // Load fire data
//   d3.csv("SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_7d.csv").then(data => {
//     data.forEach(d => {
//       d.latitude = +d.latitude;
//       d.longitude = +d.longitude;
//     });

//     // Keep only points that project onto the map
//     const projectedData = data.filter(d => projection([d.longitude, d.latitude]));

//     // Draw circles (fixed small radius)
//     svg.selectAll("circle")
//       .data(projectedData)
//       .enter()
//       .append("circle")
//       .attr("cx", d => projection([d.longitude, d.latitude])[0])
//       .attr("cy", d => projection([d.longitude, d.latitude])[1])
//       .attr("r", 3)
//       .attr("fill", "orange")
//       .attr("opacity", 0.6)
//       .append("title")
//       .text(d => `FRP: ${d.frp}, Brightness: ${d.bright_ti4}`);
//   });
// });

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson@3/+esm";

const svg = d3.select("svg");
const width = 900;
const height = 500;

// Load US states TopoJSON
d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(usData => {
  const states = topojson.feature(usData, usData.objects.states).features;

  // Load fire data
  d3.csv("SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_7d.csv").then(data => {
    data.forEach(d => {
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
    });

    // Assign state to each fire
    data.forEach(d => {
      const point = [d.longitude, d.latitude];
      for (let s of states) {
        if (d3.geoContains(s, point)) {
          d.state = s.properties.name || s.id; // you can use id if name unavailable
          break;
        }
      }
    });

    // Aggregate by state
    const firesByState = d3.rollups(
      data.filter(d => d.state),       // only include fires matched to a state
      v => v.length,                   // number of fires per state
      d => d.state
    ).map(([state, count]) => ({ state, count }))
     .sort((a,b) => b.count - a.count);

    // Create bar chart
    const margin = {top: 40, right: 20, bottom: 50, left: 60};
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .domain(firesByState.map(d => d.state))
      .range([0, chartWidth])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(firesByState, d => d.count)])
      .nice()
      .range([chartHeight, 0]);

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Bars
    g.selectAll(".bar")
      .data(firesByState)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.state))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => chartHeight - y(d.count))
      .attr("fill", "orange")
      .append("title")
      .text(d => `State: ${d.state}\nFires: ${d.count}`);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(y));

    // Chart title
    g.append("text")
      .attr("x", chartWidth/2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Number of Fires by State");
  });
});
