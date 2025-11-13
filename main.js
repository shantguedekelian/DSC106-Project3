import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import * as topojson from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

// Load US and world maps
const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");

// Convert TopoJSON → GeoJSON
const states = topojson.feature(us, us.objects.states);
const countries = topojson.feature(world, world.objects.countries);

const width = 1200;
const height = 800;

const svg = d3.select('#map-container')
  .attr('width', width)
  .attr('height', height);

// --- Tooltip ---
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("background", "rgba(0,0,0,0.7)")
  .style("color", "#fff")
  .style("padding", "4px 8px")
  .style("border-radius", "4px")
  .style("display", "none");

// --- Load fire data ---
async function loadFireData() {
  try {
    const fireData = await d3.csv('SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_7d.csv');
    fireData.forEach(d => {
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.frp = +d.frp;
      d.acq_time = +d.acq_time;
    });
    return fireData;
  } catch (error) {
    console.error('Error loading fire data:', error);
  }
}
const fireData = await loadFireData();

// --- Projection & Path ---
const projection = d3.geoMercator()
  .center([0, 38])
  .rotate([98, 0])
  .scale(1200)
  .translate([width / 2, height / 2 + 20]);
const path = d3.geoPath().projection(projection);

// --- Map container ---
const mapContainer = svg.append("g").attr("id", "mapContainer");

// Countries
mapContainer.append("g")
  .attr("class", "countries-layer")
  .selectAll("path")
  .data(countries.features)
  .join("path")
  .attr("d", path)
  .attr("stroke", "#FFFFFF")
  .attr("fill", "#ccc");

// States
mapContainer.append("g")
  .attr("class", "state-layer")
  .selectAll("path")
  .data(states.features)
  .join("path")
  .attr("d", path)
  .attr("stroke", "#FFFFFF")
  .attr("fill", "transparent")
  .attr("pointer-events", "visibleFill")
  .on("mouseenter", function(event, d) {
    d3.select(this).raise().classed("highlighted", true);
    tooltip.style("display", "block")
      .html(`<strong>${d.properties.name}</strong>`);
  })
  .on("mousemove", function(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY + 10) + "px");
  })
  .on("mouseleave", function() {
    d3.select(this).classed("highlighted", false);
    tooltip.style("display", "none");
  });

// Filter to continental US
const filteredData = fireData.filter(d => {
  const lat = d.latitude, lon = d.longitude;
  const projected = projection([lon, lat]);
  return projected && lat >= 26 && lat <= 49 && lon >= -125 && lon <= -66;
});

// --- FRP size scale ---
const frpExtent = d3.extent(filteredData, d => d.frp);
const sizeScale = d3.scaleSqrt().domain(frpExtent).range([3, 12]); // Bigger circles

// --- Fire points layer ---
const pointsLayer = mapContainer.append("g").attr("class", "points-layer");

// Tooltip helper
function bindTooltip(selection) {
  selection
    .on('mouseenter', function(event, d) {
      tooltip.style("display", "block")
        .html(`
          <strong>Fire Info</strong><br>
          Lat: ${d.latitude}<br>
          Lon: ${d.longitude}<br>
          Time: ${Math.floor(d.acq_time/100)}:${String(d.acq_time%100).padStart(2,'0')}<br>
          FRP: ${d.frp}
        `);
    })
    .on('mousemove', function(event) {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })
    .on('mouseleave', function() {
      tooltip.style("display", "none");
    });
}

// --- Time label on map ---
const timeLabel = svg.append("text")
  .attr("id", "time-label")
  .attr("x", width - 200)
  .attr("y", 50)
  .attr("font-size", 32)
  .attr("fill", "#333")
  .attr("font-weight", "bold")
  .text("All Hours");

// --- Update fires ---
function updateFires(hour = null) {
  const visibleData = fireData.filter(d => {
    if (hour === null) return true;
    return Math.floor(d.acq_time/100) === hour;
  }).filter(d => {
    const lat = d.latitude, lon = d.longitude;
    const projected = projection([lon, lat]);
    return projected && lat >= 26 && lat <= 49 && lon >= -125 && lon <= -66;
  });

  // Update circles
  const circles = pointsLayer.selectAll('circle')
    .data(visibleData, d => d.latitude + ',' + d.longitude);

  circles.enter()
    .append('circle')
    .attr('cx', d => projection([d.longitude, d.latitude])[0])
    .attr('cy', d => projection([d.longitude, d.latitude])[1])
    .attr('r', 0) // Animate size
    .attr('fill', 'orangered')
    .attr('opacity', 0.6)
    .call(bindTooltip)
    .transition().duration(150  )
    .attr('r', d => sizeScale(d.frp));

  circles.transition().duration(300)
    .attr('cx', d => projection([d.longitude, d.latitude])[0])
    .attr('cy', d => projection([d.longitude, d.latitude])[1])
    .attr('r', d => sizeScale(d.frp));

  circles.exit().transition().duration(300).attr('r',0).remove();

  // Update time label
  timeLabel.text(hour === null ? "All Hours" : `Hour: ${hour}`);
}

// --- Slider ---
const slider = d3.select('#time-slider');
slider.on('input', function() {
  const hour = +this.value;
  updateFires(hour);
});

// Show all button
d3.select('#show-all').on('click', () => {
  updateFires(null);
  slider.property('value', 0);
});

// --- Zoom ---
const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => mapContainer.attr("transform", event.transform));
svg.call(zoom);

// --- Animation ---
let animationInterval = null;
d3.select('#play-btn').on('click', () => {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
    d3.select('#play-btn').text('Play');
  } else {
    let hour = +slider.property('value');
    d3.select('#play-btn').text('Pause');
    animationInterval = setInterval(() => {
      hour = (hour + 1) % 24;
      slider.property('value', hour);
      updateFires(hour);
    }, 500);
  }
});

// --- Initial render ---
updateFires();
