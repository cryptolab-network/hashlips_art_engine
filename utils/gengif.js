const fs = require('fs');
const path = require("path");
const isLocal = typeof process.pkg === "undefined";
const basePath = isLocal ? process.cwd() : path.dirname(process.execPath);
const {
  gif
} = require(path.join(basePath, "/src/config.js"));
const GIFEncoder = require('gif-encoder-2');
const { createCanvas, Image } = require('canvas');
const { createWriteStream, readdir } = require('fs');
const { promisify } = require('util');

const readdirAsync = promisify(readdir)


const imagesFolder = `${basePath}/build/images`;
const gifDir = `${basePath}/build/gifs`;

const buildSetup = () => {
  if (fs.existsSync(gifDir)) {
    fs.rmdirSync(gifDir, { recursive: true });
  }
  fs.mkdirSync(gifDir);
};

async function createGif(algorithm) {
  return new Promise(async resolve1 => {
    // read image directory
    const files = await readdirAsync(imagesFolder)
 
    // find the width and height of the image
    const [width, height] = await new Promise(resolve2 => {
      const image = new Image()
      image.onload = () => resolve2([image.width, image.height])
      image.src = path.join(imagesFolder, files[0])
    })
 
    // base GIF filepath on which algorithm is being used
    const dstPath = path.join(gifDir, `intermediate-${algorithm}.gif`)
    // create a write stream for GIF data
    const writeStream = createWriteStream(dstPath)
    // when stream closes GIF is created so resolve promise
    writeStream.on('close', () => {
      resolve1()
    })
 
    const encoder = new GIFEncoder(width, height, algorithm)
    // pipe encoder's read stream to our write stream
    encoder.createReadStream().pipe(writeStream)
    encoder.start()
    encoder.setRepeat(gif.repeat);
    encoder.setQuality(gif.quality);
    encoder.setDelay(gif.delay)
 
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
 
    // draw an image for each file and add frame to encoder
    for (const file of files) {
      await new Promise(resolve3 => {
        const image = new Image()
        image.onload = () => {
          ctx.drawImage(image, 0, 0)
          encoder.addFrame(ctx)
          resolve3()
        }
        image.src = path.join(imagesFolder, file)
      })
    }
  })
}

buildSetup();

createGif('neuquant')