from flask import Flask, request, jsonify, render_template
import json, os
import datetime
import telegram

# --- CONFIG ---
BOT_TOKEN = "8202242013:AAGEpIn3OveiXZ2Y15WCTCKIdSH3lQ0ATNs"
CHAT_ID = "5419054691"
DATA_FILE = "db.json"

app = Flask(__name__)
bot = telegram.Bot(token=BOT_TOKEN)

# --- LOAD / SAVE DATA ---
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"withdraws": []}

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/withdraw", methods=["POST"])
def api_withdraw():
    data = request.json
    db = load_data()

    rec = {
        "userName": data.get("userName"),
        "userId": data.get("userId"),
        "amount": data.get("amount"),
        "method": data.get("method"),
        "wallet": data.get("wallet"),
        "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    db["withdraws"].insert(0, rec)
    save_data(db)

    # Telegram Notify
    msg = (
        f"💸 *New Withdraw Request*\n"
        f"👤 User: `{rec['userName']}` (`{rec['userId']}`)\n"
        f"💵 Amount: `${rec['amount']}`\n"
        f"💳 Method: {rec['method']}\n"
        f"🏦 Wallet: `{rec['wallet']}`\n"
        f"⏱ Time: {rec['time']}"
    )
    bot.send_message(chat_id=CHAT_ID, text=msg, parse_mode="Markdown")

    return jsonify({"status": "ok", "msg": "Withdraw request saved & sent to Telegram"})

# --- Admin Panel ---
@app.route("/admin")
def admin_panel():
    db = load_data()
    return render_template("admin.html", withdraws=db["withdraws"])

if __name__ == "__main__":
    app.run(debug=True)
