import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = 'https://lobster-dice.vercel.app/crimson';

for (let i = 1; i <= 25; i++) {
  const id = String(i).padStart(2, '0');
  const url = `${base}/${id}`;
  const file = path.join(dir, `${id}.png`);
  await QRCode.toFile(file, url, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#1c1c1c', light: '#ffffff' }
  });
  console.log(id, url);
}
