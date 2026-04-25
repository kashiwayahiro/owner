# 目的
物件のオーナーが宿泊予約をするためのサイト

# 制約
- ビルドツール（Vite, Astroなど）は使用しない
- JavaScriptは必要最小限のみ
- Node.js不要
- 完全な静的構成とする

# ディレクトリ構成
- ルートに index.html を配置
- 静的ファイルは assets/ 配下に集約する
  - css, images, js に分割

# パス設計
- 相対パスで記述する
- GitHub Pagesで動作するようにする
- Live Serverでそのまま動作すること

# 要件
- 各ページは単体で表示可能にする
- 共通CSSを使用する
- semantic HTMLを使用する

# 開発体験
- VSCode + Live Serverで保存時に自動リロードされる前提
- index.html からリンク遷移できること


# ページ内容
物件のオーナーが宿泊予約をするためのサイトです。