"use strict";

const path = require("path");
const isLocal = typeof process.pkg === "undefined";
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath);
const { NETWORK } = require(path.join(basePath, "constants/network.js"));
const fs = require("fs");
const { exit } = require("process");
const sha1 = require(path.join(basePath, "/node_modules/sha1"));
const buildDir = path.join(basePath, "/build");
const rawSvgDir = path.join(basePath, '/raw_svg_renamed');
const {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  regenerateLayers,
  layerConfigurations,
  rarityDelimiter,
  scoreDelimiter,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
  IMG_FORMAT
} = require(path.join(basePath, "/src/config.js"));
const pretty = require('pretty');

//Image format support - supported values "png", "svg"
const PNG_FORMAT = "png";
const SVG_FORMAT = "svg";

const layersDir = (IMG_FORMAT == PNG_FORMAT ) ? path.join(basePath, "/layers") : path.join(basePath, "/layer_svgs");
const { ImageEngine } = (IMG_FORMAT == PNG_FORMAT ) ?  require(path.join(basePath, "/src/pngengine.js")) : require(path.join(basePath, "/src/svgengine.js"));


//IMG_FORMAT Specific constants
const Image_uri =  (IMG_FORMAT == PNG_FORMAT ) ? "image.png" : "image.svg";
const Image_type= (IMG_FORMAT == PNG_FORMAT ) ? "image/png" : "image/svg";
const Image_extension = (IMG_FORMAT == PNG_FORMAT ) ? "png" : "svg";

console.log("Using Image format: " + IMG_FORMAT);

var metadataList = [];
var attributesList = [];
var dnaList = new Set();
const DNA_DELIMITER = "-";
const HashlipsGiffer = require(path.join(
  basePath,
  "/modules/HashlipsGiffer.js"
));

let hashlipsGiffer = null;

const buildSetup = () => {
  if (fs.existsSync(buildDir)) {
    fs.rmdirSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);
  fs.mkdirSync(path.join(buildDir, "/json"));
  fs.mkdirSync(path.join(buildDir, "/images"));
  if (gif.export) {
    fs.mkdirSync(path.join(buildDir, "/gifs"));
  }
};

const svgLayersSetup = () => {
  if (IMG_FORMAT === SVG_FORMAT) {
    if (!fs.existsSync(rawSvgDir)) {
      console.log('raw_svg not found.');
      process.exit();
    }
  
    if (fs.existsSync(layersDir)) {
      fs.rmdirSync(layersDir, { recursive: true});
    }
    fs.mkdirSync(layersDir);
    console.log(layerConfigurations);
  
    // only support one layer
    layerConfigurations[0].layersOrder.forEach(layer => {
      fs.mkdirSync(path.join(layersDir, layer.name));
    });

    const layersPath = layerConfigurations[0].layersOrder.map(layer => {
      return {
        name: layer.name,
        prefix: layer.prefix,
        path: path.join(layersDir, layer.name)
      }
    });
    regenSvgId(layersPath);
    // process.exit();
    console.log('layer_svgs setup complete.');
  }
}

const regenSvgId = (layersPath) => {
  fs.readdirSync(rawSvgDir).forEach(file => {
    console.log(file);
    let rawSvg = fs.readFileSync(`${rawSvgDir}/${file}`).toString('utf8');
    rawSvg = pretty(rawSvg);
    const ids = rawSvg.match(/id="(.)*"/g)?.map(id => id.split('"')[1]);
    const idsSet = [... new Set(ids)];
    let newSvg = rawSvg;
    for (const id of idsSet) {
      if (id !== 'pattern') {
        const name = `${file.split('.svg')[0].split('@')[0]}`;
        const idRe = new RegExp(`id="${id}"`, 'g');
        newSvg = newSvg.replace(idRe, `id="${name}_${id}"`);
        const urlRe = new RegExp(`"url\\(#${id}\\)"`, 'g');
        newSvg = newSvg.replace(urlRe, `"url(#${name}_${id})"`);
        const hrefRe = new RegExp(`href="#${id}"`, 'g');
        newSvg = newSvg.replace(hrefRe, `href="#${name}_${id}"`);
      }
    }
    // write to right layer
    const prefixName = file.split('_')[0];
    const layer = layersPath.find(layer => layer.name === prefixName || layer.prefix === prefixName);
    if (layer) {
      fs.writeFileSync(`${layer.path}/${file}`, newSvg, 'utf8');
    }
  })
}


