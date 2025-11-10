import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import * as topojson from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

// Load US map from the us-atlas package (TopoJSON format)
const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");

// Convert TopoJSON → GeoJSON so D3 can draw it
const states = topojson.feature(us, us.objects.states);

const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
const countries = topojson.feature(world, world.objects.countries);

const width = 1200;
const height = 800;
const margin = { top: 20, right: 20, bottom: 30, left: 40 };

const svg = d3.select('#map-container')
    .attr('width', width)
    .attr('height', height);

// Load and display the World
// d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(function(world) {
//     const countries = topojson.feature(world, world.objects.countries).features;

//     const projection = d3.geoMercator()
//         .scale(130)
//         .translate([400, 300]);

//     const path = d3.geoPath().projection(projection);

//     svg.selectAll('path')
//         .data(countries)
//         .enter().append('path')
//         .attr('d', path)
//         .attr('fill', '#ccc')
//         .attr('stroke', '#333');
// });

async function loadFireData() {
  try {
    const fireData = await d3.csv('SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_7d.csv');
    fireData.forEach(d => {
        d.latitude = +d.latitude;
        d.longitude = +d.longitude;
        d.frp = +d.frp;
    });
    return fireData;
  } catch (error) {
    console.error('Error loading fire data:', error);
  }
}

const fireData = await loadFireData();

const minLat = d3.min(fireData, d => d.latitude);
const maxLat = d3.max(fireData, d => d.latitude);
const minLon = d3.min(fireData, d => d.longitude);
const maxLon = d3.max(fireData, d => d.longitude);

const mapProjection = d3.geoMercator() // not geoAlbersUsa()
  .center([0, 38]) // roughly center of the lower 48
  .rotate([96, 0]) // rotate to center on US
  .scale(1000) // tweak this to fit your SVG
  .translate([width / 2, height / 2]);

const pointsProjection = d3.geoMercator() // not geoAlbersUsa()
  .center([0, 38]) // roughly center of the lower 48
  .rotate([96, 0]) // rotate to center on US
  .scale(1000) // tweak this to fit your SVG
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(mapProjection);

svg.append('g')
  .selectAll('path')
  .data(countries.features)
  .join('path')
  .attr('d', path)
  .attr('fill', '#eee')
  .attr('stroke', '#333');


const filteredFireData = fireData.filter(d => pointsProjection([d.longitude, d.latitude]));
const filteredData = fireData.filter(d => {
  const lat = +d.latitude;
  const lon = +d.longitude;
  const projected = mapProjection([lon, lat]);
  return projected && lat >= 26 && lat <= 49 && lon >= -125 && lon <= -66;
});

svg.selectAll('circle')
  .data(filteredData)
  .join('circle')
  .attr('cx', d => pointsProjection([d.longitude, d.latitude])[0])
  .attr('cy', d => pointsProjection([d.longitude, d.latitude])[1])
  .attr('r', 2)
  .attr('fill', 'red')
  .attr('opacity', 0.6);

// console.log('hi');

// const xScale = d3
//   .scaleLinear()
//   .domain([minLat, maxLat])
//   .range([margin.left, width - margin.right]);

// const yScale = d3
//   .scaleLinear()
//   .domain([minLon, maxLon])
//   .range([height - margin.bottom, margin.top]);

// svg
//   .selectAll('circle')
//   .data(fireData)
//   .join('circle')
//   .attr('cx', (d) => xScale(d.latitude))
//   .attr('cy', (d) => yScale(d.longitude))
//   .attr('r', 2);

  console.log('hi');