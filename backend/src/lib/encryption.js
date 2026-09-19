const crypto = require('crypto');

function getKey() {
  const secret = process.env.JWT_SECRET || 'fallback-key-for-dev-only';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text) {
  if (!text) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(String(text), 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${enc}`;
}

function decrypt(enc) {
  if (!enc || typeof enc !== 'string' || !enc.includes(':')) return null;
  try {
    const [ivHex, tagHex, dataHex] = enc.split(':');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let dec = decipher.update(dataHex, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return null;
  }
}

function maskKey(enc) {
  const dec = decrypt(enc);
  if (!dec) return null;
  if (dec.length <= 8) return '••••••••';
  return dec.slice(0, 4) + '••••' + dec.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };
