const speakeasy = require("speakeasy");

const secret = "NVGTERDBENHC6NZQJBNDQY2VPJMDKS32GZQUAOCEGISUSSDDGVBA";

const now = new Date();
const token = speakeasy.totp({
  secret: secret,
  encoding: 'base32'
});

console.log("Current Server Time:", now.toISOString());
console.log("Local Time String:", now.toLocaleString());
console.log("Expected Token now:", token);

// Check verification with window: 2 or window: 10
const userToken = "823785";
const isValidWindow2 = speakeasy.totp.verify({
  secret: secret,
  encoding: 'base32',
  token: userToken,
  window: 2
});

const isValidWindow10 = speakeasy.totp.verify({
  secret: secret,
  encoding: 'base32',
  token: userToken,
  window: 10
});

console.log("Verification with window 2:", isValidWindow2);
console.log("Verification with window 10:", isValidWindow10);

// Let's find what time offsets would make userToken valid
for (let offset = -30; offset <= 30; offset++) {
  const time = Date.now() + (offset * 30 * 1000);
  const code = speakeasy.totp({
    secret: secret,
    encoding: 'base32',
    time: Math.floor(time / 1000)
  });
  if (code === userToken) {
    console.log(`Token is valid at offset of ${offset * 30} seconds (${offset} time steps)`);
    console.log(`Target Time: ${new Date(time).toISOString()}`);
  }
}
