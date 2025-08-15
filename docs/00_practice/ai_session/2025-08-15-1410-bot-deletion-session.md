## Session: US-005 Bot Deletion Reflection

この記事は、US-005「不要 Bot の削除」仕様をアーキテクチャに反映したセッションを記録するものです。

## Summary
- US-005 の削除仕様を設計ドキュメントに反映。DeletionManager の追加、Control API の削除エンドポイントの関連付け、及び関連 ADR の作成を実施。
- C4 context.puml / container.puml / component-botcore.puml に DeletionManager を追記。Admin-only の削除操作を想定。
- 物理削除方針を ADR に記録。新 ADR0004 を追加。

## User Requirement
- 不要 Bot を完全に削除する（物理削除、論理削除/復元はなし）  
- 削除は管理者権限 API/UI のみ、一般プレイヤーからの呼出は 403  
- 削除後の復元は非対応

## Key Decisions
- DeletionManager コンポーネントを Bot Core に新設  
- Control API に管理者専用エンドポイント DELETE /bots/{id} を追加  
- ドメインイベント BotDeleted の発行を検討（監査用）  
- C4 系図へ US-005 の関連（context.puml, container.puml, component-botcore.puml）を追記  
- ADR 0004 物理削除方針を新規作成  

## Actions
- [ ] US-005 反映状況の CI チェックとドキュメント整合性の確認
- [ ] ADR-0004 の詳細を ADR ファイルへ固定化（締切: 今週中）  
- [ ] WebUI/CLI の削除操作のUI/エンドポイントの検討メモの作成  
- [ ] 監査イベント設計の初期ドラフト作成  

## References
- [docs/02_requirements/usdm/US-005.yaml:1](docs/02_requirements/usdm/US-005.yaml:1)  
- [docs/03_design/adr/0004-physical-bot-deletion.md:1](docs/03_design/adr/0004-physical-bot-deletion.md:1)