import express from 'express';
import BotController from './controllers/bot.controller';

const app = express();
const port = process.env.PORT || 8080;

// JSONボディパーサーの設定
app.use(express.json());

// コントローラーのインスタンス化
const botController = new BotController();

// ルーティングの設定
app.post('/bots/summon', (req, res) => botController.summonBot(req, res));
app.get('/bots/:id', (req, res) => botController.getBot(req, res));
app.delete('/bots/:id', (req, res) => botController.deleteBot(req, res));
app.get('/bots', (req, res) => botController.getAllBots(req, res));
app.post('/bots/:id/area', (req, res) => botController.setMiningArea(req, res));

// サーバーの起動
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${port}`);
});
