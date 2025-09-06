# Changelog

## [0.2.0](https://github.com/taket492/family-spot/compare/v0.1.0...v0.2.0) (2025-09-06)


### Features

* **events:** add Event model, /api/events endpoints, search page Events mode with list/map, and event detail page; map color for events ([6262dbd](https://github.com/taket492/family-spot/commit/6262dbd97cd6ce151c0a093ec77f34edb8ae3990))
* **events:** CSV importer, scheduled sync workflow, and docs; add event sources config ([094e9c0](https://github.com/taket492/family-spot/commit/094e9c05c2da18af5d5149ba5e4aa7716d906d6c))
* **home,search:** トップにイベント枠を追加し、検索でkind=eventsならイベントタブを初期表示 ([74e96c6](https://github.com/taket492/family-spot/commit/74e96c6565e9c9cf371ef54f7ff3f325da377596))
* **pwa:** add web app manifest, service worker registration, iOS meta; basic SW caching; document A2HS steps ([0d893f3](https://github.com/taket492/family-spot/commit/0d893f39cc9cd02094b81200d1d6788021ed45ff))
* **sync:** ICS(ical)ソースに対応（GEOと日付を解析、cityはソース指定で補完） ([82f97c1](https://github.com/taket492/family-spot/commit/82f97c141b1f30127f422ef62f769779eab61f81))
* **sync:** イベント自動取得でJSONソースをサポート（CSVと同等フィールド想定）\n\n- sources: type=json を追加し、配列レコードを取り込み可能に\n- example: JSON例を追加 ([477050b](https://github.com/taket492/family-spot/commit/477050b8b87c71a9396ac1a3ac780d7b9c8e9698))
* **ui:** イベント機能を一時非表示に変更（ホームのイベント/ウェブ情報、検索のイベント欄） ([cf5877b](https://github.com/taket492/family-spot/commit/cf5877b689d60228921095d97b8129e0e3833913))
* **websearch:** Web検索APIとホームの検索結果表示を追加（Google CSE/Bing対応）\n\n- API: /api/websearch?q=... で検索結果を取得（件数最大10）\n- Provider: SEARCH_PROVIDER=google|bing、各APIキーを.envで設定\n- Home: 『Webのイベント情報（静岡・今週末）』を5件表示＋Googleリンク ([30cc1f7](https://github.com/taket492/family-spot/commit/30cc1f78b4dbdc2bd3d414f1a5b7893a6aa9127e))


### Bug Fixes

* **map:** avoid SSR import of maplibre by dynamically importing Map component (ssr:false) to prevent client-side exception in production ([1419c5d](https://github.com/taket492/family-spot/commit/1419c5de773536c8750d7d886998bfbed15122f8))
