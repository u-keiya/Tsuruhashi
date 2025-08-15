# Bot Deletion Session (2025-08-15 14:12)

## Summary
本セッションでは、US-005 不要 Bot の物理削除の実装をコードベースへ反映した作業を振り返り、設計資産の整合性を確保することを目的とした。クラス図へ DeletionManager と BotDeleted を追加し、Bot Core に削除機能の責務を組み込み、OpenAPI に削除 API を追加した。削除フローを新規のシーケンス図で明示し、US-005 と ADR-0004 のトレースを確保した。

## User Requirements
- 管理者のみ Bot の物理削除を実行可能とする (一般プレイヤーは 403 Forbidden)
- 削除後、対象 Bot のプロセス・インベントリ・メモリを完全に削除
- Bot が削除済みの場合、Bot 一覧に表示されないこと
- 削除操作は「復元不可」であること
- 物理削除を採用し、論理削除フラグや復元機能は持たない
- 削除操作は Admin ロールの API / UI のみで実行可能

関連参照:
- [docs/02_requirements/usdm/US-005.yaml](docs/02_requirements/usdm/US-005.yaml:1) 
- [docs/03_design/adr/0004-physical-bot-deletion.md](docs/03_design/adr/0004-physical-bot-deletion.md:1)
- [docs/03_design/api/openapi.yaml](docs/03_design/api/openapi.yaml:1)

## Key Decisions
- DeletionManager 〈Service〉と BotDeleted 〈Event〉を Bot Core に追加し、Bot との関連を明示する設計に決定
- REST API に DELETE /bots/{botId} を追加し、204 No Content（削除成功）、403（権限エラー）、404（Not Found）を返す設計
- 削除フローは以下の順序で実行されることを決定
  1) 対象 Bot プロセスへ graceful stop シグナルを送信
  2) プロセス終了を確認後、State Store(SQLite) からレコードを削除
  3) Bot インベントリやキャッシュ一時ファイルを物理削除
  4) BotDeleted ドメインイベントを publish（監査用）
- 削除 API は Admin ロールのみ許可。一般プレイヤーは 403 を返す
- 削除後の復元リクエストは非対応（バックアップからの復旧に委ねる）

参照ファイル:
- [docs/03_design/diagrams/class/botcore.puml](docs/03_design/diagrams/class/botcore.puml:1)
- [docs/03_design/api/openapi.yaml](docs/03_design/api/openapi.yaml:1)
- [docs/03_design/diagrams/sequence/delete_bot.puml](docs/03_design/diagrams/sequence/delete_bot.puml:1)
- ADR/USDM の追跡情報は ADR-0004, US-005 を参照

## Action Items
- [x] Bot Core に DeletionManager/ BotDeleted の追加と Bot との関連付け
- [x] OpenAPI に DELETE /bots/{botId} エンドポイントを追加
- [x] 物理削除フローを新規シーケンス図に反映（delete_bot.puml）
- [x] ADR-0004/US-005 のトレース情報を文書化
- [x] セッションの参照更新とドキュメント整合性の確保

## References
- USDM: US-005
- ADR: ADR-0004-physical-bot-deletion.md
- 変更ファイルの参照:
  - [`docs/03_design/api/openapi.yaml`](docs/03_design/api/openapi.yaml:1)
  - [`docs/03_design/diagrams/sequence/delete_bot.puml`](docs/03_design/diagrams/sequence/delete_bot.puml:1)
  - [`docs/03_design/diagrams/class/botcore.puml`](docs/03_design/diagrams/class/botcore.puml:1)