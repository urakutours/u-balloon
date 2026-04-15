# Resend + u-balloon.com DNS 設定手順書

> 作成日: 2026-04-15  
> 対象: Xserver で管理している u-balloon.com の DNS レコード

---

## 背景と目的

Gmail などの大手 ISP で注文確認メールが迷惑メール判定されている問題の修正。
SPF / DKIM / DMARC の 3 つの認証レコードを正しく設定することで、
配信性（deliverability）を改善し mail-tester.com で 10/10 を目指す。

---

## 現状の DNS（2026-04-15 時点）

| レコード | ホスト | 現在値 | 問題 |
|---------|--------|--------|------|
| SPF | u-balloon.com | `v=spf1 +a:sv14166.xserver.jp +a:u-balloon.com +mx include:spf.sender.xserver.jp ~all` | Resend の include が無い |
| DKIM | resend._domainkey.u-balloon.com | `"p=MIG..."` のみ | `v=DKIM1; k=rsa;` プレフィックスが欠落 |
| DMARC | _dmarc.u-balloon.com | `v=DMARC1; p=none;` | rua が無い（レポート受信不可） |

---

## 修正後の目標

| レコード | ホスト | 修正後値 |
|---------|--------|---------|
| SPF | u-balloon.com | `v=spf1 +a:sv14166.xserver.jp +a:u-balloon.com +mx include:spf.sender.xserver.jp include:_spf.resend.com ~all` |
| DKIM | resend._domainkey.u-balloon.com | **Resend ダッシュボード指示に従う**（CNAME 推奨 or TXT 修正） |
| DMARC | _dmarc.u-balloon.com | `v=DMARC1; p=none; rua=mailto:dmarcreports@u-balloon.com; pct=100;` |

---

## 作業の前に

1. Resend ダッシュボードにログイン: https://resend.com/domains
2. u-balloon.com ドメインの設定画面を開く
3. 表示されている推奨 DNS レコード値を控える（CNAME 方式か TXT 方式かを確認）

---

## Step 1: SPF レコード修正

**ポイント**: Xserver は同一ホスト名に複数 SPF TXT 登録不可。既存レコードに include を追記する形で編集する。

1. Xserver サーバーパネルにログイン: https://secure.xserver.ne.jp/xapanel/login/xserver/server/
2. 「ドメイン」タブ → 対象ドメイン `u-balloon.com` の「DNSレコード設定」
3. 既存の SPF TXT レコード（`v=spf1 ...`）を編集
4. 修正後の値:
   ```
   v=spf1 +a:sv14166.xserver.jp +a:u-balloon.com +mx include:spf.sender.xserver.jp include:_spf.resend.com ~all
   ```
5. 保存

**注意**: Xserver にビルトイン SPF 設定機能があれば、そちらとの二重登録を避ける

---

## Step 2: DKIM レコード修正

### 方式の選択

- Resend ダッシュボードが CNAME を指示している場合: **方式 A**
- Resend ダッシュボードが TXT を指示している場合: **方式 B**

### 方式 A: CNAME に切り替え（推奨）

1. 既存の `resend._domainkey.u-balloon.com` TXT レコードを削除
2. 新規 CNAME レコードを追加:
   ```
   ホスト名: resend._domainkey
   種別: CNAME
   内容: resend._domainkey.resend.com
   ```

### 方式 B: TXT を修正

1. 既存の `resend._domainkey.u-balloon.com` TXT レコードを編集
2. 修正後の値（`v=DKIM1; k=rsa;` を先頭に追加）:
   ```
   v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDJp2qmyTN9YasVMzGgQtnhRGtN5VH9Wxx2mM8FiVfb/VfwgVea3IvNZcBfYvuclblQ3DkTK+RnQt4vxkhswGpskTl8Sml/Pibct4Fn6QGqceytcJgfT7SB/gAWAntpziXKiqRA1bvaT3MNTlvRbm3lX4xXOD3YM9eSYBs08v+4+wIDAQAB
   ```

---

## Step 3: DMARC 強化（任意、推奨）

1. Xserver DNS 設定で `_dmarc.u-balloon.com` の TXT レコードを編集
2. 修正後の値:
   ```
   v=DMARC1; p=none; rua=mailto:dmarcreports@u-balloon.com; pct=100; aspf=r; adkim=r
   ```
