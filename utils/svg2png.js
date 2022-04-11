const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const isLocal = typeof process.pkg === "undefined";
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath);
const buildDir = `${basePath}/build/images`;
const svgDir = `${basePath}/build/images_svg`;

const buildSetup = () => {
  if (fs.existsSync(svgDir)) {
    fs.rmdirSync(svgDir, { recursive: true });
  }
  fs.mkdirSync(svgDir);
};

async function convert() {
  fs.readdirSync(buildDir).forEach(async file =>  {
    const options = {
      options: {
        unlimited: true
      }
    }
    const info = await sharp(`${buildDir}/${file}`, options).resize(736*2, 1021*2).png().toFile(`${buildDir}/${file.split('.svg')[0]}.png`);
    console.log(info);
    const data = fs.readFileSync(`${buildDir}/${file}`);
    fs.writeFileSync(`${svgDir}/${file}`, data, 'utf8');
    fs.unlink(`${buildDir}/${file}`, err => {
      if (err) throw err;
    });
    
  });
}

buildSetup();

(async () => {
  await convert();
})();
