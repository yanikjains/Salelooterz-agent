export async function sendTelegramMessage(
  botToken: string,
  channelId: string,
  message: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
        }),
      });

      if (response.ok) return true;

      const body = await response.text().catch(() => "");
      console.error(`[Telegram] Send failed (${response.status}) attempt ${attempt}: ${body.slice(0, 240)}`);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    } catch (error) {
      console.error(`[Telegram] Send error attempt ${attempt}:`, error);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }

  return false;
}