const getRarityWeight = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = Number(
    nameWithoutExtension.split(rarityDelimiter).pop()
  );
  if (isNaN(nameWithoutWeight)) {
    const score = nameWithoutExtension.split(scoreDelimiter);
    nameWithoutWeight = Number(score[0].split(rarityDelimiter).pop());
    if (isNaN(nameWithoutWeight)) {
      nameWithoutWeight = 1;
    }
  }
  return nameWithoutWeight;
};

const getScore = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = Number(
    nameWithoutExtension.split(scoreDelimiter).pop()
  );
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 10;
  }
  return nameWithoutWeight;
};

const cleanDna = (_str) => {
  const withoutOptions = removeQueryStrings(_str)
  var dna = Number(withoutOptions.split(":").shift());
  return dna;
};

const cleanName = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift();
  return nameWithoutWeight;
};

const getElements = (path) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      const name = cleanName(i);
      return {
        id: index,
        name: name.substring(name.indexOf('@') + 1),
        filename: i,
        path: `${path}${i}`,
        weight: getRarityWeight(i),
        score: getScore(i),
      };
    });
};

const layersSetup = (layersOrder) => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    name:
      layerObj.options?.["displayName"] != undefined
        ? layerObj.options?.["displayName"]
        : layerObj.name,
    blend:
      layerObj.options?.["blend"] != undefined
        ? layerObj.options?.["blend"]
        : "source-over",
    opacity:
      layerObj.options?.["opacity"] != undefined
        ? layerObj.options?.["opacity"]
        : 1,
    bypassDNA:
      layerObj.options?.["bypassDNA"] !== undefined
        ? layerObj.options?.["bypassDNA"]
        : false,
    bound:
      layerObj.options?.["bound"] !== undefined
      ? layerObj.options?.["bound"]
      : false,
    bindTo:
      layerObj.options?.["bindTo"] !== undefined
      ? layerObj.options?.["bindTo"]
      : "",
    level:
      layerObj.options?.["level"] !== undefined
      ? layerObj.options?.["level"]
      : undefined
  }));
  return layers;
};

const saveImage = (_editionCount) => {
  fs.writeFileSync(
    `${buildDir}/images/${_editionCount}.${Image_extension}`,
    ImageEngine.getImageBuffer()
  );
};

const addMetadata = (_dna, _edition) => {
  let dateTime = Date.now();
  let tempMetadata = {
    name: `${namePrefix} #${_edition}`,
    description: description,
    image: `${baseUri}/${_edition}.png`,
    dna: sha1(_dna),
    edition: _edition,
    date: dateTime,
    ...extraMetadata,
    attributes: attributesList,
    compiler: "HashLips Art Engine",
  };
  if (network == NETWORK.sol) {
    tempMetadata = {
      //Added metadata for solana
      name: tempMetadata.name,
      symbol: solanaMetadata.symbol,
      description: tempMetadata.description,
      //Added metadata for solana
      seller_fee_basis_points: solanaMetadata.seller_fee_basis_points,
      image: Image_uri,
      //Added metadata for solana
      external_url: solanaMetadata.external_url,
      edition: _edition,
      ...extraMetadata,
      attributes: tempMetadata.attributes,
      properties: {
        files: [
          {
            uri: Image_uri,
            type: Image_type,
          },
        ],
        category: "image",
        creators: solanaMetadata.creators,
      },
    };
  }
  metadataList.push(tempMetadata);
  attributesList = [];
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
};

const loadLayerImg = async (_layer) => {
  return new Promise(async (resolve) => {
    const image = await ImageEngine.loadImage(_layer);
    resolve({ layer: _layer, loadedImage: image });
  });
};

const drawElement = (_renderObject, _index, _layersLen) => {
  ImageEngine.drawElement(_renderObject, _index, _layersLen);
  addAttributes(_renderObject);
};

