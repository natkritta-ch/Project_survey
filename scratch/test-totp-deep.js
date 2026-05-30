const speakeasy = require("speakeasy");

const secret = "NVGTERDBENHC6NZQJBNDQY2VPJMDKS32GZQUAOCEGISUSSDDGVBA";
const userToken = "823785";

console.log("Searching years 2024, 2025, 2026, and 2027 by 30-second steps...");

// We'll search in chunks to prevent memory issues, but simple loop is fine.
// Let's define start and end times
const start = new Date("2024-01-01T00:00:00Z").getTime();
const end = new Date("2027-12-31T23:59:59Z").getTime();
const step = 30 * 1000; // 30 seconds

let found = false;
let count = 0;

for (let timeMs = start; timeMs <= end; timeMs += step) {
  count++;
  if (count % 5000000 === 0) {
    console.log(`Processed ${count} steps...`);
  }
  const code = speakeasy.totp({
    secret: secret,
    encoding: 'base32',
    time: Math.floor(timeMs / 1000)
  });
  if (code === userToken) {
    console.log(`\nFOUND MATCH!`);
    console.log(`Time (UTC): ${new Date(timeMs).toISOString()}`);
    console.log(`Time (Local): ${new Date(timeMs).toLocaleString()}`);
    found = true;
  }
}

console.log(`Search finished. Total steps checked: ${count}`);
if (!found) {
  console.log("Token never matched any time in 2024-2027.");
}
