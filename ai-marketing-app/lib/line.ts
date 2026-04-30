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

export function buildWeeklyNotificationText(
  businessName: string,
  actions: { title: string; content_type: string }[]
): string {
  const lines = [
    `🌟 おはようございます、${businessName}さん！`,
    ``,
    `今週のマーケタスクをGrowlが用意しました👇`,
    ``,
    ...actions.map((a, i) => `${i + 1}. ${a.content_type}「${a.title}」`),
    ``,
    `コピーして投稿するだけ。今週も一緒に頑張りましょう！`,
    ``,
    `▶ 開く: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://growl.app"}`,
  ];
  return lines.join("\n");
}
