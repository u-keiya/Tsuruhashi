# 0002 Async-Retry Architecture

| 項目 | 内容 |
|-----|-----|
| **Status** | Proposed |
| **Date** | 2025-08-15 |
| **Decision Makers** | SA |
| **Supersedes / Amends** | ― |
| **Related USDM** | US-002（失敗時リカバリ）／US-003（多言語対応の一部・非同期通知） |

---

## Context
BotCore がリアルタイム UDP 制御を行うため、単一プロセスで全コマンドを即時処理すると **ネットワーク不調・サーバー TPS 低下** など外部要因で失敗時リカバリが困難。<br>
US-002 は「失敗時に自動で再試行し、プレイヤーの指示を待たせない」ことを要求している。  
現行設計では **同期的再送** のみで、指数バックオフや管理 UI からの監視が考慮されていない。

---

## Decision
1. **Retry Queue (RabbitMQ/SQS)** を導入し、BotCore が失敗コマンドを Publish。  
2. **Retry Manager** は Queue を Subscribe し、指数バックオフを適用しつつ BotCore の Control API へ再送。  
3. Queue の可視性により <br>• 失敗件数メトリクスを Web UI に掲示<br>• 管理者がメッセージをポージング／削除可能。  
4. レイテンシが許容外の場合でも再送は非同期で行うため、プレイヤー操作 UI は即応を維持。  
5. 将来的に **DLQ (Dead-Letter Queue)** を設定し、恒久失敗イベントをアラート化できる拡張ポイントを確保。

---

## Consequences
### Positive
- 再試行ロジックが BotCore から分離 → コードが簡潔・テスト容易。  
- Queue がバッファとなりスパイク負荷を平滑化。  
- 失敗統計を可観測化し、運用フェーズでの SLA 改善サイクルを回せる。

### Negative / Risk
- 追加インフラ (Message Queue) の運用コスト。  
- 不整合タイミング（再送保留中）に UI が古い状態を表示する可能性 → 5 秒 Pull + WebSocket Push で緩和。

---

## Alternatives Considered
| 代替案 | 理由 |
|-------|------|
| BotCore 内に再試行キューを持つ | BotCore 停止時に失敗キューもロスト／水平スケール非対応 |
| データベース Polling 再送 | レイテンシが高く、キュー可視化 UI が複雑化 |

---

## References
- C4 Container 更新: [`docs/03_design/diagrams/c4/container.puml`](docs/03_design/diagrams/c4/container.puml)
- Component Diagram: [`docs/03_design/diagrams/c4/component-retry-locale.puml`](docs/03_design/diagrams/c4/component-retry-locale.puml)