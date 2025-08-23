## Summary

本日のセッションでは、CLIからのボット召喚コマンド実行でクライアント側は成功表示したが、サーバー側で "Server requested disconnect:" が発生してボットがスポーンしなかった問題を調査・解決しました。

### User Requirement
- CLIコマンド `node dist/cli/summonbot.js summon -p player123` を実行し、ボットがMinecraft Bedrockサーバーに接続・スポーンすること。

### Key Decisions / Findings
- 原因は認証モードの不一致で、サーバーの `online-mode` が `true`（オンライン認証必須）で、クライアントは `offline: true`（Microsoft/Xbox認証無効）で接続しようとしていたため。参照: [`src/models/bot.model.ts:42`](src/models/bot.model.ts:42)（接続オプション）。
- ユーザー側でサーバーの `server.properties` を編集して `online-mode=false` に変更し、問題が解決（ボット召喚と setarea が成功）。
- 一時的に `version` をコードで指定する案を試しましたが、型定義/ライブラリ互換の問題があり、最終的にデフォルト挙動（バージョン自動検出）に戻しました。変更箇所参照: [`src/models/bot.model.ts:42`](src/models/bot.model.ts:42)。
- 参照したドキュメント: [`docs/04_dev/bedrock-protocol/API.md:3`](docs/04_dev/bedrock-protocol/API.md:3)（createClient オプション解説）、およびプロトコル定義: [`docs/04_dev/bedrock-protocol/Data-documentation.html:1`](docs/04_dev/bedrock-protocol/Data-documentation.html:1)。

### Action Items
- [ ] ドキュメントを更新して「クライアントの `offline` とサーバーの `online-mode` の相互作用」を明示する（label:docs） — Role: DD / Doc owner.
- [ ] (任意) `docs/04_dev/bedrock-protocol/API.md` にサンプル接続例（offline/online-mode 切替例）を追記 — Role: DD.
- [ ] 仕様的に「ボットを任意の座標/エリアへ移動させる」要件のIssueを作成（機能追加） — Role: IP.

### References
- CLI: [`src/cli/summonbot.ts:8`](src/cli/summonbot.ts:8)
- Bot接続実装: [`src/models/bot.model.ts:35`](src/models/bot.model.ts:35)
- サービス呼び出し: [`src/services/bot.service.ts:30`](src/services/bot.service.ts:30)
- package.json の依存: [`package.json:58`](package.json:58)
- bedrock-protocol API doc: [`docs/04_dev/bedrock-protocol/API.md:3`](docs/04_dev/bedrock-protocol/API.md:3)

### Open Questions
- 今後、サーバーがオンライン認証を必須にする運用（`online-mode=true`）に戻す場合、ボットにMSA認証（device-code 等）を組み込む必要がありますか？（該当担当: Dev / Ops）

---issue
{
"title": "docs: bedrock-protocol - clarify offline/online-mode interoperability and add sample client config",
"body": "症状: bot クライアントが `offline: true` で接続しようとした際、サーバーが `online-mode=true` の場合に接続が拒否される事象を確認しました。\n対応案: `docs/04_dev/bedrock-protocol/API.md` に「offline と server.properties の online-mode の関係」説明と、接続成功/失敗のサンプル（client options と server.properties の組み合わせ）を追記してください。\n影響箇所: `src/models/bot.model.ts` の接続サンプル参照。\nラベル: [\"docs\"], 優先度: normal, 担当: DD",
"labels": ["docs"]
}
---

Session saved by DS on 2025-08-23 14:47 JST.