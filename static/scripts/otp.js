
document.addEventListener('DOMContentLoaded', () => {
  const secretKeyInput = document.getElementById('secretKey');
  const queryParams = new URLSearchParams(window.location.search);
  const secret = queryParams.get('secret');
  if (secret) {
    secretKeyInput.value = secret;
  }

  secretKeyInput.addEventListener('input', () => {
    const otpDisplay = document.getElementById('otpDisplay');
    otpDisplay.textContent = '';
  });

  document.getElementById('generateOtp').addEventListener('click', async () => {
    const secret = secretKeyInput.value.trim();
    if (secret) {
      const otp = await generateTOTP(secret);
      document.getElementById('otpDisplay').textContent = "验证码: " + otp;
    } else {
      document.getElementById('otpDisplay').textContent = "请输入有效的密钥。";
    }
  });

  document.getElementById('generateKey').addEventListener('click', () => {
    const randomKey = generateRandomBase32Key(16);
    secretKeyInput.value = randomKey;
  });
});

function base32ToUint8Array(base32) {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const bytes = [];

  for (let char of base32) {
    const value = base32Chars.indexOf(char.toUpperCase());
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, '0');
  }

  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  return new Uint8Array(bytes);
}

function generateRandomBase32Key(length) {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let key = '';
  for (let i = 0; i < length; i++) {
    key += base32Chars.charAt(Math.floor(Math.random() * base32Chars.length));
  }
  return key;
}

async function generateTOTP(secret) {
  const timeStep = 30;
  const epoch = Math.floor(Date.now() / 1000);
  const timeCounter = Math.floor(epoch / timeStep);
  const key = base32ToUint8Array(secret);
  const timeBuffer = new Uint8Array(8);
  let tempCounter = timeCounter;
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }
  const hmac = await generateHMAC(key, timeBuffer);
  const offset = (hmac[hmac.length - 1] & 0x0f);
  const binCode = (hmac[offset] & 0x7f) << 24 |
    (hmac[offset + 1] & 0xff) << 16 |
    (hmac[offset + 2] & 0xff) << 8 |
    (hmac[offset + 3] & 0xff);
  const otp = binCode % 1000000;
  return otp.toString().padStart(6, '0');
}

async function generateHMAC(key, timeBuffer) {
  const keyParams = { name: "HMAC", hash: "SHA-1" };
  const cryptoKey = await window.crypto.subtle.importKey("raw", key, keyParams, false, ["sign"]);
  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, timeBuffer);
  return new Uint8Array(signature);
}