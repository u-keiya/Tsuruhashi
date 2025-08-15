# 0004 – Physical Bot Deletion
Status: Proposed  
Date: 2025-08-15  
Decision makers: SA  
USDM IDs: US-005  

## Context
ワールド管理者は不要になった Bot を完全に削除したい（US-005）。  
Bot が増え続けるとメモリ・スレッド・データベースサイズが増大し、  
サーバー性能と運用コストに直結する。  
論理削除フラグではサーバーリソースが解放されないため、  
プロセスと関連ストレージを物理的に除去する方針を採る。

## Decision
1. Control API に管理者専用エンドポイント `DELETE /bots/{id}`  
   ‑ gRPC: `DeleteBot(DeleteBotRequest) returns (DeleteBotResponse)`  
2. Bot Core 内に **DeletionManager** コンポーネントを新設。  
3. DeletionManager のフロー  
   1) 対象 Bot プロセスへ graceful stop シグナル送信  
   2) プロセス終了を確認後、State Store(SQLite) からレコード削除  
   3) Bot インベントリやキャッシュ一時ファイルを物理削除  
   4) `BotDeleted` ドメインイベントを publish（監査用）  
4. 削除 API は Admin ロールのみ許可。一般プレイヤーは 403 を返す。  
5. 削除後の復元リクエストは非対応（バックアップからの復旧に委ねる）。

## Consequences
- サーバーリソースを即時開放でき、Bot 増殖による性能低下を防止。  
- 削除は破壊的操作のため、誤操作時に Bot 復元は出来ない。  
- 監査ログ / イベントを発行することで削除追跡は可能。  
- DeletionManager 追加により Bot Core の責務が若干増えるが、  
  実装は限定的で影響範囲は小さい。

## Alternatives
- **論理削除 + GC Job**  
  - Pros: 誤削除からの復元が容易  
  - Cons: リソース解放が遅延し、GC 実装コストも必要  
- **Bot 毎に独立プロセス＋OS レベル管理**  
  - Pros: OS ツールで kill 可能  
  - Cons: マルチ Bot 起動コスト増、Bot 間通信レイヤ追加が必要

## Open Issues
- 削除 API 操作の二重確認 UI（WebUI, CLI）の実装詳細  
- 監査イベントの永続先 (log, message bus, etc.)