// Script para generar iconos PNG desde SVG
// Ejecutar: node scripts/generate-icons.js
// Requiere: npm install sharp

const fs = require('fs');
const path = require('path');

// SVG base del icono
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#10b981"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="300" font-weight="bold" fill="white" text-anchor="middle">$</text>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const iconsDir = path.join(__dirname, '../public/icons');

    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: icon-${size}x${size}.png`);
    }

    // También generar apple-touch-icon
    await sharp(Buffer.from(svgContent))
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    console.log('Generated: apple-touch-icon.png');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    console.log('\nTo generate icons, install sharp: npm install sharp --save-dev');
    console.log('Then run: node scripts/generate-icons.js');
  }
}

generateIcons();
