# ADR-0005: BotNotConnected (B006) 503 ErrorResponse設計・実装整合

- **日付**: 2025-08-23
- **Status**: Proposed
- **USDM**: #US-001-4

## Context

`POST /bots/{id}/start` APIで、Botが未接続の場合に「503 Service Unavailable」としてエラーコード`B006`・メッセージ`Bot not connected`を返す必要がある。  
従来はOpenAPIドキュメントに503応答が未記載だった。

## Decision

- OpenAPI (`docs/03_design/api/openapi.yaml`) `/bots/{botId}/start` の `responses` に `'503'` を追加し、  
  `ErrorResponse`スキーマ（error.code: B006, error.message: Bot not connected）例を明記。
- コントローラ実装（[`src/controllers/bot.controller.ts`](src/controllers/bot.controller.ts) 195–197行付近）も  
  `res.status(503).json({ error: { code: 'B006', message: 'Bot not connected' } })` で統一。
- 単体テストもこの仕様に合わせて修正すること。

## Consequences

- API仕様と実装の整合性が担保され、クライアントはBot未接続時のエラーを正しく判別可能。
- 503/B006の返却は「一時的な利用不可」を意味し、再試行やUI通知の設計が容易になる。

## Alternatives

- 400/404/409等の他ステータスで返す案もあったが、「一時的な接続不可」状態を明示するため503を採用。

---

## Dev向け Issue テンプレ案

**タイトル:**  
POST /bots/{id}/start: Bot未接続時の503(B006) ErrorResponse実装・テスト

**内容:**  
- `src/controllers/bot.controller.ts` の `startMining` ハンドラで `BotNotConnected` エラー時に  
  `res.status(503).json({ error: { code: 'B006', message: 'Bot not connected' } })` を返すこと
- OpenAPI (`docs/03_design/api/openapi.yaml`) の `'503'` レスポンス例と完全一致させること
- 単体テストで 503/B006 の返却を検証すること

**参考:**  
- [docs/03_design/api/openapi.yaml](docs/03_design/api/openapi.yaml)
- [docs/03_design/adr/0005-botnotconnected-errorresponse.md](docs/03_design/adr/0005-botnotconnected-errorresponse.md)