const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const keysPath = path.join(__dirname, '..', '..', 'vapid-keys.json');

function getVapidKeys() {
  // If explicitly set in environment, use those
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  // Otherwise, load or generate from local file
  try {
    if (fs.existsSync(keysPath)) {
      const data = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      if (data.publicKey && data.privateKey) {
        return data;
      }
    }
  } catch (e) {
    console.error('Error reading VAPID keys file:', e);
  }

  // Generate new keys
  console.log('Generating new VAPID keys...');
  const keys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving VAPID keys:', e);
  }

  return keys;
}

module.exports = { getVapidKeys };