3. `dmarcreports@u-balloon.com` が受信可能なメールアドレスであることを確認

**段階的強化のロードマップ**:
- 初期（現行）: `p=none` — 監視のみ
- 中期（本番切替 1〜2 週間後、迷惑判定なしが継続したら）: `p=quarantine; pct=25`
- 本番（さらに 1 ヶ月後）: `p=quarantine; pct=100` または `p=reject`

---

## Step 4: Resend ダッシュボードで再検証

1. https://resend.com/domains で u-balloon.com の画面を開く
2. 各レコード（SPF / DKIM / DMARC）の横に「Verify」または更新ボタンがあれば押す
3. 全項目が「Verified」になることを確認
4. 反映しない場合は 15〜30 分待って再試行

---

## Step 5: 反映確認コマンド

```bash
# SPF
dig TXT u-balloon.com +short
# 期待: include:_spf.resend.com が含まれる

# DKIM
dig TXT resend._domainkey.u-balloon.com +short
# 期待: v=DKIM1; k=rsa; p=... から始まる（TXT 方式の場合）
# または
dig CNAME resend._domainkey.u-balloon.com +short
# 期待: resend._domainkey.resend.com（CNAME 方式の場合）

# DMARC
dig TXT _dmarc.u-balloon.com +short
# 期待: v=DMARC1; p=none; rua=mailto:...
```

Windows の場合:

```
nslookup -type=TXT u-balloon.com 8.8.8.8
nslookup -type=TXT resend._domainkey.u-balloon.com 8.8.8.8
nslookup -type=TXT _dmarc.u-balloon.com 8.8.8.8
```

---

## Step 6: 配信性テスト

1. https://www.mail-tester.com/ を開く
2. 画面に表示される専用アドレス（例: `test-xxxxx@mail-tester.com`）をコピー
3. u-balloon で新規注文し、その専用アドレスに確認メールを送信（テスト顧客として登録）
4. mail-tester に戻って「Then check your score」を押す
5. 10/10 を目指す
6. 減点項目が出たら、項目ごとに確認してドキュメント末尾のトラブルシューティングを参照

---

## 反映タイムライン

- **DNS 反映**: Xserver は通常 15〜60 分、最大 24 時間
- **Resend Verify**: DNS 反映後数分
- **本番切替（2026-04-25）前に完了**: Step 1〜4 は必須、Step 5〜6 は反映確認のため必須

---

## 追加推奨対策（本番切替後）

### サブドメイン分離

送信ドメインを `noreply@send.u-balloon.com` に移行することで:
- ルートドメインの迷惑メール判定リスクから隔離
- Resend のベストプラクティス準拠

実施時は別途 Resend ダッシュボードで `send` サブドメインを追加し、
u-balloon の `FROM` アドレスを `noreply@send.u-balloon.com` に変更する。

### DMARC ポリシー段階強化

Step 3 のロードマップ参照。

---

## トラブルシューティング

### Gmail で依然として迷惑判定される

- mail-tester.com のスコア詳細を確認
- From ドメインと SPF の `include` ドメインが一致しているか
- メール本文に HTML/テキスト両方が含まれているか
- 過去の送信履歴（バウンス率）が悪影響を与えている可能性。Resend 統計で確認

### mail-tester で減点

- **SPF: softfail**: `~all` を `-all` に変更（厳格化）。ただし hardfail にするとミスした時にすべて reject されるので慎重に
- **DKIM: failed**: 公開鍵の不一致。Resend ダッシュボードの値を再度コピーして上書き
- **DMARC: alignment**: From ドメインと DKIM/SPF ドメインの整合性問題。サブドメイン分離を検討

### Resend が Verified にならない

- DNS 反映を待つ（最大 24 時間）
- Xserver のキャッシュが残っている場合、数時間後に再試行
- レコード値に余分な引用符や空白がないか確認

---

## 関連リンク

- Resend 公式ドキュメント: https://resend.com/docs/dashboard/domains/introduction
- DMARC 解説: https://resend.com/docs/dashboard/domains/dmarc
- Xserver DNS マニュアル: https://www.xserver.ne.jp/manual/man_domain_dns_setting.php
- mail-tester: https://www.mail-tester.com/
- MX Toolbox: https://mxtoolbox.com/
