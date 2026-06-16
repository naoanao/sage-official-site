// Local-only: reads STRIPE_SECRET_KEY from .env and creates a Stripe
// product + price (JPY 2980/month) + payment link via the Stripe API.
// Uses Node's built-in https (works on any Node version). Prints the URL only.
import fs from "fs";
import https from "https";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/^\s*STRIPE_SECRET_KEY\s*=\s*(.+)\s*$/m);
if (!m) { console.log("ERROR: STRIPE_SECRET_KEY not found in .env"); process.exit(1); }
const key = m[1].trim().replace(/^["']|["']$/g, "");
console.log("Using key:", key.slice(0, 7) + "...(hidden)");

function stripe(path, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = https.request({
      hostname: "api.stripe.com",
      path: "/v1/" + path,
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const prod = await stripe("products", { name: "Growl AI Agency (beta)" });
    if (prod.error) { console.log("ERROR product:", prod.error.message); process.exit(1); }

    const price = await stripe("prices", {
      product: prod.id,
      unit_amount: "2980",
      currency: "jpy",
      "recurring[interval]": "month",
    });
    if (price.error) { console.log("ERROR price:", price.error.message); process.exit(1); }

    const link = await stripe("payment_links", {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      "after_completion[type]": "redirect",
      "after_completion[redirect][url]": "https://growl-ai.com/payment-success?plan=agency",
    });
    if (link.error) { console.log("ERROR payment_link:", link.error.message); process.exit(1); }

    console.log("");
    console.log("==================================================");
    console.log("PAYMENT_LINK_URL = " + link.url);
    console.log("PRICE_ID = " + price.id);
    console.log("PRODUCT_ID = " + prod.id);
    console.log("==================================================");
  } catch (e) {
    console.log("ERROR:", String(e));
    process.exit(1);
  }
})();
