// Creates ENGLISH-language Stripe products + USD monthly prices + payment links,
// so English buyers see English text on the Stripe checkout (fixes JP description leak).
// Reads STRIPE_SECRET_KEY from .env. Run: node create_usd_english_products.mjs
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
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
    }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); });
    req.on("error", reject); req.write(body); req.end();
  });
}

async function make(name, description, cents, planParam) {
  const prod = await stripe("products", { name, description });
  if (prod.error) throw new Error(name + " product: " + prod.error.message);
  const price = await stripe("prices", { product: prod.id, unit_amount: String(cents), currency: "usd", "recurring[interval]": "month" });
  if (price.error) throw new Error(name + " price: " + price.error.message);
  const link = await stripe("payment_links", {
    "line_items[0][price]": price.id, "line_items[0][quantity]": "1",
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": `https://growl-ai.com/payment-success?plan=${planParam}`,
  });
  if (link.error) throw new Error(name + " link: " + link.error.message);
  return link.url;
}

(async () => {
  try {
    const standard = await make("Growl Standard Plan",
      "Weekly AI-generated marketing actions delivered every Monday, monthly performance report, and unlimited generations.",
      2900, "standard");
    const pro = await make("Growl Pro Plan",
      "Everything in Standard, plus multi-location management (up to 5), automated Google review replies, and priority support.",
      7900, "pro");
    const agency = await make("Growl Ad Management",
      "AI creates and manages your ads. You provide the ad budget. Cancel anytime.",
      1900, "agency");
    const agencyFull = await make("Growl Full-Service Ads (budget included)",
      "Management plus ad budget included. AI builds, launches and optimizes your ads automatically after payment.",
      7900, "agency");
    console.log("\n==================================================");
    console.log("STANDARD_USD   = " + standard);
    console.log("PRO_USD        = " + pro);
    console.log("AGENCY_USD     = " + agency);
    console.log("AGENCYFULL_USD = " + agencyFull);
    console.log("==================================================\n");
    console.log("Paste these 4 lines back to Claude to wire into stripe-config.");
  } catch (e) { console.log("ERROR:", String(e.message || e)); process.exit(1); }
})();
