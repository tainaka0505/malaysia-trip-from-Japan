/* 旅の日程データ
   items の type: move(移動) / see(観光) / eat(食事) / stay(宿) / fly(飛行機) / note(メモ)
   spot: data/spots.js の id を書くと、その観光地の詳細に飛べる
   train: ETSの列車番号を書くと、時刻表に飛べる
   status: "booked"（予約済み）/ "plan"（未予約・候補） */
App.data.trip = {
  name: "マレーシア 8泊10日",
  start: "2027-02-26",
  end: "2027-03-07",
  route: ["ペナン", "タイピン", "イポー", "マラッカ", "クアラルンプール"],
  flights: [
    {
      dir: "行き", date: "2027-02-26", status: "booked",
      airline: "エアアジアX＋エアアジア（KL乗り継ぎ・通しの予約）", no: "D7 533 / AK 6128",
      from: "関西 T1 11:00", to: "ペナン 20:50",
      price: "24,600円（1人）",
      note: "D7 533 関西 11:00 → KL（KLIA2）17:30。乗り継ぎ2時間15分。AK 6128 KL 19:45 → ペナン 20:50。荷物はペナンまで通しなので、KLで受け取らない。",
    },
    {
      dir: "帰り", date: "2027-03-07", status: "plan",
      airline: "エアアジアX（直行便）", no: "D7 532",
      from: "クアラルンプール（KLIA2） 2:20", to: "関西 9:40ごろ",
      price: "約38,000円（10/13時点・荷物別）",
      note: "候補。3/6（土）の夜にKLを出る深夜便なので、予約の日付は3/7。バティック（23:00発）は火・木・日だけで、3/6は飛ばない。セールを待って決める。",
    },
  ],
  days: [
    {
      date: "2027-02-26", area: "ペナン", title: "出発、ペナンへ", stay: "ジョージタウン（安い宿）",
      items: [
        { time: "08:00", type: "move", text: "関西空港 第1ターミナルに到着（出発3時間前）。MDACの控えを用意" },
        { time: "11:00", type: "fly", text: "エアアジアX D7 533 関西 → KL（KLIA2）17:30着" },
        { time: "19:45", type: "fly", text: "エアアジア AK 6128 KL → ペナン。荷物は通しなのでKLで受け取らない" },
        { time: "20:50", type: "fly", text: "ペナン空港に到着。SIMを有効化、両替は少しだけ" },
        { time: "21:30", type: "move", text: "Grabでジョージタウンの宿へ（約30〜40分、RM30前後）" },
      ],
      notes: "宿に着くのは22時すぎ。予約したら「22時すぎに着く」と宿にメッセージを送っておく。",
    },
    {
      date: "2027-02-27", area: "ペナン", title: "ジョージタウン街歩き、午後はビーチリゾート", stay: "パークロイヤル・ペナン・リゾート",
      items: [
        { time: "08:30", type: "eat", text: "朝ごはんにワンタンミーかトーストとコピ（コーヒー）" },
        { time: "09:30", type: "see", text: "世界遺産地区：壁画アート、クーコンシー、クランジェッティ（水上の家）", spot: "georgetown" },
        { time: "12:30", type: "move", text: "宿で荷物を受け取り、Grabでバトゥ・フェリンギへ（約30〜40分）" },
        { time: "15:00", type: "stay", text: "パークロイヤルにチェックイン。プール、ウォーターパーク、浜辺" },
        { time: "18:45", type: "see", text: "浜辺のサンセットバーで夕日" },
        { time: "20:00", type: "eat", text: "ホテル前のバトゥ・フェリンギ夜市", spot: "batuferringhi" },
      ],
      notes: "パークロイヤルはExpediaで2人1室24,233円（10/14時点）。一番安いスーペリアルームでも朝食ビュッフェを無料で付けられる。2/24より前ならキャンセル無料。",
    },
    {
      date: "2027-02-28", area: "ペナン", title: "リゾートの朝、極楽寺とペナンヒル", stay: "ジョージタウン（安い宿）",
      items: [
        { time: "07:00", type: "eat", text: "朝食ビュッフェ（混む前の6:30〜7:30がおすすめ）。そのあとプールと浜辺" },
        { time: "12:00", type: "move", text: "チェックアウト。Grabでジョージタウンの宿へ行き、荷物を置く" },
        { time: "14:00", type: "see", text: "極楽寺（ケッ・ロッ・シー）", spot: "keklok" },
        { time: "16:00", type: "see", text: "ペナンヒル（ケーブルカーで山頂へ、夕方〜夜景）", spot: "penanghill" },
        { time: "20:00", type: "eat", text: "ガーニードライブの屋台街でチャークイティオ、福建麺", spot: "gurney" },
      ],
    },
    {
      date: "2027-03-01", area: "タイピン・クアラスプタン → イポー", title: "電車で南へ、夜は岩山の湖のリゾート", stay: "TUI BLUE ザ・ヘイブン（イポー・タンブン）",
      items: [
        { time: "07:00", type: "move", text: "宿 → フェリー乗り場（ジョージタウン側）へ" },
        { time: "07:20", type: "move", text: "フェリーでバタワースへ（約15分、RM2）" },
        { time: "07:50", type: "move", text: "ETS EG9343 バタワース 7:50 → タイピン 8:49", train: "EG9343" },
        { time: "09:30", type: "move", text: "Grabでクアラスプタンへ（約20分）" },
        { time: "10:00", type: "see", text: "炭焼き工場、マングローブの遊歩道、漁村", spot: "sepetang" },
        { time: "12:30", type: "eat", text: "クアラスプタンの中華系海鮮で昼ごはん", spot: "sepetang" },
        { time: "15:00", type: "see", text: "タイピンの湖の公園（レイクガーデン）", spot: "taiping" },
        { time: "17:01", type: "move", text: "ETS EP9133 タイピン 17:01 → イポー 17:46", train: "EP9133" },
        { time: "18:00", type: "eat", text: "イポーで芽菜鶏（もやしと茹で鶏）", spot: "ipoh" },
        { time: "19:30", type: "stay", text: "GrabでTUI BLUE ザ・ヘイブンへ（約15分）。チェックイン" },
      ],
      notes: "TUI BLUEはExpediaで2人1室19,647円・2人分の朝食付き（湖側のデラックス・スイート、10/14時点）。「一部返金可」のプラン。",
    },
    {
      date: "2027-03-02", area: "イポー → マラッカ", title: "湖の朝、川エビの昼ごはん、夜はマラッカ", stay: "マラッカ",
      items: [
        { time: "07:30", type: "eat", text: "TUI BLUEで朝ごはん。湖と岩山を見ながらインフィニティプール" },
        { time: "11:00", type: "move", text: "チェックアウト。Grabでタンジュントゥアランへ（約40〜50分）" },
        { time: "12:00", type: "eat", text: "大頭蝦（川エビ）の昼ごはん。錫採掘船TT5も見学", spot: "tualang" },
        { time: "14:00", type: "move", text: "Grabでイポー駅へ" },
        { time: "15:10", type: "move", text: "ETS EG9449 イポー 15:10 → プラウスバン 19:45", train: "EG9449" },
        { time: "19:50", type: "move", text: "Grabでマラッカ市内へ（約30〜40分）" },
        { time: "21:00", type: "see", text: "マラッカ川ナイトクルーズ（ジョンカー通りの夜市は金〜日だけなので、この日はない）", spot: "rivercruise" },
      ],
      notes: "プラウスバン駅からマラッカ市内へは便利なバスがないので、Grabが前提。",
    },
    {
      date: "2027-03-03", area: "マラッカ → KL", title: "マラッカ観光、KLへ", stay: "クアラルンプール",
      items: [
        { time: "08:30", type: "eat", text: "チキンライスボールかニョニャ料理", spot: "melaka" },
        { time: "09:30", type: "see", text: "オランダ広場、セントポールの丘、ババ・ニョニャ博物館", spot: "melaka" },
        { time: "13:00", type: "move", text: "バス マラッカ・セントラル → KLのTBS（約2時間、RM12〜20）" },
        { time: "16:00", type: "move", text: "KLのホテルにチェックイン" },
        { time: "18:30", type: "eat", text: "ラマダン・バザール or ジャラン・アロー屋台街", spot: "jalanalor" },
      ],
    },
    {
      date: "2027-03-04", area: "クアラルンプール", title: "KL市内", stay: "クアラルンプール",
      items: [
        { time: "08:00", type: "move", text: "KTMコミューターでバトゥ洞窟へ（KLセントラルから約30分）" },
        { time: "08:30", type: "see", text: "バトゥ洞窟（272段の階段）。朝の涼しいうちに", spot: "batucaves" },
        { time: "12:00", type: "see", text: "ムルデカ広場、セントラルマーケット、チャイナタウン", spot: "kl-old" },
        { time: "18:00", type: "see", text: "ペトロナス・ツインタワーとKLCC公園の噴水ショー", spot: "klcc" },
      ],
    },
    {
      date: "2027-03-05", area: "セランゴール", title: "田んぼと港町、夜はホタル", stay: "クアラルンプール",
      items: [
        { time: "08:00", type: "move", text: "チャーター車でスキンチャンへ（約2時間）" },
        { time: "10:00", type: "see", text: "スキンチャンの田んぼと漁村、願い事の浜", spot: "sekinchan" },
        { time: "12:30", type: "eat", text: "スキンチャンの海鮮で昼ごはん", spot: "sekinchan" },
        { time: "15:30", type: "eat", text: "クランでバクテー（肉骨茶）", spot: "klang" },
        { time: "19:30", type: "see", text: "オプション：クアラセランゴールのホタル", spot: "fireflies" },
        { time: "21:30", type: "move", text: "KLのホテルへ戻る" },
      ],
      notes: "チャーター車は1日貸切で約1〜1.5万円/台。ホタルは帰りに寄ってもらう（回る順番は運転手と相談）。",
    },
    {
      date: "2027-03-06", area: "クアラルンプール", title: "最終日、深夜の便で帰国", stay: "機内泊",
      items: [
        { time: "10:00", type: "see", text: "プトラジャヤのピンクモスク（KLから車で約40分）", spot: "putrajaya" },
        { time: "12:00", type: "move", text: "KLに戻ってチェックアウト（荷物はフロントに預ける）" },
        { time: "14:00", type: "see", text: "買い物・天后宮など、行き残した所" },
        { time: "19:00", type: "eat", text: "最後の晩ごはん" },
        { time: "22:00", type: "move", text: "荷物を受け取り、KLIA2へ（KLセントラルから空港特急で約35分）" },
      ],
      notes: "帰りの便は3/7 深夜2:20発（エアアジアX、未予約）。空港には23:30ごろまでに着く。ピンクモスクは午前中がおすすめ（礼拝の時間は入れない）。",
    },
    {
      date: "2027-03-07", area: "日本", title: "帰国", stay: "",
      items: [
        { time: "02:20", type: "fly", text: "エアアジアX D7 532 KLIA2 → 関西（候補・未予約）" },
        { time: "09:40", type: "fly", text: "関西空港に到着（予定）" },
      ],
    },
  ],
};
