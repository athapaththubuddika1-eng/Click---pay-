export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { amount, method, address } = req.body;

    const BOT_TOKEN = "7437326664:AAGpM5JQ6gHgJ0dpyhQHD-2-XoRE9dcsfaI";
    const CHAT_ID = "@payment1267";
    const message = `Withdraw Request\nAmount: $${amount}\nMethod: ${method}\nAddress: ${address}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message })
    });

    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
