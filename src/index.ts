// MIT License- copyright not_a_seagull

import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as gm from 'gm';
import * as path from 'path';
import { promisify } from 'util';

const captions = require(path.join(process.cwd(), "captions.json"));
console.log(`captions are ${JSON.stringify(captions)}`);

const readdir = promisify(fs.readdir);

const one_char_width = 12;
const one_char_height = 38;

// random number
function genRandomNumber(min: number, max: number): number {
  const range = Math.random() * (max - min + 1);
  return Math.floor(range + min);
}

// generate an image
async function genImage(caption: string, filename: string): Promise<any> {
  return new Promise((resolve: any, reject: any) => {
    gm(filename).size((err: any, value: any) => {
      if (err) reject(err);
      
      let {width,height} = value;
      let widthRatio = 500/width;
      width = 500;
      height *= widthRatio;

      let line_width = width / one_char_width;
      let words = caption.split(' ');
      let true_caption = "";
      let current_line = [];
      let line_count = 1;
      while (words.length > 0) {
        let word = words[0];
        console.log(`word is ${word}`);
        current_line.push(word);
        let full_line = current_line.join(' ');    

        if (full_line.length > line_width || word.indexOf('\n') !== -1) {
          if (word.indexOf('\n') === -1) {
            current_line.pop();
            current_line.push("\n");
          } else { 
            words.splice(0, 1);
            current_line.push(' '); 
          }      
 
          true_caption += current_line.join(' ');
          current_line = [];
          line_count += 1;
        } else {
          words.splice(0, 1);
        }
      }

      true_caption += current_line.join(' ');
      console.log(`Determined that the caption is ${true_caption}`);

      try {
        gm(filename)
          .resize(width, height)
          .gravity("South")
          .extent(width, height + (one_char_height * line_count))
          .font("fonts/Ubuntu-L.ttf")
          .fontSize(24)
          .stroke("#000")
          .fill("#000")
          .drawText(10, 30, true_caption, "NorthWest")
          .write("result.png", (err: Error) => {
            if (err) reject(err);
            else resolve("result.png");
          });
      } catch (e) {
        reject(e);
      }
    });
  });
}

// process
async function createRandomMeme(): Promise<any> {
  // get a caption and image
  let caption = captions[genRandomNumber(0, captions.length - 1)];

  let dirs = await readdir("templates");
  let image = path.join("templates", dirs[genRandomNumber(0, dirs.length - 1)]);
  console.log(`Caption is ${caption}, image is ${image}`);

  const slashes = "\/\/";
  let outfile = await genImage(caption, image);
  let html = `<html><body><p>Caption: ${caption.split('\n').join('<br />')}</p>
              <p>Original Template: ${image}</p>
              <p>Result:</p>
              <img src="/${outfile}" /></body></html>`;
  return html;
}

const app = express();

app.use("/result.png", (req: express.Request, res: express.Response) => {
  console.log("Loading result.png...");
  res.type("application/octet-stream");
  res.send(fs.readFileSync("result.png"));
});

app.use("/", (req: express.Request, res: express.Response) => {
  createRandomMeme().then((r: any) => {
    console.log(r);
    res.send(r);
  }).catch((err: Error) => { console.error(`Error: ${err}`); });
});

const server = http.createServer(app);
server.listen(8888);

console.log("Automeme loaded");
