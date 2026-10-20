export async function sendTelegramMessage(
  botToken: string,
  channelId: string,
  message: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });

      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        description?: string;
        parameters?: { retry_after?: number };
      } | null;
      if (response.ok && payload?.ok === true) return true;

      const retryAfter = Number(payload?.parameters?.retry_after);
      const retryable = response.status === 429 || response.status >= 500;
      console.error(
        `[Telegram] Send failed (${response.status}) attempt ${attempt}: ${payload?.description || "API rejected the message"}`
      );
      if (!retryable || attempt === 5) return false;
      const delayMs = response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter, 300) * 1000
        : attempt * 1500;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch {
      if (attempt === 5) return false;
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }

  return false;
}
