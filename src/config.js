const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const { NETWORK } = require(`${basePath}/constants/network.js`);

const network = NETWORK.eth;

const IMG_FORMAT = "svg";

// General metadata for Ethereum
const namePrefix = "Alcheneko";
const description = "Alcheneko Test NFT";
const baseUri = "https://ipfs.io/ipfs/QmYfi6Cyxy9K2igjrtCV89dNXw1vJaGkyKGgyHH5N63pLJ";

const solanaMetadata = {
  symbol: "YC",
  seller_fee_basis_points: 1000, // Define how much % you want from secondary market sales 1000 = 10%
  external_url: "https://www.hodlnft.net",
  creators: [
    {
      address: "7fXNuer5sbZtaTEPhtJ5g5gNtuyRoKkvxdjEjEnPN4mC",
      share: 100,
    },
  ],
};
// If you have selected Solana then the collection starts from 0 automatically

const regenerateLayers = true;

const layerConfigurations = [
  {
    growEditionSizeTo: 5000,
    layersOrder: [
      { name: "background",
        prefix: 'bg',
        options: {
          displayName: "Background",
        }
      },
      { 
        name: "cloak_back",
        options: {
          bound: true,
        },
        prefix: 'cloak'
      },
      { name: "shadow" },
      { 
        name: "right_hand",
        options: {
          bound: true,
        },
        prefix: 'rh'
      },
      { name: "spellbook" },
      { 
        name: "body",
        options: {
          bindTo: "right_hand",
          bypassDNA: true,
          displayName: "Body",
        }
      },
      { 
        name: "bandage",
        options: {
          displayName: 'Bandage'
        }
      },
      { name: "boots", prefix: 'shoes', options: {
        displayName: 'Boots',
      } },
      { name: "pants", options: {
        displayName: 'Pants',
      } },
      { name: "clothes", prefix: 'cloths', options: {
        displayName: 'Clothes',
      } },
      { name: "necklace", options: {
        displayName: 'Necklace',
      } },
      { 
        name: "cloak_front",
        options: {
          bindTo: "cloak_back",
          bypassDNA: true,
          displayName: "Cloak",
        },
        prefix: 'cloakNeck'
      },
      { name: "staff", options: {
        displayName: 'Staff',
      } },
      { name: "hats", prefix: 'hat', options: {
        displayName: 'Hat',
      } },
      { name: "fingers",
        options: {
          bindTo: "right_hand",
          bypassDNA: true,
        },
        prefix: 'lh'
      },
      { name: "rarity",
        options: {
          level: [
            310, 540, 650, 820
          ],
          bypassDNA: true,
          displayName: 'Rarity'
        }
      },
    ],
  },
];

const shuffleLayerConfigurations = false;

const debugLogs = true

const format = {
  width: 736,
  height: 1021,
  smoothing: false,
};

const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 500,
};

const text = {
  only: false,
  color: "#ffffff",
  size: 20,
  xGap: 40,
  yGap: 40,
  align: "left",
  baseline: "top",
  weight: "regular",
  family: "Courier",
  spacer: " => ",
};

const pixelFormat = {
  ratio: 2 / 128,
};

const background = {
  generate: false,
  brightness: "80%",
  static: false,
  default: "#000000",
};

const extraMetadata = {};

const rarityDelimiter = "#";

const scoreDelimiter = "%";

const itemNameDelimiter = "@";

const uniqueDnaTorrance = 10000;

const preview = {
  thumbPerRow: 5,
  thumbWidth: 50,
  imageRatio: format.height / format.width,
  imageName: "preview.png",
};

const preview_gif = {
  numberOfImages: 500,
  order: "ASC", // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 500,
  imageName: "preview.gif",
};

module.exports = {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  regenerateLayers,
  layerConfigurations,
  rarityDelimiter,
  scoreDelimiter,
  itemNameDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  pixelFormat,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
  preview_gif,
  IMG_FORMAT,
};
