// Local-only: creates the FULL auto plan payment link (JPY 9,800/month,
// management + ad budget included) via Stripe API. Reads key from .env.
import fs from "fs";
import https from "https";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/^\s*STRIPE_SECRET_KEY\s*=\s*(.+)\s*$/m);
if (!m) { console.log("ERROR: STRIPE_SECRET_KEY not found in .env"); process.exit(1); }
const key = m[1].trim().replace(/^["']|["']$/g, "");

function stripe(path, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = https.request({
      hostname: "api.stripe.com", path: "/v1/" + path, method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
    }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); });
    req.on("error", reject); req.write(body); req.end();
  });
}

(async () => {
  try {
    const prod = await stripe("products", { name: "Growl Full Auto (beta) - mgmt + ad budget" });
    if (prod.error) { console.log("ERROR product:", prod.error.message); process.exit(1); }
    const price = await stripe("prices", { product: prod.id, unit_amount: "9800", currency: "jpy", "recurring[interval]": "month" });
    if (price.error) { console.log("ERROR price:", price.error.message); process.exit(1); }
    const link = await stripe("payment_links", {
      "line_items[0][price]": price.id, "line_items[0][quantity]": "1",
      "after_completion[type]": "redirect",
      "after_completion[redirect][url]": "https://growl-ai.com/payment-success?plan=agency",
    });
    if (link.error) { console.log("ERROR payment_link:", link.error.message); process.exit(1); }
    console.log("");
    console.log("==================================================");
    console.log("FULL_PAYMENT_LINK_URL = " + link.url);
    console.log("PRICE_ID = " + price.id);
    console.log("PRODUCT_ID = " + prod.id);
    console.log("==================================================");
  } catch (e) { console.log("ERROR:", String(e)); process.exit(1); }
})();
