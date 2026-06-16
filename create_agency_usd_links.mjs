// Local-only: creates USD payment links for the agency plans.
// agency (mgmt only) = $19/mo, agencyFull (mgmt + ad budget) = $79/mo.
// Reuses existing products. Reads STRIPE_SECRET_KEY from .env.
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

async function makeLink(product, cents, label) {
  const price = await stripe("prices", { product, unit_amount: String(cents), currency: "usd", "recurring[interval]": "month" });
  if (price.error) throw new Error(label + " price: " + price.error.message);
  const link = await stripe("payment_links", {
    "line_items[0][price]": price.id, "line_items[0][quantity]": "1",
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": "https://growl-ai.com/payment-success?plan=agency",
  });
  if (link.error) throw new Error(label + " link: " + link.error.message);
  return { url: link.url, priceId: price.id };
}

(async () => {
  try {
    const agency = await makeLink("prod_UhP40GfvdPcikT", 1900, "agency");
    const full = await makeLink("prod_UhPRldjQNbs6al", 7900, "agencyFull");
    console.log("");
    console.log("==================================================");
    console.log("AGENCY_USD_LINK = " + agency.url + "  (" + agency.priceId + ")");
    console.log("AGENCYFULL_USD_LINK = " + full.url + "  (" + full.priceId + ")");
    console.log("==================================================");
  } catch (e) { console.log("ERROR:", String(e.message || e)); process.exit(1); }
})();
