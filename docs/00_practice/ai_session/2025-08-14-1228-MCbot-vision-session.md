## Summary
マインクラフト統合版Botフレームワークのビジョン文書をもとに、USDM仕様書とストーリーマップの初版を作成。  
Bot操作は「ゲーム内コマンドのみ」「採掘範囲は始点-終点座標入力」「ツール耐久0でBot停止」「進捗はチャット通知のみ」と仕様を確定。  
主要な受入基準・ユーザーストーリーをUS-001.yamlに整理し、M1リリースのストーリーマップも定義。

### User Requirement
- 建築プレイヤーが単純作業から解放され、建築に集中できるBotフレームワーク
- 操作はゲーム内コマンドのみ、範囲指定は座標ペア入力
- ツール耐久切れでBot停止、進捗はチャット通知

### Key Decisions
- Bot操作インターフェース: ゲーム内コマンドのみ
- 採掘範囲指定: 始点-終点座標入力
- ツール耐久: 0でBot停止
- 進捗可視化: チャットメッセージのみ
- USDM/ストーリーマップ初版作成（[US-001.yaml](../../02_requirements/usdm/US-001.yaml), [story_map.yaml](../../02_requirements/story_map.yaml)）

### Action Items
- [x] USDM仕様書初版作成（RA）
- [x] ストーリーマップ初版作成（RA）
- [ ] 仕様レビュー・承認（PO/SA）

### References
- USDM: US-001
- Vision: [`docs/01_vision/vision.md`](../../01_vision/vision.md)
- PR/Issue: なし（初回ドラフト）