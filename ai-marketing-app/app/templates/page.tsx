import Link from "next/link";
import { TEMPLATES, CATEGORIES } from "@/lib/templates-data";

export const metadata = {
  title: "50 Free AI Marketing Prompts for Restaurants (Copy & Paste) | Growl",
  description:
    "Free library of 50 copy-paste AI prompts for restaurant marketing: Instagram captions, Google review replies, promotions, emails and strategy. Works with ChatGPT, Claude or Gemini.",
};

export default function TemplatesIndex() {
  return (
    <main className="min-h-screen bg-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-2">Free prompt library</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">50 AI Marketing Prompts for Restaurant Owners</h1>
        <p className="text-gray-500 mb-10">
          Copy, paste, fill the blanks. Each prompt works with free ChatGPT, Claude or Gemini.
          Written by a restaurant owner in Japan who automated his own marketing.
        </p>
        {CATEGORIES.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{cat}</h2>
            <ul className="flex flex-col gap-2">
              {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                <li key={t.slug}>
                  <Link href={"/templates/" + t.slug} className="block bg-gray-50 hover:bg-indigo-50 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium transition-colors">
                    {t.num}. {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="bg-indigo-600 rounded-2xl p-6 text-center mt-12">
          <p className="text-white font-bold mb-2">Want all 50 in one clean PDF?</p>
          <p className="text-indigo-200 text-sm mb-4">One-time $9.99. Or let Growl run these automatically every week.</p>
          <div className="flex gap-3 justify-center">
            <a href="https://naofumi3.gumroad.com/l/itawej" className="bg-white text-indigo-600 font-semibold text-sm px-5 py-3 rounded-xl">Get the PDF</a>
            <Link href="/" className="bg-indigo-500 text-white font-semibold text-sm px-5 py-3 rounded-xl">Try Growl free</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
