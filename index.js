const http = require("http");
const express = require('express');
const CryptoJS = require('crypto-js');

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const server = http.createServer(app);

const port = 6667;
const imagesDir = path.join(__dirname, "uploads/coupon"); // Tempat untuk menyimpan gambar

// CORS configuration to allow only api.kedaimaster.com
const corsOptions = {
  origin: 'https://dev.api.kedaimaster.com', // Allow only this origin
  methods: ['GET', 'POST', 'DELETE'], // Allow only these methods (CRUD operations)
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers if any
};

app.use(cors(corsOptions)); // Enable CORS with the defined options


app.get("/coupon", async (req, res) => {
  let couponCode = req.query.c;
  if (!couponCode) {
    return res.status(400).send("Coupon code is required");
  }

  try {
    // Decode the URL-encoded coupon code
    console.log("hoho"+couponCode)
    let decodedCouponCode = couponCode;
    decodedCouponCode = decodedCouponCode.replace('LDNWAlASJDNdaw','+').replace('XCLZBKlaWDJ','/').replace('LDSsadANJlas','=');

    console.log("Decoded coupon ccode:", decodedCouponCode);

    // Your AES-256 key (ensure this is kept secret and secure!)
    const secretKey = 'xixixi666'; // 32 characters for AES-256

    // Decrypt the coupon code
    const decryptedBytes = CryptoJS.AES.decrypt(decodedCouponCode, secretKey);
    const decryptedCode = decryptedBytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedCode) {
      console.log('error')
      return res.status(400).send("Invalid coupon code");
    }

    console.log("Decrypted Coupon Code:", decryptedCode);

    // URL untuk gambar OG Image
    const ogImageUrl = `https://dev.coupon.kedaimaster.com/coup/thumb?c=${couponCode}`;
    const redirectTo = `https://dev.kedaimaster.com/?modal=claim-coupon&c=${encodeURIComponent(couponCode)}`;

    // Render HTML yang berbeda sesuai dengan couponCode
    res.send(`
      <html>
        <head>
          <title>Kupon - ${decryptedCode}</title>
          <!-- OG Meta Tags -->
          <meta property="og:title" content="Kupon - ${decryptedCode}" />
          <meta property="og:description" content="Jangan ragukan pelanggan, klaim untuk berlangganan dan nikmati fitur spesial!" />
          <meta property="og:image" content="${ogImageUrl}" />
          <meta property="og:url" content="https://dev.coupon.kedaimaster.com/coup/thumb?c=${couponCode}" />
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
  } catch (error) {
    console.error("Error during coupon code decryption:", error);
    res.status(500).send("An error occurred while processing the coupon code");
  }
});

// Start the Express server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});


// Endpoint to serve the thumbnail for a coupon image
app.get("/coup/thumb", async (req, res) => {
  let couponCode = req.query.c;
  couponCode = decodeURIComponent(couponCode)
  console.log(couponCode)
  couponCode = couponCode.replace('LDNWAlASJDNdaw','+').replace('XCLZBKlaWDJ','/').replace('LDSsadANJlas','=');
  console.log("hehe"+couponCode)
  if (!couponCode) {
    return res.status(400).send('Coupon code is required');
  }

  console.log("Received coupon codee:", couponCode);

  // Decode the URL-encoded coupon code
  console.log("Decoded coupon codee:", couponCode);

  // AES decryption key (ensure this is kept secret and secure!)
  const secretKey = 'xixixi666'; // 32 characters for AES-256

  try {
    // Decrypt the coupon code
    const decryptedBytes = CryptoJS.AES.decrypt(couponCode, secretKey);
    const decryptedCode = decryptedBytes.toString(CryptoJS.enc.Utf8);

    console.log("Decrypted coupon codee:", decryptedCode);

    if (!decryptedCode) {
      return res.status(400).send('Invalid or corrupted coupon code');
    }

    // Define image directory and paths
    const imagesDir = path.join(__dirname, 'uploads/coupon');
    const imagePath = path.join(imagesDir, `${decryptedCode}.png`);
    const defaultImagePath = path.join(imagesDir, '404coupon.png'); // Default image path
    console.log(imagePath)
    // Check if the coupon image exists
    if (!fs.existsSync(imagePath)) {
      console.log('Coupon image not found, serving default 404coupon.png...');
      
      // If 404 image is not found, return a 404 error
      if (!fs.existsSync(defaultImagePath)) {
        return res.status(404).send('404coupon.png not found.');
      }

      // Serve the default 404coupon.png image
      return res.sendFile(defaultImagePath);
    }

    // Serve the coupon image if it exists
    return res.sendFile(imagePath);

  } catch (error) {
    console.error("Error during coupon code decryption:", error);
    return res.status(500).send("An error occurred while processing the coupon code.");
  }
});

const formatExpirationDate = (dateString) => {
  const date = new Date(dateString);

  // Options for Indonesian date format
  const options = {
    weekday: 'long', // 'Monday'
    year: 'numeric', // '2025'
    month: 'long', // 'Januari'
    day: 'numeric' // '11'
  };

  // Format the date to Indonesian locale (ID)
  return date.toLocaleDateString('id-ID', options);
};

// Function to calculate the difference in days between expiration and current date (adjusted to UTC)
const calculateDaysLeft = (expirationDate) => {
  const currentDate = new Date();
  const expiration = new Date(expirationDate);

  // Convert both dates to UTC
  const utcCurrentDate = new Date(currentDate.toISOString()); // Ensure it's in UTC
  const utcExpirationDate = new Date(expiration.toISOString()); // Ensure it's in UTC

  // Calculate the time difference in milliseconds
  const timeDifference = utcExpirationDate - utcCurrentDate;
  const daysLeft = Math.ceil(timeDifference / (1000 * 3600 * 24)); // Convert to days

  return daysLeft;
};

async function generateCouponImage(couponCode, discountType, discountValue, expirationDate, discountPeriods, imagePath) {

  const formattedValue = discountType == 'fixed' ? `Diskon Rp${discountValue}` : discountValue != 0 ? `Diskon ${discountValue}%` : 'kupon berlangganan';

  const period = discountValue === 0 ? `Masa berlangganan ${discountPeriods} minggu` : `Masa kupon ${discountPeriods} minggu`;

  const daysLeft = (expirationDate != 'undefined' && expirationDate != null) ? calculateDaysLeft(expirationDate) : null;

  const expiration = (expirationDate == 'undefined' || expirationDate == null) ? 'Tanpa kadaluarsa' :
    daysLeft <= 7
      ? `Berlaku hingga ${daysLeft} hari lagi`
      : `Berlaku hingga: ${formatExpirationDate(expirationDate)}`


  const canvas = createCanvas(385, 222); // Adjust canvas size as necessary
  const ctx = canvas.getContext('2d');

  // Load a background image (if applicable)
  const backgroundImage = await loadImage('./uploads/coupon/bg.png'); // Replace with the actual image path

  // Draw background image onto the canvas
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

  // Add text
  ctx.fillStyle = 'black'; // Set text color
  ctx.font = 'bold 14px Arial'; // Set font style and size
  ctx.fillText(formattedValue, 143, 85);
  ctx.font = '13px Arial';
  ctx.fillText(period, 143, 122);
  ctx.fillText(expiration, 143, 156);

  // Rotate and add text vertically
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = '#333';  // Text color
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(90, canvas.height / 2); // Move to the center of the left column
  ctx.rotate(Math.PI / 2);  // Rotate the canvas to make the text vertical
  ctx.fillText(couponCode, 0, 0); // Draw the text vertically

  // Save the coupon image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(imagePath, buffer);

  console.log(`Coupon design saved at: ${imagePath}`);
}

// Endpoint for generating coupon image
app.post("/coupon", async (req, res) => {
  const { couponCode, discountType, discountValue, expirationDate, discountPeriods } = req.query;
  console.log(req.query)
  const imagePath = path.join(imagesDir, `${couponCode}.png`);

  // Check if the image already exists
  if (!fs.existsSync(imagePath)) {
    console.log('Generating coupon image...');
    await generateCouponImage(couponCode != undefined ? couponCode : null, discountType != undefined ? discountType : null, discountValue != undefined ? discountValue : null, expirationDate != undefined ? expirationDate : null, discountPeriods != undefined ? discountPeriods : null, imagePath);
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
