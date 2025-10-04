// bot.js
import TelegramBot from "node-telegram-bot-api";

const token = "7776385916:AAHNDwHIehk0FJ1zzdoNV8lNB5qE_6DbPks";
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "👋 Welcome to *Ads Click Pay Admin Bot*\nYou’ll receive auto-withdraw alerts here.",
    { parse_mode: "Markdown" }
  );
  console.log("Admin User ID:", chatId);
});
