# Error Catalog – Bot Control API  
USDM: #US-001 #US-002 #US-003 #US-004  

| Code | HTTP | Title | Description | Typical Cause |
|------|------|-------|-------------|---------------|
| B001 | 400  | InvalidRange        | 採掘範囲パラメータが不正 | start/end 座標がワールド境界外または体積過大 |
| B002 | 404  | BotNotFound         | 指定 Bot が存在しない     | UUID 誤り・既に終了 |
| B003 | 409  | BotBusy            | Bot が別コマンド処理中    | Mining 中に start 要求 |
| B004 | 422  | NoUsableTool        | 予備ツールなしで耐久0     | Inventory が空 |
| B005 | 503  | ServerOverloaded    | 同時 Bot 数上限を超過     | #US-002 性能制限 |

> 全コードは `error` フィールドで返す。フォーマット例:  
> ```json
> { "error": { "code": "B003", "message": "Bot is already mining" } }