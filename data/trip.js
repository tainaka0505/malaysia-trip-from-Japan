/* 旅の日程データ
   items の type: move(移動) / see(観光) / eat(食事) / stay(宿) / fly(飛行機) / note(メモ)
   spot: data/spots.js の id を書くと、その観光地の詳細に飛べる
   train: ETSの列車番号を書くと、時刻表に飛べる
   status: "booked"（予約済み）/ "plan"（未予約・候補） */
App.data.trip = {
  name: "マレーシア 7泊9日",
  start: "2027-02-23",
  end: "2027-03-03",
  route: ["ペナン", "タイピン", "イポー", "マラッカ", "クアラルンプール"],
  flights: [
    {
      dir: "行き", date: "2027-02-23", status: "plan",
      airline: "スクート（シンガポール乗り継ぎ）", no: "TR",
      from: "関西 11:30", to: "ペナン 21:20",
      price: "37,677円＋荷物代（20kg）",
      note: "候補。香港エクスプレス（15:15発→翌0:05着、36,770円＋荷物約13,300円）でも可。エアアジアのセールで荷物込み3.5万円以下なら乗り換え。",
    },
    {
      dir: "帰り", date: "2027-03-02", status: "plan",
      airline: "バティック・エア（直行便）", no: "OD",
      from: "クアラルンプール 23:00", to: "関西 6:25（3/3）",
      price: "33,302円（Super Saver）／約4万円（Value・20kg付き）",
      note: "候補。3/1と3/3は運航なし。空港には20:30までに着く。",
    },
  ],
  days: [
    {
      date: "2027-02-23", area: "ペナン", title: "出発、ペナンへ", stay: "ジョージタウン",
      items: [
        { time: "08:30", type: "move", text: "関西空港に到着（出発3時間前）。MDACの控えを用意" },
        { time: "11:30", type: "fly", text: "関西 → シンガポール乗り継ぎ → ペナン" },
        { time: "21:20", type: "fly", text: "ペナン空港に到着。SIMを有効化、両替は少しだけ" },
        { time: "22:00", type: "move", text: "Grabでジョージタウンのホテルへ（約30〜40分、RM30前後）" },
      ],
      notes: "夜遅い到着なので、ホテルは24時間チェックインできる所に。",
    },
    {
      date: "2027-02-24", area: "ペナン", title: "ジョージタウン街歩き", stay: "ジョージタウン",
      items: [
        { time: "09:00", type: "eat", text: "朝ごはんにワンタンミーかトーストとコピ（コーヒー）" },
        { time: "10:00", type: "see", text: "世界遺産地区：壁画アート、クーコンシー、アルメニアン通り", spot: "georgetown" },
        { time: "14:00", type: "see", text: "クランジェッティ（水上の家）、ブルーマンション", spot: "georgetown" },
        { time: "18:30", type: "eat", text: "ガーニードライブの屋台街でチャークイティオ、福建麺", spot: "gurney" },
      ],
      notes: "この日はペナン州の祝日（ヌズル・アルクルアーン、予定）。一部の役所・マレー系の店が休み。",
    },
    {
      date: "2027-02-25", area: "ペナン", title: "ペナンヒルと島の裏側", stay: "ジョージタウン",
      items: [
        { time: "08:30", type: "move", text: "Rapid Penang 204番バスでエアイタムへ（約40分）" },
        { time: "09:00", type: "see", text: "極楽寺（ケッ・ロッ・シー）", spot: "keklok" },
        { time: "11:00", type: "see", text: "ペナンヒル（ケーブルカーで山頂へ）", spot: "penanghill" },
        { time: "14:00", type: "move", text: "Grabでバリックプラウへ（約30分）" },
        { time: "14:30", type: "see", text: "バリックプラウの果樹園と村。ナツメグジュース", spot: "balikpulau" },
        { time: "19:00", type: "eat", text: "ニューレーン屋台街 or ペナンロードのチェンドル" },
      ],
    },
    {
      date: "2027-02-26", area: "タイピン・クアラスプタン", title: "電車で南へ、マングローブの漁村", stay: "イポー",
      items: [
        { time: "07:00", type: "move", text: "ホテル → フェリー乗り場（ジョージタウン側）へ" },
        { time: "07:20", type: "move", text: "フェリーでバタワースへ（約15分、RM2）" },
        { time: "07:50", type: "move", text: "ETS EG9343 バタワース 7:50 → タイピン 8:49", train: "EG9343" },
        { time: "09:30", type: "move", text: "Grabでクアラスプタンへ（約20分）" },
        { time: "10:00", type: "see", text: "炭焼き工場、マングローブの遊歩道、漁村", spot: "sepetang" },
        { time: "12:30", type: "eat", text: "クアラスプタンの中華系海鮮で昼ごはん", spot: "sepetang" },
        { time: "15:00", type: "see", text: "タイピンの湖の公園（レイクガーデン）", spot: "taiping" },
        { time: "17:01", type: "move", text: "ETS EP9133 タイピン 17:01 → イポー 17:46", train: "EP9133" },
        { time: "19:00", type: "eat", text: "イポーで芽菜鶏（もやしと茹で鶏）", spot: "ipoh" },
      ],
      notes: "大きな荷物はチャーター車に積むと楽。1日貸切ならこの日（約1〜1.5万円/台）。",
    },
    {
      date: "2027-02-27", area: "イポー → マラッカ", title: "川エビの昼ごはん、夜はマラッカ", stay: "マラッカ",
      items: [
        { time: "08:00", type: "eat", text: "イポー旧市街でホワイトコーヒーと点心", spot: "ipoh" },
        { time: "09:30", type: "see", text: "旧市街の壁画、コンキュバイン・レーン、洞窟寺", spot: "ipoh" },
        { time: "11:30", type: "move", text: "Grabでタンジュントゥアランへ（約40分）" },
        { time: "12:00", type: "eat", text: "大頭蝦（川エビ）の昼ごはん。錫採掘船TT5も見学", spot: "tualang" },
        { time: "14:00", type: "move", text: "Grabでイポー駅へ戻る" },
        { time: "15:10", type: "move", text: "ETS EG9449 イポー 15:10 → プラウスバン 19:45", train: "EG9449" },
        { time: "19:50", type: "move", text: "Grabでマラッカ市内へ（約30〜40分）" },
        { time: "21:00", type: "see", text: "ジョンカー通りの夜市（土曜の夜）", spot: "jonker" },
      ],
      notes: "プラウスバン駅からマラッカ市内へは便利なバスがないので、Grabが前提。",
    },
    {
      date: "2027-02-28", area: "マラッカ → KL", title: "マラッカ観光、KLへ", stay: "クアラルンプール",
      items: [
        { time: "08:30", type: "eat", text: "チキンライスボールかニョニャ料理", spot: "melaka" },
        { time: "09:30", type: "see", text: "オランダ広場、セントポールの丘、ババ・ニョニャ博物館", spot: "melaka" },
        { time: "13:00", type: "move", text: "バス マラッカ・セントラル → KLのTBS（約2時間、RM12〜20）" },
        { time: "16:00", type: "move", text: "KLのホテルにチェックイン" },
        { time: "18:30", type: "eat", text: "ラマダン・バザール or ジャラン・アロー屋台街", spot: "jalanalor" },
      ],
    },
    {
      date: "2027-03-01", area: "クアラルンプール", title: "KL市内", stay: "クアラルンプール",
      items: [
        { time: "08:00", type: "move", text: "KTMコミューターでバトゥ洞窟へ（KLセントラルから約30分）" },
        { time: "08:30", type: "see", text: "バトゥ洞窟（272段の階段）。朝の涼しいうちに", spot: "batucaves" },
        { time: "12:00", type: "see", text: "ムルデカ広場、セントラルマーケット、チャイナタウン", spot: "kl-old" },
        { time: "18:00", type: "see", text: "ペトロナス・ツインタワーとKLCC公園の噴水ショー", spot: "klcc" },
        { time: "", type: "note", text: "オプション：夕方発のホタル観賞ツアー（クアラセランゴール）", spot: "fireflies" },
      ],
    },
    {
      date: "2027-03-02", area: "セランゴール", title: "田んぼと港町、夜に帰国便", stay: "機内泊",
      items: [
        { time: "08:00", type: "move", text: "チャーター車でスキンチャンへ（約2時間）。荷物ごと積んで出発" },
        { time: "10:00", type: "see", text: "スキンチャンの田んぼと漁村、願い事の浜", spot: "sekinchan" },
        { time: "12:30", type: "eat", text: "スキンチャンの海鮮で昼ごはん", spot: "sekinchan" },
        { time: "15:30", type: "eat", text: "クランでバクテー（肉骨茶）", spot: "klang" },
        { time: "18:30", type: "move", text: "クアラルンプール国際空港（KLIA）へ（クランから約1時間）" },
        { time: "23:00", type: "fly", text: "バティック・エア KLIA → 関西（翌6:25着）" },
      ],
      notes: "チャーター車は1日貸切で約1〜1.5万円/台。最後に空港まで送ってもらう。",
    },
    {
      date: "2027-03-03", area: "日本", title: "帰国", stay: "",
      items: [{ time: "06:25", type: "fly", text: "関西空港に到着" }],
    },
  ],
};
