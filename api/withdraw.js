// api/withdraw.js  (Node.js serverless for Vercel / Netlify-style)
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { amount, to, currency, uid, name } = req.body || {};
  if(!amount || !to || !currency) return res.status(400).json({ message: 'Missing params' });

  const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY; // set in Vercel dashboard
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // numeric or @channel

  if(!FAUCETPAY_API_KEY) return res.status(500).json({ message: 'FaucetPay API key not configured on server' });

  try {
    // Call FaucetPay send API
    const params = new URLSearchParams();
    params.append('api_key', FAUCETPAY_API_KEY);
    params.append('currency', currency); // USDT
    params.append('to', to);
    params.append('amount', amount);

    const fpRes = await fetch('https://faucetpay.io/api/v1/send', {
      method: 'POST',
      body: params
    });
    const fpJson = await fpRes.json();

    // fpJson example: { status: 200, message: 'OK', txid: '...' }
    if(fpJson.status && Number(fpJson.status) === 200){
      // send telegram notification (best effort)
      if(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID){
        try {
          const text = `📤 Withdraw Request Processed\nUser: ${name || uid}\nUID: ${uid}\nAmount: ${amount} ${currency}\nTo: ${to}\nResult: ${fpJson.message || 'OK'}\nTX: ${fpJson.tx ? fpJson.tx : (fpJson.txid||'n/a')}`;
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
          });
        } catch (e){
          console.warn('Telegram notify failed', e);
        }
      }

      return res.status(200).json({ success: true, message: 'Paid', tx: fpJson.tx || fpJson.txid || null });
    } else {
      // FaucetPay responded with error
      return res.status(400).json({ success: false, message: fpJson.message || 'FaucetPay error', raw: fpJson });
    }

  } catch (err) {
    console.error('Withdraw error', err);
    return res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
}
