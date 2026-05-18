export interface LineMessagePayload {
  to: string;
  messages: { type: string; text: string }[];
}

export async function sendLineMessage(payload: LineMessagePayload): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN not set");
    return false;
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`LINE API error ${res.status}: ${body.slice(0, 200)}`);
    return false;
  }

  return true;
}

/**
 * 週次LINE通知テキストを生成する。
 * action[0]の完成文（コピペ可）を直接含めることで、
 * アプリを開かなくても月曜朝すぐに行動できる設計。
 */
export function buildWeeklyNotificationText(
  businessName: string,
  actions: { title: string; content_type: string; content?: string }[],
  strategyNote?: string,
): string {
  // action[0]の本文（最大280文字でトリム。Instagramハッシュタグ込みでも収まる長さ）
  const MAX_CONTENT_LEN = 280;
  const first = actions[0];
  const firstContent = first?.content
    ? first.content.length > MAX_CONTENT_LEN
      ? first.content.slice(0, MAX_CONTENT_LEN) + "…"
      : first.content
    : null;

  const lines: string[] = [
    `🌱 月曜おはようございます！`,
    ``,
    `${businessName}さんの今週の施策が届きました。`,
  ];

  // 今週の方針（AI が選んだ理由を 2 文で伝える）
  if (strategyNote) {
    lines.push(``, `━━ 今週の方針 ━━`, strategyNote);
  }

  // action[0]: 完成文をそのまま掲載（コピーして即使える）
  lines.push(
    ``,
    `━━ ①今すぐ使える完成文（コピーOK）━━`,
    firstContent ?? `${first?.content_type ?? ""}「${first?.title ?? ""}」`,
  );

  // action[1] と [2]: タイトルのみ（全文はアプリで確認）
  const rest = actions.slice(1);
  if (rest.length > 0) {
    lines.push(``, `━━ 残り${rest.length}つ ━━`);
    rest.forEach((a, i) => {
      lines.push(`${i + 2}. ${a.content_type}「${a.title}」`);
    });
    lines.push(
      ``,
      `全文はアプリで確認 →`,
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app"}`,
    );
  }

  lines.push(
    ``,
    `✅ 完了したら「完了」と返信してください`,
    `Growlはあなたの反応を学んで来週さらに良くなります 📊`,
  );

  return lines.join("\n");
}
