const basePath = process.cwd();
const { startCreating, buildSetup, svgLayersSetup } = require(`${basePath}/src/main.js`);

(() => {
  svgLayersSetup();
  buildSetup();
  startCreating();
})();
