# 0001 – Bot Framework Tech-Stack Selection  
Status: Proposed  
Date: 2025-08-14  
Decision makers: SA  
USDM IDs: US-001, US-002, US-003, US-004  

## Context  
統合版マインクラフト(Bedrock Edition)向けBotフレームワークでは、  
1) Bedrock専用プロトコル(UDP)を双方向に扱えること  
2) 軽量かつ複数Botを同時制御できる性能  
3) サーバー管理者が拡張しやすいプラグイン／API層  
4) クロスプラットフォーム (Windows / Linux) で導入容易  
が求められる。  

USDMの必須機能 (放置採掘・複数Bot・ツール管理・進捗可視化) を  
実現するには、Botコアがリアルタイムでサーバーと通信し、  
外部からコマンド/クエリを受け付ける構成が望ましい。  

## Decision  
1. **言語 / ランタイム** Node.js (LTS)  
   - `bedrock-protocol` OSS ライブラリが利用可能で開発効率が高い  
   - 非同期 I/O とシングルバイナリ配布 (pkg) が容易  

2. **Bot Core** `bedrock-protocol` + 独自 AI ロジック  
   - プロトコルラッパーとして同ライブラリを採用し、  
     Bot の移動・採掘・チャット制御を実装  

3. **制御API** gRPC + REST (Express)  
   - CLI/Plugin や WebUI から同一の API を呼び出す  
   - gRPC は低レイテンシのストリーム制御、REST は簡易操作用  

4. **データ保存** SQLite (File-based)  
   - Bot状態・進捗を低オーバーヘッドで永続化  
   - 単一ファイルなので導入コストが低い  

5. **フロントエンド** React + Vite  
   - 進捗ダッシュボード (optional) を SPA で提供  

6. **配布形態**  
   - サーバーに CLI/Plugin (PowerShell, BehaviorPack) を配置し  
     Bot Core バイナリ(Node pkg)を起動  
   - Docker image も公式提供予定  

## Consequences  
- Bedrock専用ライブラリの更新に追随する必要がある  
- Node.js 依存により、極端な低リソース環境では別言語実装より  
  メモリフットプリントが大きい可能性  
- gRPC + REST の二重API維持コスト  
+ OSS エコシステムを活用し開発速度を向上  
+ クロスプラットフォームで導入障壁を低減  
+ SQLite により追加ミドルウェア無しで状態保持  

## Alternatives Considered  
| Option | Pros | Cons |  
|--------|------|------|  
| Go + `go-bedrock` | 高性能・静的バイナリ | ライブラリ成熟度が低い |  
| Python + `mcproto` | 学習コスト低 | 単一スレッド性能 & 型安全性課題 |  
| C++ 専用実装 | 最高性能 | 開発コスト & OSS貢献性低 |  

## Related Diagrams / Docs  
- [`diagrams/c4/container.puml`](../diagrams/c4/container.puml)  
- SPIKE: `spike/bedrock-protocol.md` (TBD)  
