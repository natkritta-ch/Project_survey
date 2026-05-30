const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const filesToDownload = [
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_recognition_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const downloadFile = (fileName) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelsDir, fileName);
    if (fs.existsSync(dest)) {
      console.log(`File ${fileName} already exists.`);
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    https.get(baseUrl + fileName, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
};

(async () => {
  console.log('Downloading face-api.js models...');
  for (const f of filesToDownload) {
    try {
      console.log(`Downloading ${f}...`);
      await downloadFile(f);
      console.log(`Successfully downloaded ${f}`);
    } catch (e) {
      console.error(`Failed to download ${f}`, e);
    }
  }
  console.log('All downloads completed.');
})();
