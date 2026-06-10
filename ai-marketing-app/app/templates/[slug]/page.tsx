import Link from "next/link";
import { notFound } from "next/navigation";
import { TEMPLATES } from "@/lib/templates-data";
import CopyPromptButton from "@/components/CopyPromptButton";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = TEMPLATES.find((x) => x.slug === slug);
  if (!t) return {};
  return {
    title: t.title + " — Free AI Prompt for Restaurants | Growl",
    description:
      "Free copy-paste AI prompt for restaurant owners: " + t.title.toLowerCase() + ". Works with ChatGPT, Claude or Gemini. From a free library of 50 restaurant marketing prompts.",
  };
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = TEMPLATES.find((x) => x.slug === slug);
  if (!t) notFound();
  const related = TEMPLATES.filter((x) => x.category === t.category && x.slug !== t.slug).slice(0, 3);
  const faq = [
    {
      q: "Do I need a paid AI subscription to use this prompt?",
      a: "No. This prompt works with the free versions of ChatGPT, Claude and Gemini. Paste it, replace the [brackets] with your details, and send.",
    },
    {
      q: "How do I adapt it to my restaurant?",
      a: "Replace everything in [brackets] with your own details (cuisine, city, customers). The more specific you are, the better the output.",
    },
    {
      q: "Can this run automatically every week?",
      a: "Yes. Growl runs prompts like this automatically and hands you 3 ready-to-use marketing actions every week, based on live competitor research. The free plan needs no signup.",
    },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <main className="min-h-screen bg-white px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-2xl mx-auto">
        <Link href="/templates" className="text-xs text-indigo-400 font-medium">&larr; All 50 prompts</Link>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-4 mb-2">{t.category} - Prompt #{t.num}</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{t.title}</h1>
        <p className="text-gray-500 mb-8">
          A free copy-paste AI prompt for restaurant owners. Works with ChatGPT, Claude or Gemini.
        </p>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-4">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{t.prompt}</p>
        </div>
        <CopyPromptButton text={t.prompt} />
        <h2 className="text-lg font-bold text-gray-800 mt-10 mb-3">How to use it</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 flex flex-col gap-2 mb-8">
          <li>Copy the prompt above.</li>
          <li>Replace everything in [brackets] with your restaurant&apos;s details.</li>
          <li>Paste into ChatGPT, Claude or Gemini and send. Edit the output to match your voice.</li>
        </ol>
        <h2 className="text-lg font-bold text-gray-800 mb-3">FAQ</h2>
        <div className="flex flex-col gap-4 mb-10">
          {faq.map((f) => (
            <div key={f.q}>
              <p className="text-sm font-semibold text-gray-800">{f.q}</p>
              <p className="text-sm text-gray-500 mt-1">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="bg-indigo-600 rounded-2xl p-6 text-center mb-10">
          <p className="text-white font-bold mb-2">Tired of prompting every week?</p>
          <p className="text-indigo-200 text-sm mb-4">Growl researches your local competitors and hands you 3 ready-to-use actions every Monday.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="bg-white text-indigo-600 font-semibold text-sm px-5 py-3 rounded-xl">Try Growl free</Link>
            <a href="https://naofumi3.gumroad.com/l/itawej" className="bg-indigo-500 text-white font-semibold text-sm px-5 py-3 rounded-xl">All 50 as PDF ($9.99)</a>
          </div>
        </div>
        <h2 className="text-sm font-bold text-gray-800 mb-3">Related prompts</h2>
        <ul className="flex flex-col gap-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link href={"/templates/" + r.slug} className="block bg-gray-50 hover:bg-indigo-50 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium transition-colors">
                {r.num}. {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
