/**
 * /api/product-marketing
 * 商品情報を受け取り、完全なマーケティングプラン（AEO・販売・リピート）を返すAPI
 */
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { generateProductMarketingPlan, ProductProfile } from "@/lib/product-marketing-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, price, description, target, usp, purchase_url, industry,
            social_proof, limited_offer, competitor_diff } = body;

    // バリデーション
    if (!name || !category || !price || !description || !target || !usp || !industry) {
      return NextResponse.json(
        {
          error: "必要な商品情報が不足しています",
          required: ["name", "category", "price", "description", "target", "usp", "industry"],
        },
        { status: 400 }
      );
    }

    const product: ProductProfile = {
      name,
      category,
      price: Number(price),
      description,
      target,
      usp,
      purchase_url: purchase_url || undefined,
      industry,
      social_proof: social_proof || undefined,
      limited_offer: limited_offer || undefined,
      competitor_diff: competitor_diff || undefined,
    };

    const plan = await generateProductMarketingPlan(product);

    return NextResponse.json({ plan });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("product-marketing error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
