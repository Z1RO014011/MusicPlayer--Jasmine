const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'neteaseApi.ts'),
  'utf8',
);

const checkUrlMatch = source.match(/fetch\(`\$\{getBaseURL\(\)\}\/login\/qr\/check\?([^`]+)`/);

if (!checkUrlMatch) {
  throw new Error('Could not find QR check fetch URL');
}

const checkUrlTemplate = checkUrlMatch[1];

if (!checkUrlTemplate.includes('noCookie=true')) {
  throw new Error('QR check URL must include noCookie=true');
}

if (!checkUrlTemplate.includes('loginTs()')) {
  throw new Error('QR check URL must keep timestamp cache buster');
}

console.log('QR login URL check passed');
