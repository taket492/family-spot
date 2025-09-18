# Changelog

## [1.0.0](https://github.com/taket492/family-spot/compare/v0.1.0...v1.0.0) (2025-09-18)


### ⚠ BREAKING CHANGES

* **spots:** 緯度・経度・市区の手入力は不要になりました。住所から自動解決できない場合は登録エラーを返します。

### Features

* **admin:** add protected API route to run DB optimization (GIN + trigram indexes) on Vercel with ADMIN_OPS_TOKEN ([713e63e](https://github.com/taket492/family-spot/commit/713e63e72531d367ea298615acc6874adeae57d8))
* **auth:** enhance security and production readiness ([907558e](https://github.com/taket492/family-spot/commit/907558e440abbd0e34e85c3e3291906d60d5abaf))
* **auth:** implement complete authentication system with NextAuth.js ([2c1d508](https://github.com/taket492/family-spot/commit/2c1d508e60f7450f30c691ab6de3057edcf1e02d))
* **auth:** implement role-based record deletion system ([e22194e](https://github.com/taket492/family-spot/commit/e22194e4456fc3edc6a6f0f27854e4cd788ed72c))
* **auth:** restore database authentication with enhanced logging ([c9646e0](https://github.com/taket492/family-spot/commit/c9646e04141eedf26fe308cf8fadc23bb659a3b0))
* **events:** add Event model, /api/events endpoints, search page Events mode with list/map, and event detail page; map color for events ([6262dbd](https://github.com/taket492/family-spot/commit/6262dbd97cd6ce151c0a093ec77f34edb8ae3990))
* **events:** CSV importer, scheduled sync workflow, and docs; add event sources config ([094e9c0](https://github.com/taket492/family-spot/commit/094e9c05c2da18af5d5149ba5e4aa7716d906d6c))
* **families:** add top page navigation buttons to family management screens ([f386800](https://github.com/taket492/family-spot/commit/f3868008935d28f3a2336da568b46a324f33b286))
* **families:** implement family visit sharing system ([55afa98](https://github.com/taket492/family-spot/commit/55afa9844e0e50c951f04726657149c4df5bb246))
* **home,search:** トップにイベント枠を追加し、検索でkind=eventsならイベントタブを初期表示 ([74e96c6](https://github.com/taket492/family-spot/commit/74e96c6565e9c9cf371ef54f7ff3f325da377596))
* **pwa:** add web app manifest, service worker registration, iOS meta; basic SW caching; document A2HS steps ([0d893f3](https://github.com/taket492/family-spot/commit/0d893f39cc9cd02094b81200d1d6788021ed45ff))
* **search:** modernize search and category pages with enhanced UI/UX ([d721abe](https://github.com/taket492/family-spot/commit/d721abed8629389d4fdf9493da8d8c1d5b150966))
* **spots:** add image upload functionality to spot detail pages ([b57d1d3](https://github.com/taket492/family-spot/commit/b57d1d3f4067694f3e532a09152619a9dd308e6b))
* **spots:** enhance detail page with optimized image gallery ([c17f688](https://github.com/taket492/family-spot/commit/c17f688a6f7981c5e08198bc266a8a146484a040))
* **spots:** URL入力を追加し、住所からの自動ジオコーディングで緯度・経度を補完 ([70421e8](https://github.com/taket492/family-spot/commit/70421e8fe9899f3f93f5043590ad5fc4011f6374))
* **spots:** ジオコーディング失敗時も登録を許可（lat/lngを任意化）\n\n- Prisma: Spot.lat/lng を nullable に\n- API: geocoding失敗でも lat/lng=null で作成\n- 検索/地図: lat/lng欠損の項目を安全にフィルタリング\n- 詳細: lat/lngが無い場合は住所検索で地図リンクを生成 ([918f8df](https://github.com/taket492/family-spot/commit/918f8df475a44e987cc879e34d60bd8bbd74a3e5))
* **sync:** ICS(ical)ソースに対応（GEOと日付を解析、cityはソース指定で補完） ([82f97c1](https://github.com/taket492/family-spot/commit/82f97c141b1f30127f422ef62f769779eab61f81))
* **sync:** イベント自動取得でJSONソースをサポート（CSVと同等フィールド想定）\n\n- sources: type=json を追加し、配列レコードを取り込み可能に\n- example: JSON例を追加 ([477050b](https://github.com/taket492/family-spot/commit/477050b8b87c71a9396ac1a3ac780d7b9c8e9698))
* **ui:** enhance UI/UX with modern design system ([fac4a77](https://github.com/taket492/family-spot/commit/fac4a774712b671bd60bab9a751abe257ffe7f6b))
* **ui:** イベント機能を一時非表示に変更（ホームのイベント/ウェブ情報、検索のイベント欄） ([cf5877b](https://github.com/taket492/family-spot/commit/cf5877b689d60228921095d97b8129e0e3833913))
* **visits:** implement visit tracking system with status markers ([65cdfab](https://github.com/taket492/family-spot/commit/65cdfabd7255b4d4f0ff6e639fa38afc7d4731a1))
* **websearch:** Web検索APIとホームの検索結果表示を追加（Google CSE/Bing対応）\n\n- API: /api/websearch?q=... で検索結果を取得（件数最大10）\n- Provider: SEARCH_PROVIDER=google|bing、各APIキーを.envで設定\n- Home: 『Webのイベント情報（静岡・今週末）』を5件表示＋Googleリンク ([30cc1f7](https://github.com/taket492/family-spot/commit/30cc1f78b4dbdc2bd3d414f1a5b7893a6aa9127e))


### Bug Fixes

* **auth:** improve login redirect reliability ([048c54b](https://github.com/taket492/family-spot/commit/048c54becc8801a7c4c1a907cd2028da6f62241e))
* **auth:** improve login redirect to home page ([339cbb4](https://github.com/taket492/family-spot/commit/339cbb4c6d6a8a58c12864acb27afa71c57b9d1e))
* **auth:** resolve NextAuth 500 configuration error ([3b504fc](https://github.com/taket492/family-spot/commit/3b504fcdaa37ecc79d762cbaff14e104fe905544))
* **auth:** resolve NEXTAUTH_SECRET configuration error ([6b4d298](https://github.com/taket492/family-spot/commit/6b4d2989829fa384d683ecdea84dfb54b86c8741))
* **auth:** resolve TypeScript type errors and improve Tailwind CSS classes ([c0dc414](https://github.com/taket492/family-spot/commit/c0dc414531a863312b23447e7d2629243be891c2))
* **auth:** simplify NextAuth configuration to resolve 500 errors ([f45a46e](https://github.com/taket492/family-spot/commit/f45a46e68402f7c745207c4f5735e29b369dd6f1))
* **config:** remove unsupported quality option from Next.js images config ([a012eba](https://github.com/taket492/family-spot/commit/a012eba147007e0379bb1363bf7ff225a22d2e02))
* **db-opt:** auto-detect tsvector column name (search_vector vs searchVector) before creating indexes ([f3135a5](https://github.com/taket492/family-spot/commit/f3135a5b1e8de8fa18398675ed057d12a110b42f))
* **families:** resolve family invitation code functionality issues ([a3858cc](https://github.com/taket492/family-spot/commit/a3858cc5e2efd280379c6062a27b079a0cd213ec))
* **families:** resolve Prisma connection and API validation issues ([06533d5](https://github.com/taket492/family-spot/commit/06533d59b0bd648598fdae61e36e3d9fdc8bf013))
* **images:** render fill images without extra wrapper so they size correctly; add favicon and mobile-web-app meta; link icon to avoid 404 ([6a44885](https://github.com/taket492/family-spot/commit/6a44885aed26b43aa9114132b3a15cdfe6019511))
* **map:** avoid SSR import of maplibre by dynamically importing Map component (ssr:false) to prevent client-side exception in production ([1419c5d](https://github.com/taket492/family-spot/commit/1419c5de773536c8750d7d886998bfbed15122f8))
* **pwa:** send credentials when fetching web manifest to avoid 401 on protected preview deployments (Vercel preview protection) ([aa2e254](https://github.com/taket492/family-spot/commit/aa2e254e35f0b22cc86003b74f7d0969398c2eb7))
* resolve build errors and improve code quality ([ca84dbb](https://github.com/taket492/family-spot/commit/ca84dbb0319bf4eba7fd6343c27c38e26f7b3b12))
* resolve TypeScript compilation errors and build issues ([ae3b57d](https://github.com/taket492/family-spot/commit/ae3b57da658abffaa1953085d30d1b06115ec9eb))
* **search:** resolve syntax error in JSX comment ([01eae13](https://github.com/taket492/family-spot/commit/01eae13efb31f8d8c4170cc56dfa1c19902bdf31))
* Skeletonコンポーネント追加でビルドエラー解決 ([2a89152](https://github.com/taket492/family-spot/commit/2a89152f47f8c2b917f250a34a8d11eb26426ad7))
* **visits:** improve visit tracking functionality and UI ([d5654f9](https://github.com/taket492/family-spot/commit/d5654f9b0100cef23501133f4eeaf50dac4ad23a))


### Performance Improvements

* **db:** add optimization script to create GIN and trigram indexes for faster search (Spot/Event) ([847b5df](https://github.com/taket492/family-spot/commit/847b5df4e4dd4110f747c692658b1c01ee17dfed))
* **families:** optimize family management screens performance ([39f347b](https://github.com/taket492/family-spot/commit/39f347b91003092192db97d428768cfaac1ffe5b))
* **images:** implement comprehensive image optimization ([76c8523](https://github.com/taket492/family-spot/commit/76c85235d7997f3f5e52e69521e038627b955fc7))
* implement comprehensive bundle and image optimization ([8f53640](https://github.com/taket492/family-spot/commit/8f536404ebbe8a73f69950de04ac85e5d2c35611))
* implement comprehensive performance optimization system ([6631610](https://github.com/taket492/family-spot/commit/6631610bc660a295909c948c7bea8949255290a8))
* **search:** optimize restaurant search performance with dedicated indexes and query paths ([9e5b5a4](https://github.com/taket492/family-spot/commit/9e5b5a4024a66e1d957f7bc60665ba00f72b0778))
* **search:** PostgreSQL全文検索による検索機能の大幅最適化 ([9226834](https://github.com/taket492/family-spot/commit/9226834d8f1087d872bda9b9749945a486446c32))
* **search:** use server full-text search in GSSP and add client-side shallow search to avoid SSR roundtrips; disable Link prefetch to reduce network chatter ([18af325](https://github.com/taket492/family-spot/commit/18af325cff206b2ad0afc68ab8b797e587951f29))
* **search:** レストランの特徴タグ検索を高速化 (FTS回避 + type=restaurant + tags AND フィルタ) ([5d3cc02](https://github.com/taket492/family-spot/commit/5d3cc02fe1d113d37b7ef2f95c06cc5d3a63b79f))
