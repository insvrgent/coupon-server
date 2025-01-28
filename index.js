const http = require("http");
const express = require('express');

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const server = http.createServer(app);

const port = 6667;
const imagesDir = path.join(__dirname, "uploads/coupon"); // Tempat untuk menyimpan gambar

// CORS configuration to allow only dev.api.kedaimaster.com
const corsOptions = {
  origin: 'https://dev.api.kedaimaster.com', // Allow only this origin
  methods: ['GET', 'POST', 'DELETE'], // Allow only these methods (CRUD operations)
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers if any
};

app.use(cors(corsOptions)); // Enable CORS with the defined options

app.get("/coupon", async (req, res) => {
    const couponCode = req.query.couponCode;
    if (!couponCode) {
        return res.status(400).send("Coupon code is required");
    }

    // URL untuk gambar OG Image
    const ogImageUrl = `https://dev.coupon.kedaimaster.com/coup/thumb/${couponCode}`;
    const redirectTo = `https://dev.kedaimaster.com/?modal=claim-coupon&couponCode=${couponCode}`;

    // Render HTML yang berbeda sesuai dengan couponCode
    res.send(`
      <html>
        <head>
          <title>Kupon - ${couponCode}</title>
          <!-- OG Meta Tags -->
          <meta property="og:title" content="Kupon - ${couponCode}" />
          <meta property="og:description" content="Jangan ragukan pelanggan, klaim untuk berlangganan dan nikmati fitur spesial!" />
          <meta property="og:image" content="${ogImageUrl}" />
          <meta property="og:url" content="https://dev.coupon.kedaimaster.com/coup/thumb/?couponCode=${couponCode}" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:image" content="${ogImageUrl}" />
          <!-- Redirect Meta Tag -->
          <meta http-equiv="refresh" content="0;url=${redirectTo}" />
        </head>
        <body>
          <!-- Empty Body as per your request -->
        </body>
      </html>
    `);
});


// Endpoint to serve the thumbnail for a coupon image
app.get("/coup/thumb/:couponCode", async (req, res) => {
  const couponCode = req.params.couponCode;
  const imagePath = path.join(imagesDir, `${couponCode}.png`);
  const defaultImagePath = path.join(imagesDir, '404coupon.png'); // Default image path

  // Check if the coupon image exists
  if (!fs.existsSync(imagePath)) {
    console.log('Coupon image not found, serving default 404coupon.png...');

    // Check if the 404coupon.png exists
    if (!fs.existsSync(defaultImagePath)) {
      return res.status(404).send('404coupon.png not found.');
    }

    // Serve the default 404coupon.png image
    return res.sendFile(defaultImagePath);
  }

  // If the coupon image exists, serve it
  return res.sendFile(imagePath);
});

async function generateCouponImage(couponCode) {
  const width = 800;
  const height = 600;

  // Create a canvas with the specified width and height
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Set a background color for the image
  ctx.fillStyle = '#ffcc00'; // Yellow background
  ctx.fillRect(0, 0, width, height);

  // Set the font style
  ctx.fillStyle = '#000000'; // Black text color
  ctx.font = 'bold 48px Arial';

  // Write the coupon code on the image
  const text = `Kupon Kode: ${couponCode}`;
  ctx.fillText(text, 100, 150);

  // Add some description
  ctx.font = '24px Arial';
  ctx.fillText('Gunakan kode ini untuk diskon spesial!', 100, 250);

  // Define the image path
  const imagePath = path.join(imagesDir, `${couponCode}.png`);

  // Save the image to a file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(imagePath, buffer);

  console.log(`Coupon image saved at: ${imagePath}`);
}

// Endpoint for generating coupon image
app.post("/coupon", async (req, res) => {
  const couponCode = req.query.couponCode;
  const imagePath = path.join(imagesDir, `${couponCode}.png`);

  // Check if the image already exists
  if (!fs.existsSync(imagePath)) {
    console.log('Generating coupon image...');
    await generateCouponImage(couponCode);
  }

  // If the image exists, serve it
  return res.sendFile(imagePath);
});

// Endpoint untuk klaim kupon, yang akan menghapus gambar kupon terkait
app.delete('/coupon', (req, res) => {
    const couponCode = req.query.couponCode;
    const imagePath = path.join(imagesDir, `${couponCode}.png`);

    // Cek apakah gambar ada dan hapus jika ada
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath); // Hapus gambar
      return res.status(200).send('Kupon berhasil diklaim dan gambar dihapus');
    }

    return res.status(404).send('Kupon tidak ditemukan atau sudah dihapus');
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
