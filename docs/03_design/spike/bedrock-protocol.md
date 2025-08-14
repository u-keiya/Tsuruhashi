# Spike: Bedrockプロトコル多重接続パフォーマンス検証  
Date: 2025-08-14  

## Problem  
複数Bot (目標10体) を同一サーバーへ接続すると UDP パケット量が急増し  
レイテンシ・サーバーTPS 低下リスクがある。  

## Hypothesis  
Node.js + `bedrock-protocol` ライブラリで **10体まで** は  
CPU 1core / 512 MB RAM 環境でも TPS 20 を維持できる。  

## Experiment  
1. Docker で Bedrock Dedicated Server 1.20 を起動  
2. Bot Core を 1, 5, 10 体同時接続させ、採掘AIダミー負荷を実行  
3. 下記メトリクスを 15 分間収集  
   - サーバーTPS (`/tps` コマンド)  
   - Bot側 RTT (ping)  
   - CPU / メモリ使用量  

## Result _(TBD)_  
| Bot数 | 平均TPS | RTT(ms) | CPU(%) | Mem(MB) |  
|-------|--------|---------|--------|---------|  
| 1 | | | | |  
| 5 | | | | |  
| 10| | | | |  

## Recommendation  
- TPS <18 または RTT >200 ms を超えた場合、  
  Bot数を制限し Container図の `Bot Core Service` をスケールアウト (複数プロセス) する構成へ変更検討。  
- 問題なければ ADR0001 を **Accepted** に更新。  
