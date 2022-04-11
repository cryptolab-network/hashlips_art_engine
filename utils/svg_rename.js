const fs = require('fs');

// add name, rarity score and chance to each picture
const svgDir = fs.readdirSync('./raw_svg');
if (!fs.existsSync("./raw_svg_renamed")) {
  fs.mkdirSync("./raw_svg_renamed");
}
const svgConfig = JSON.parse(fs.readFileSync('utils/svg_config.json'));
svgDir.forEach((f) => {
  const tokens = f.split('.');
  let name = svgConfig.name[tokens[0]];
  if (name === undefined) {
    name = tokens[0];
  }
  let score = svgConfig.score[tokens[0]];
  if (score === undefined) {
    score = 10;
  }
  let chance = svgConfig.chance[tokens[0]];
  if (chance === undefined) {
    chance = 10;
  }
  if (name.startsWith("rarity")) {
    fs.copyFileSync('./raw_svg/' + f, './raw_svg_renamed/' + tokens[0] + '.' + tokens[1]);
  } else {
    fs.copyFileSync('./raw_svg/' + f, './raw_svg_renamed/' + tokens[0] + '@' + name + '#' + chance + '%' + score + '.' + tokens[1]);
  }
});