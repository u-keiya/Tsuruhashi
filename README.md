# Tsuruhashi - Minecraft Bot Framework

Minecraft Bedrockサーバー向けの自動マイニングボットフレームワーク

## 🚀 セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. ビルド
```bash
npm run build
```

### 3. サーバー起動
```bash
# 本番モード
npm run start

# 開発モード（自動リスタート）
npm run dev
```

サーバーは `http://localhost:8080` で起動します。

## 🎯 CLIコマンド

### ボット召喚 (`summonbot`)

```bash
# 基本的な使用方法
node dist/cli/summonbot.js summon -p <player-id>

# 複数ボットの同時召喚
node dist/cli/summonbot.js summon -p player123 -c 3

# ヘルプ表示
node dist/cli/summonbot.js --help
```

**オプション:**
- `-p, --player-id`: プレイヤーID（必須）
- `-c, --count`: 召喚するボット数（デフォルト: 1）

### エリア設定 (`setarea`)

```bash
# マイニングエリアの設定
node dist/cli/setarea.js set --bot-id <bot-id> --start-x <x> --start-y <y> --start-z <z> --end-x <x> --end-y <y> --end-z <z>

# 例
node dist/cli/setarea.js set --bot-id player123 --start-x 100 --start-y 64 --start-z -20 --end-x 110 --end-y 64 --end-z -10

# ヘルプ表示
node dist/cli/setarea.js --help
```

**オプション:**
- `-b, --bot-id`: 対象ボットID（必須）
- `--start-x, --start-y, --start-z`: 開始座標（必須）
- `--end-x, --end-y, --end-z`: 終了座標（必須）

## 🌐 HTTP API

### ボット管理

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/bots/summon` | POST | ボット召喚 |
| `/bots/:id` | GET | ボット情報取得 |
| `/bots` | GET | 全ボット一覧 |
| `/bots/:id` | DELETE | ボット削除 |

### マイニング制御

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/bots/:id/area` | POST | マイニングエリア設定 |
| `/bots/:id/start` | POST | マイニング開始 |
| `/bots/:id/stop` | POST | マイニング停止 |
| `/bots/:id/progress` | GET | 進捗・ツール状況取得 |

### プラグイン管理

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/bots/:id/plugins/load` | POST | プラグインロード |
| `/bots/:id/plugins/unload` | POST | プラグインアンロード |

## 🐧 Ubuntuでの使用例

### curlを使用したAPI呼び出し

```bash
# マイニング開始
curl -X POST http://localhost:8080/bots/{bot-id}/start

# マイニング停止
curl -X POST http://localhost:8080/bots/{bot-id}/stop

# 進捗確認
curl -X GET http://localhost:8080/bots/{bot-id}/progress

# ボット削除
curl -X DELETE http://localhost:8080/bots/{bot-id}
```

### 完全なワークフロー例

```bash
# 1. サーバー起動
npm run start

# 2. ボット召喚
node dist/cli/summonbot.js summon -p myplayer
# 出力例: Bot ID: d6a7f123-4567-89ab-cdef-123456789abc

# 3. エリア設定
node dist/cli/setarea.js set --bot-id d6a7f123-4567-89ab-cdef-123456789abc --start-x 100 --start-y 64 --start-z -20 --end-x 110 --end-y 64 --end-z -10

# 4. マイニング開始
curl -X POST http://localhost:8080/bots/d6a7f123-4567-89ab-cdef-123456789abc/start

# 5. 進捗確認
curl -X GET http://localhost:8080/bots/d6a7f123-4567-89ab-cdef-123456789abc/progress

# 6. マイニング停止
curl -X POST http://localhost:8080/bots/d6a7f123-4567-89ab-cdef-123456789abc/stop
```

### エラーハンドリング付きスクリプト例

```bash
#!/bin/bash
BOT_ID="your-bot-id-here"

echo "Starting mining for bot: $BOT_ID"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/bots/$BOT_ID/start)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" -eq 202 ]; then
    echo "✅ Mining started successfully"
else
    echo "❌ Failed to start mining. HTTP Code: $http_code"
    echo "Response: $body"
fi
```

## 🛠️ 開発・テスト

```bash
# テスト実行
npm run test

# コード検証
npm run lint

# コード自動修正
npm run lint:fix
```

## 📋 レスポンスコード

| コード | 説明 |
|---|---|
| 200 | 成功（データ取得） |
| 201 | 作成成功（ボット召喚） |
| 202 | 受付済み（非同期処理開始） |
| 204 | 成功（削除完了） |
| 400 | リクエスト不正 |
| 403 | 権限不足 |
| 404 | リソースが見つからない |

## 🔧 設定

- **ポート**: 8080（環境変数 `PORT` で変更可能）
- **プロトコル**: Minecraft Bedrock Protocol
- **データベース**: SQLite3

## 📖 追加情報

詳細なAPI仕様は `docs/03_design/api/openapi.yaml` を参照してください。

## ⚠️ 注意事項

- サーバーが起動している状態でCLIコマンドやAPI呼び出しを行ってください
- ボットIDは召喚時に返されるUUID形式の文字列を使用してください
- マイニング開始前に必ずエリア設定を行ってください