const constructLayerToDna = (_dna = "", _layers = []) => {
  let mappedDnaToLayers = _layers.map((layer, index) => {
    let selectedElement = layer.elements.find(
      (e) => e.id == cleanDna(_dna.split(DNA_DELIMITER)[index])
    );
    return {
      name: layer.name,
      blend: layer.blend,
      opacity: layer.opacity,
      selectedElement: selectedElement,
      bound: layer.bound,
      bindTo: layer.bindTo,
      level: layer.lebel
    };
  });
  return mappedDnaToLayers;
};

/**
 * In some cases a DNA string may contain optional query parameters for options
 * such as bypassing the DNA isUnique check, this function filters out those
 * items without modifying the stored DNA.
 *
 * @param {String} _dna New DNA string
 * @returns new DNA string with any items that should be filtered, removed.
 */
const filterDNAOptions = (_dna) => {
  const dnaItems = _dna.split(DNA_DELIMITER)
  const filteredDNA = dnaItems.filter(element => {
    const query = /(\?.*$)/;
    const querystring = query.exec(element);
    if (!querystring) {
      return true
    }
    const options = querystring[1].split("&").reduce((r, setting) => {
      const keyPairs = setting.split("=");
      return { ...r, [keyPairs[0]]: keyPairs[1] };
    }, []);

    return options.bypassDNA
  })

  return filteredDNA.join(DNA_DELIMITER)
}

/**
 * Cleaning function for DNA strings. When DNA strings include an option, it
 * is added to the filename with a ?setting=value query string. It needs to be
 * removed to properly access the file name before Drawing.
 *
 * @param {String} _dna The entire newDNA string
 * @returns Cleaned DNA string without querystring parameters.
 */
const removeQueryStrings = (_dna) => {
  const query = /(\?.*$)/;
  return _dna.replace(query, '')
}

const levelCount = [0, 0, 0, 0, 0];

const isDnaUnique = (_DnaList = new Set(), _dna = "") => {
  const _filteredDNA = filterDNAOptions(_dna);
  return !_DnaList.has(_filteredDNA);
};

const createDna = (_layers) => {
  let randNum = [];
  let bound = {};
  _layers.score = 0;
  _layers.forEach((layer) => {
    var totalWeight = 0;
    layer.elements.forEach((element) => {
      totalWeight += element.weight;
    });
    if (layer.bindTo !== "") {
      // console.log(`this layer bound to ${layer.bindTo}`);
      
      return randNum.push(
        `${layer.elements[bound[layer.bindTo].boundIndex].id}:` +
        `${layer.elements[bound[layer.bindTo].boundIndex].filename}${layer.bypassDNA? '?bypassDNA=true' : ''}`
      );
    }
    if (layer.level !== undefined) {
      console.log(_layers.score);
      if (_layers.score <= layer.level[0]) {
        levelCount[0]++;
        return randNum.push(
          `${0}:` +
          `rarity_common.svg${layer.bypassDNA? '?bypassDNA=true' : ''}`
        );
      }
      if (_layers.score <= layer.level[1]) {
        levelCount[1]++;
        return randNum.push(
          `${3}:` +
          `rarity_limited.svg${layer.bypassDNA? '?bypassDNA=true' : ''}`
        );
      }
      if (_layers.score <= layer.level[2]) {
        levelCount[2]++;
        return randNum.push(
          `${4}:` +
          `rarity_rare.svg${layer.bypassDNA? '?bypassDNA=true' : ''}`
        );
      }
      if (_layers.score <= layer.level[3]) {
        levelCount[3]++;
        return randNum.push(
          `${1}:` +
          `rarity_epic.svg${layer.bypassDNA? '?bypassDNA=true' : ''}`
        );
      }
      if (_layers.score > layer.level[3]) {
        levelCount[4]++;
        return randNum.push(
          `${2}:` +
          `rarity_legendary.svg${layer.bypassDNA? '?bypassDNA=true' : ''}`
        );
      }
    }
    // number between 0 - totalWeight
    let random = Math.floor(Math.random() * totalWeight);

    for (var i = 0; i < layer.elements.length; i++) {
      // subtract the current weight from the random weight until we reach a sub zero value.
      random -= layer.elements[i].weight;
      if (random < 0) {
        if (layer.bound === true) {
          // console.log("this layer is a binding, record it");
          bound[layer.name] = {
              name: layer.elements[i].name,
              boundIndex: layer.elements[i].id,
          };
          // console.log(bound);
        }
        // console.log(layer.elements[i]);
        _layers.score += layer.elements[i].score;
        return randNum.push(
          `${layer.elements[i].id}:${layer.elements[i].filename}${layer.bypassDNA? '?bypassDNA=true' : ''}`
        );
      }
    }
  });
  return randNum.join(DNA_DELIMITER);
};

