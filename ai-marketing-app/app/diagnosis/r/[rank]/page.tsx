import Link from "next/link";
import { notFound } from "next/navigation";

const RANKS: Record<string, { label: string; labelJa: string }> = {
  A: { label: "Outstanding", labelJa: "圧倒的" },
  B: { label: "Strong", labelJa: "高い影響力" },
  C: { label: "Growing", labelJa: "成長中" },
  D: { label: "Early days", labelJa: "改善のチャンス" },
  E: { label: "Starting line", labelJa: "スタートライン" },
};

export function generateStaticParams() {
  return Object.keys(RANKS).map((rank) => ({ rank }));
}

export async function generateMetadata({ params }: { params: Promise<{ rank: string }> }) {
  const { rank } = await params;
  const r = RANKS[rank];
  if (!r) return {};
  const img = "https://growl-ai.com/diagnosis/og-rank-" + rank + ".png";
  return {
    title: "SNS Marketing Power: Rank " + rank + " (" + r.label + ") | Growl Diagnosis",
    description:
      "Someone scored Rank " + rank + " on the free 1-minute SNS marketing diagnosis. Find out your own rank — 5 questions, no signup.",
    openGraph: { images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [img] },
  };
}

export default async function RankSharePage({ params }: { params: Promise<{ rank: string }> }) {
  const { rank } = await params;
  const r = RANKS[rank];
  if (!r) notFound();
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-4">Shared diagnosis result</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={"/diagnosis/rank-" + rank + ".svg"} alt={"SNS diagnosis rank " + rank} className="w-full rounded-2xl border border-gray-100 shadow-sm mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This person scored Rank {rank} — {r.label}</h1>
        <p className="text-gray-500 mb-8">
          The Growl SNS diagnosis scores your social media marketing in 5 questions. Free, 1 minute, no signup.
        </p>
        <Link href="/diagnosis" className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-indigo-200 active:scale-95">
          Find out your rank &rarr;
        </Link>
        <p className="text-gray-400 text-xs mt-4">5 questions - free - no signup</p>
      </div>
    </main>
  );
}
