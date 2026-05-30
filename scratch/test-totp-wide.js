const speakeasy = require("speakeasy");

const secret = "NVGTERDBENHC6NZQJBNDQY2VPJMDKS32GZQUAOCEGISUSSDDGVBA";
const userToken = "823785";

console.log("Searching for token generation time...");

// Search for the token in the last 24 hours (step size = 30 seconds)
const nowMs = Date.now();
const stepMs = 30 * 1000;
const searchRangeSteps = 2880; // 24 hours * 120 steps/hour = 2880 steps

let found = false;

// Search backwards and forwards
for (let offset = -searchRangeSteps; offset <= searchRangeSteps; offset++) {
  const timeMs = nowMs + (offset * stepMs);
  const code = speakeasy.totp({
    secret: secret,
    encoding: 'base32',
    time: Math.floor(timeMs / 1000)
  });
  if (code === userToken) {
    const diffMin = (offset * 30) / 60;
    console.log(`Found match!`);
    console.log(`Time when code was valid: ${new Date(timeMs).toISOString()}`);
    console.log(`Local Time: ${new Date(timeMs).toLocaleString()}`);
    console.log(`Time difference from current server time: ${diffMin} minutes`);
    found = true;
  }
}

if (!found) {
  console.log("Token not found in the 24-hour range. Let's expand search to 30 days.");
  // Let's do a search over the last 30 days but using a faster check or larger steps? No, we have to check every 30 seconds.
  // Actually, we can check day by day around the current time or check if there is a year mismatch.
  // What if the user's phone is in year 2026 but the server time is actually running in a different year?
  // Let's search a wider range. Let's do a search of +/- 30 days.
  // Since 30 days is too long to loop 30 * 24 * 120 = 86400 times in JS, we can do it quickly. It takes less than a second for 86400 iterations.
  const days = 30;
  const stepsPerDay = 24 * 120;
  for (let offset = -days * stepsPerDay; offset <= days * stepsPerDay; offset++) {
    const timeMs = nowMs + (offset * stepMs);
    const code = speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      time: Math.floor(timeMs / 1000)
    });
    if (code === userToken) {
      const diffHours = (offset * 30) / 3600;
      console.log(`Found match in 30-day search!`);
      console.log(`Time when code was valid: ${new Date(timeMs).toISOString()}`);
      console.log(`Local Time: ${new Date(timeMs).toLocaleString()}`);
      console.log(`Time difference from current server time: ${diffHours} hours (${diffHours / 24} days)`);
      found = true;
      break;
    }
  }
}

if (!found) {
  console.log("Still not found. Let's check if the secret has spaces or other encoding issues?");
}
