---
title: "Issue #23 自動再接続とKeep-Alive設計記録"
date: 2025-08-24T12:13:00+09:00
authors: ["DS"]
related: [ "Issue #23" ]
---

## Summary
本セッションでは Issue #23 (BotNotConnected 503 頻発) を受け、Bot の接続安定化のための設計変更を合意し、関連ドキュメントを追記しました。主要決定は自動再接続（最大5回, 指数バックオフ）と Keep‑Alive (10秒間隔) の導入です。

### User Requirement
- summon 後に startbot 実行時に 503 が出ないよう接続安定性を確保すること (Issue #23)。

### Key Decisions
- Bot の接続責務を分離したサービス `BotConnectionManager` を導入する。責務: 再接続・Keep‑Alive・接続状態照会。参照: US-002。
- 自動再接続は指数バックオフ、最大リトライ回数: 5 回。
- Keep‑Alive Ping 間隔: 10 秒。
- Bot の接続状態を取得する API `GET /bots/{botId}/health` を追加（200: BotHealthDTO）。

### Action Items
- [ ] 実装: `BotConnectionManager` の実装（Dev） — 実装箇所案: `src/models/bot.model.ts` / `src/services/bot.service.ts`.
- [ ] 実装: Keep‑Alive (10s) と自動再接続（max 5回）の単体テスト作成（TE）。
- [ ] 修正: `docs/03_design/api/openapi.yaml` の YAML/schema エラーを修正し、API 仕様を整合化する（label:docs, DD）。
- [ ] 提案: 実装 PR を feature/ISSUE-23-reconnect で作成、CI 通過後 develop にマージ（Dev）。

### Implementation Notes / Risks
- OpenAPI の追記時に YAML 検証エラーが発生（`docs/03_design/api/openapi.yaml` 保存時の検証メッセージを確認）。このままでは自動生成ツールが失敗する可能性あり。→ Action Item に追加。
- ランタイムでは再接続の副作用（重複コマンド、状態遷移競合）を想定し、Locking/コマンド拒否ロジックが必要。

### References
- Issue: https://github.com/u-keiya/Tsuruhashi/issues/23
- 変更したファイル: [`docs/03_design/diagrams/class/botcore.puml`](docs/03_design/diagrams/class/botcore.puml:1)
- 追加ファイル: [`docs/03_design/diagrams/sequence/reconnect_flow.puml`](docs/03_design/diagrams/sequence/reconnect_flow.puml:1)
- 変更したファイル: [`docs/03_design/api/openapi.yaml`](docs/03_design/api/openapi.yaml:1)
- 関連 USDM: `US-002` (参照: `docs/02_requirements/usdm/US-002.yaml`)

### Open Questions (closed)
- Keep‑Alive 間隔: 10 秒（決定）  
- 再接続最大リトライ: 5 回（決定）

End of record.