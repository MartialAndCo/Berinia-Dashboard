const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcBlack = 'C:/Users/marti/.gemini/antigravity/brain/87c594e1-deea-4ac5-8249-b1b2d6672709/.user_uploaded/media_1788609185518.png';
const srcWhite = 'C:/Users/marti/.gemini/antigravity/brain/87c594e1-deea-4ac5-8249-b1b2d6672709/.user_uploaded/media_1788609190968.png';

async function run() {
  // Ensure public directory exists
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }

  // 1. Copy raw logos
  fs.copyFileSync(srcBlack, 'public/logo-black.png');
  fs.copyFileSync(srcWhite, 'public/logo-white.png');
  console.log('Copied raw logos to public/');

  // 2. Generate icon-light.png (black logo, 32x32 and 192x192)
  await sharp(srcBlack).resize(32, 32).toFile('public/icon-light-32.png');
  await sharp(srcBlack).resize(192, 192).toFile('public/icon-light.png');

  // 3. Generate icon-dark.png (white logo, 32x32 and 192x192)
  await sharp(srcWhite).resize(32, 32).toFile('public/icon-dark-32.png');
  await sharp(srcWhite).resize(192, 192).toFile('public/icon-dark.png');

  // 4. Create an elegant branded badge icon (works in any tab theme):
  // Dark charcoal background #1a1918 with white logo centered with padding
  const logoWhiteResized = await sharp(srcWhite).resize(140, 140).toBuffer();
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 26, g: 25, b: 24, alpha: 1 } // #1a1918
    }
  })
  .composite([{ input: logoWhiteResized, gravity: 'center' }])
  .png()
  .toFile('public/apple-touch-icon.png');

  fs.copyFileSync('public/apple-touch-icon.png', 'src/app/apple-icon.png');

  // 5. Generate src/app/icon.png (32x32 badge)
  const logo32 = await sharp(srcWhite).resize(26, 26).toBuffer();
  const icon32Badge = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 26, g: 25, b: 24, alpha: 1 }
    }
  })
  .composite([{ input: logo32, gravity: 'center' }])
  .png()
  .toBuffer();

  fs.writeFileSync('public/icon.png', icon32Badge);
  fs.writeFileSync('src/app/icon.png', icon32Badge);

  // 6. Generate favicon.ico
  fs.writeFileSync('public/favicon.ico', icon32Badge);
  fs.writeFileSync('src/app/favicon.ico', icon32Badge);

  // 7. Generate SVG favicon with media query for light/dark mode
  const base64Black = fs.readFileSync(srcBlack).toString('base64');
  const base64White = fs.readFileSync(srcWhite).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <style>
    @media (prefers-color-scheme: dark) {
      .icon-light { display: none; }
      .icon-dark { display: block; }
    }
    @media (prefers-color-scheme: light) {
      .icon-light { display: block; }
      .icon-dark { display: none; }
    }
  </style>
  <image class="icon-light" href="data:image/png;base64,${base64Black}" width="500" height="500" />
  <image class="icon-dark" href="data:image/png;base64,${base64White}" width="500" height="500" />
</svg>`;
  fs.writeFileSync('public/icon.svg', svg);
  fs.writeFileSync('public/favicon.svg', svg);

  console.log('All icons generated successfully!');
}

run().catch(console.error);
