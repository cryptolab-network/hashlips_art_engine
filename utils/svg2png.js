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

const convert = async () => {
  fs.readdirSync(buildDir).forEach(file => {
    const options = {
      options: {
        unlimited: true
      }
    }
    sharp(`${buildDir}/${file}`, options).png().toFile(`${buildDir}/${file.split('.svg')[0]}.png`).then(info => {
      console.log(info);
    });
    const data = fs.readFileSync(`${buildDir}/${file}`);
    fs.writeFileSync(`${svgDir}/${file}`, data, 'utf8');
    fs.unlink(`${buildDir}/${file}`, err => {
      if (err) throw err;
    })
  });
}

buildSetup();

convert();