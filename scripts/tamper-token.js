// Zadanie 3 (przypadki 401): z poprawnego tokenu robi dwa zepsute.
// Uruchomienie: node scripts/tamper-token.js <accessToken>
const token = process.argv[2];
if (!token || token.split('.').length !== 3) {
  console.error('Użycie: node scripts/tamper-token.js <accessToken>');
  process.exit(1);
}

const [header, payload, signature] = token.split('.');

// 1. Zły podpis: zmieniony jeden znak podpisu
const flipped = signature[0] === 'A' ? 'B' : 'A';
const badSignature = `${header}.${payload}.${flipped}${signature.slice(1)}`;

// 2. Zmodyfikowany payload: role -> ADMIN, oryginalny podpis
const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
const forgedPayload = Buffer.from(JSON.stringify({ ...decoded, role: 'ADMIN' })).toString('base64url');
const modified = `${header}.${forgedPayload}.${signature}`;

console.log('Oryginalny payload:', decoded);
console.log('\nToken ze złym podpisem:\n' + badSignature);
console.log('\nToken ze zmienionym payloadem (role: ADMIN, stary podpis):\n' + modified);
