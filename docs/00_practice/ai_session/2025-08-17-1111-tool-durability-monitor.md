# Tool durability monitor & stop on break (US-001-5) — セッション記録

このセッションでは、GitHub Issue #6 に基づく「ツール耐久監視と破損時停止機能」の実装を完了した過程を記録します。関連ファイルの変更点、意思決定、今後の対応を時系列で整理します。

##Summary
- ツールの耐久度を監視する ToolManager を実装し、耐久度が 0 となった場合に MiningEngine に停止指示を送信し、チャット通知を実行する機能を追加した。
- MiningEngine に stopDig() を追加し、停止時には採掘キューをクリアして停止状態を反映するようにした。
- Bedrock プロトコルを介して Minecraft サーバーへチャット通知を送る ChatNotifier を実装した。
- これらの新機能を対象にユニットテストを追加・更新し、CI/Lint チェックが通る状態を確保した。
- 作業ブランチは feat/6-tool-durability-monitor として作成・Push し、Pull Request を作成済み。

関連リンク
- PR: [feat: Tool durability monitor & stop on break (US-001-5)](https://github.com/u-keiya/Tsuruhashi/pull/16)
- Issue: #6 (Tool durability monitor)
- USDM: US-001-5
- 設計書: [`docs/03_design/diagrams/sequence/tool_break_swap.puml`](docs/03_design/diagrams/sequence/tool_break_swap.puml:1)

関連ファイル（変更点の参照用リンク）
- [`src/engine/toolManager.ts`](src/engine/toolManager.ts:1)
- [`src/engine/miningEngine.ts`](src/engine/miningEngine.ts:1)
- [`src/engine/chatNotifier.ts`](src/engine/chatNotifier.ts:1)
- [`tests/unit/toolManager.test.ts`](tests/unit/toolManager.test.ts:1)
- [`docs/03_design/diagrams/sequence/tool_break_swap.puml`](docs/03_design/diagrams/sequence/tool_break_swap.puml:1)

##User Requirement
- ツールの耐久度を監視し、耐久度が 0 になったら MiningEngine に停止要求を送ること。
- 停止時にはチャット通知を送信すること（日本語メッセージ: "ツール切れで停止"）。
- MiningEngine は stopDig() を提供し、採掘を停止して採掘キューをクリアすること。
- Bedrock-protocol を用いて Minecraft サーバーへ通知を送ること。
- ユニットテストを追加・更新して、耐久 1 → 0 のケースで停止が呼ばれることを検証すること。

##Key Decisions
- ToolManager.notifyUse(blockHardness) で耐久を減らし、0 になった場合に stopDig() とチャット通知を実行する方針を採択。実装ファイル: src/engine/toolManager.ts
- MiningEngine.stopDig() を追加し、採掘停止時には miningQueue をクリアし、状態を Idle に戻す設計を採用。実装ファイル: src/engine/miningEngine.ts
- ChatNotifier は bedrock-protocol の text パケットを用いてチャットを送信する。実装ファイル: src/engine/chatNotifier.ts
- テストは Jest へ移行せず、既存のテスト環境に合わせて Sinon + Chai ベースのテストを拡張・追加。更新ファイル: tests/unit/toolManager.test.ts, tests/unit/miningEngine.test.ts

##Action Items
- [x] Issue #6 の理解と要件整理（USDM: US-001-5、PR #16 対応含む）
- [x] 設計書の確認（sequence/tool_break_swap.puml）
- [x] コードベースの理解とブランチ作成
- [x] ToolManager クラスの実装
- [x] MiningEngine に stopDig() を追加
- [x] ChatNotifier の実装
- [x] 連携テストの拡張（toolManager.test.ts、miningEngine.test.ts）
- [x] Lint/CI チェックの実行と修正
- [x] GitHub へプルリクエストを作成・プッシュ
- [x] セッションのドキュメント化（本セッション記録の作成）

## References
- USDM: US-001-5
- Issue: #6
- PR: https://github.com/u-keiya/Tsuruhashi/pull/16
- Design reference: docs/03_design/diagrams/sequence/tool_break_swap.puml

注意:
- 本セッションの成果物は docs/00_practice/ai_session/ に日付付きファイルとして記録します。今後、 Confluence 風の要約や ADR の追加も検討します。
- 変更済みファイルの差分は、後続のコミット履歴とともにレビュアーへ提示される想定です。
