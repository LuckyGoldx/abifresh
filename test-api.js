const http = require("http");

const token = process.env.TEST_AUTH_TOKEN || "";

if (!token) {
  console.error("No auth token provided.");
  console.error("   Option 1: Set TEST_AUTH_TOKEN environment variable");
  console.error("   Option 2: $env:TEST_AUTH_TOKEN=\"your-jwt-token\"");
  process.exit(1);
}

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/admin/payments/pending",
  method: "GET",
  headers: {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  }
};

const req = http.request(options, (res) => {
  console.log("Status Code: " + res.statusCode);
  console.log("Headers:", res.headers);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Response body:", data);
    try {
      const parsed = JSON.parse(data);
      console.log("Parsed JSON:", JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Not valid JSON");
    }
  });
});

req.on("error", (e) => {
  console.error("Problem with request: " + e.message);
});

req.on("timeout", () => {
  console.error("Request timed out");
  req.destroy();
});

req.setTimeout(10000);
req.end();