# 0003 — Adopt Plugin-Based Architecture for Bot Core

*Status*: Proposed  
*Date*: 2025-08-15  
*USDM IDs*: US-001, US-002, US-003, US-004  

## Context  
現行設計の Bot Core は MiningEngine / ToolManager などを単一プロセス内で密結合させている。  
将来的に「建築」「戦闘」など行動追加が頻発すると、Core が肥大化し保守が困難になる懸念がある。  
Mineflayer は最小 `Bot` オブジェクト + N 個のプラグイン群という設計で拡張性の課題を解決しており、本プロジェクトも同思想を採用したい。

## Decision  
1. **Bot Core をプラグインアーキテクチャへ転換**  
   - `Bot` + `PluginLoader` を中心に、行動ロジックはすべてプラグイン（Behavior Plugin）として実装。  
   - 物理演算・ワールド状態など基盤機能は Core Plugin として提供し再利用を図る。  
2. **Runtime でプラグインをロード／アンロード**  
   - Control API `/bots/{id}/plugins/load|unload` を追加済み。  
3. **状態永続は SQLite**  
   - Bot インスタンスごとにスナップショットを保存し再起動耐性を確保。  
4. **署名・サンドボックス機構は MVP 範囲外**  
   - 将来のセキュリティ強化時に再検討。  
5. **物理演算は community library 採択**  
   - 自前実装のコストを削減し、検証済みの OSS を利用。

## Consequences  
+ 行動追加は npm package として配布可能になり、コミュニティ拡大が期待できる。  
+ Core とプラグインが疎結合になるため、プロトコル更新時の影響が限定的。  
– 初期実装コストが増える（PluginLoader・API 増設、イベント設計など）。  
– プラグイン間 API 契約を明文化する必要がある。

## Alternatives Considered  
*Keep current service-oriented monolith*  
- シンプルだが拡張時の衝突リスクが高い。  
*Micro-service split per behavior*  
- Overkill for in-process bot logic; inter-process latency 不要。  

## Links  
- C4 Component Diagram (revised): [`docs/03_design/diagrams/c4/component-botcore.puml`](docs/03_design/diagrams/c4/component-botcore.puml:1)  
- Class Diagram (plugin-based): [`docs/03_design/diagrams/class/botcore.puml`](docs/03_design/diagrams/class/botcore.puml:1)  