const writeMetaData = (_data) => {
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data);
};

const saveMetaDataSingleFile = (_editionCount) => {
  let metadata = metadataList.find((meta) => meta.edition == _editionCount);
  debugLogs
    ? console.log(
        `Writing metadata for ${_editionCount}: ${JSON.stringify(metadata)}`
      )
    : null;
  fs.writeFileSync(
    `${buildDir}/json/${_editionCount}.json`,
    JSON.stringify(metadata, null, 2)
  );
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

const startCreating = async () => {
  let layerConfigIndex = 0;
  let editionCount = 1;
  let failedCount = 0;
  let abstractedIndexes = [];
  for (
    let i = network == NETWORK.sol ? 0 : 1;
    i <= layerConfigurations[layerConfigurations.length - 1].growEditionSizeTo;
    i++
  ) {
    abstractedIndexes.push(i);
  }
  if (shuffleLayerConfigurations) {
    abstractedIndexes = shuffle(abstractedIndexes);
  }
  debugLogs
    ? console.log("Editions left to create: ", abstractedIndexes)
    : null;
  while (layerConfigIndex < layerConfigurations.length) {
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder
    );
    while (
      editionCount <= layerConfigurations[layerConfigIndex].growEditionSizeTo
    ) {
      let newDna = createDna(layers);
      if (isDnaUnique(dnaList, newDna)) {
        let results = constructLayerToDna(newDna, layers);
        let loadedElements = [];

        results.forEach((layer) => {
          loadedElements.push(loadLayerImg(layer));
        });

        await Promise.all(loadedElements).then((renderObjectArray) => {
          debugLogs ? console.log("Clearing canvas") : null;
          ImageEngine.clearRect();
          if (gif.export) {
            hashlipsGiffer = new HashlipsGiffer(
              canvas,
              ctx,
              `${buildDir}/gifs/${abstractedIndexes[0]}.gif`,
              gif.repeat,
              gif.quality,
              gif.delay
            );
            hashlipsGiffer.start();
          }
          if (background.generate) {
            ImageEngine.drawBackground();
          }
          renderObjectArray.forEach((renderObject, index) => {
            drawElement(
              renderObject,
              index,
              layerConfigurations[layerConfigIndex].layersOrder.length
            );
            if (gif.export) {
              hashlipsGiffer.add();
            }
          });
          if (gif.export) {
            hashlipsGiffer.stop();
          }
          debugLogs
            ? console.log("Editions left to create: ", abstractedIndexes)
            : null;
          saveImage(abstractedIndexes[0]);
          addMetadata(newDna, abstractedIndexes[0]);
          saveMetaDataSingleFile(abstractedIndexes[0]);
          console.log(
            `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(
              newDna
            )}`
          );
        });
        dnaList.add(filterDNAOptions(newDna));
        editionCount++;
        abstractedIndexes.shift();
      } else {
        console.log("DNA exists!");
        failedCount++;
        if (failedCount >= uniqueDnaTorrance) {
          console.log(
            `You need more layers or elements to grow your edition to ${layerConfigurations[layerConfigIndex].growEditionSizeTo} artworks!`
          );
          process.exit();
        }
      }
    }
    layerConfigIndex++;
  }
  writeMetaData(JSON.stringify(metadataList, null, 2));
  console.log(levelCount);
};

module.exports = { startCreating, buildSetup, getElements, svgLayersSetup };