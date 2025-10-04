// faucetpay.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const FAUCETPAY_API_KEY = "7a67d4b6e705bddccfb4b8231bbe428a1fcf8aa6845cab20a4baa3280b85b3a6";
const BOT_TOKEN = "7776385916:AAHNDwHIehk0FJ1zzdoNV8lNB5qE_6DbPks";
const ADMIN_USER_ID = "YOUR_TELEGRAM_USER_ID"; // <-- replace with your Telegram ID

app.post("/api/withdraw", async (req, res) => {
  const { amount, to, currency, uid, name } = req.body;

  try {
    const formData = new URLSearchParams();
    formData.append("api_key", FAUCETPAY_API_KEY);
    formData.append("amount", amount);
    formData.append("to", to);
    formData.append("currency", currency);

    const response = await fetch("https://faucetpay.io/api/v1/send", {
      method: "POST",
      body: formData,
    });

    const json = await response.json();

    if (json.status === 200) {
      // Telegram Notification
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_USER_ID}&text=✅ Withdraw Success:%0AUser: ${name}%0AEmail: ${to}%0AAmount: $${amount}`
      );

      return res.json({ success: true, tx: json.data?.transactionId });
    } else {
      return res.status(400).json({ success: false, message: json.message });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.listen(3000, () => console.log("✅ FaucetPay Withdraw API Running on Port 3000"));
