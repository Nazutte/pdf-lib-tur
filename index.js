const crypto = require('crypto')
const fs = require('fs');
const path = require('path')
const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const cheerio = require('cheerio')

async function main(){
  const signature = require('./storage/signature');
  const decryptedSign = decrypt(signature, '1234');

  const filePath = '/8a9736e7-1cfe-4f8e-8b44-9173c9ed9fc7.pdf';
  const pdfByte = await modifyPdf(filePath, decryptedSign);
  writeFile(pdfByte, '/test.pdf')
}

main();

// FUNCTIONS
function decrypt(signature, password){
  const algorithm = 'aes-256-ctr';
  const key = crypto.scryptSync(password, 'GfG', 32);
  const iv = Buffer.alloc(16, 0);

  signature = Buffer.from(signature, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  const decrypted = Buffer.concat([decipher.update(signature, password) , decipher.final()]);

  return decrypted.toString('utf8');
}

async function modifyPdf(fileName, signature) {
  const existingPdfBytes = readFile(fileName);
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const svgPaths = getSvgPath(signature);

  const pages = pdfDoc.getPages()

  // PREPARED
  pages.forEach(page => {
    putSign(
      page,
      { x: 40, y: 40, signPos: -10 },
      helveticaFont,
      'PREPARED',
      'admin',
      '2023-07-06',
      svgPaths,
    );
  });

  // CHECKED
  pages.forEach(page => {
    putSign(
      page,
      { x: 370, y: 40, signPos: 320 },
      helveticaFont,
      'CHECKED',
      'admin',
      '2023-07-06',
      svgPaths,
    );
  });

  // APPROVED
  pages.forEach(page => {
    putSign(
      page,
      { x: 700, y: 40, signPos: 650 },
      helveticaFont,
      'APPROVED',
      'admin',
      '2023-07-06',
      svgPaths,
    );
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function putSign(page, coordinates, font, state, username, date, svgPaths){
  const fontSize = 6;
  let { x, y, signPos } = coordinates;

  page.moveTo(100, page.getHeight() - 5)

  page.drawText(`${state} BY:`, {
    x,
    y,
    size: fontSize,
    font,
  })

  y -= 15;
  page.drawText(`Name: ${username}`, {
    x,
    y,
    size: fontSize,
    font,
  })

  y -= 10;
  page.drawText(`Date: ${date}`, {
    x,
    y,
    size: fontSize,
    font,
  })
  
  page.moveDown(546);
  page.moveRight(signPos);
  svgPaths.forEach(svgPath => {
    page.drawSvgPath(svgPath, { scale: 0.15 })
  });
}

function getSvgPath(signature){
  let $ = cheerio.load(signature, { xmlMode: true });
  const pathStringsArray = [];

  const pathSet = $("path");
  pathSet.each(function () {
    const d = $(this).attr("d");
    pathStringsArray.push(d);
  });

  return pathStringsArray;
}

function readFile(fileName){
  try { 
    return fs.readFileSync(path.join(__dirname, '/storage', fileName))
  } catch(err) { console.error(err) }
}

function writeFile(arrayBuffer, fileName){
  const buffer = Buffer.from(arrayBuffer);
  try {
    fs.writeFileSync(path.join(__dirname, '/storage', fileName), buffer);
  } catch(err) { console.error(err) }
}