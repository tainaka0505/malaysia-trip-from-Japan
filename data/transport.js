/* バス・フェリー・空港アクセスなど（ETS以外の交通）
   times: 時刻表がある場合のみ。ない路線は freq（運行間隔）で表す。
   checked: 情報を確認した時期 */
App.data.transport = [
  {
    id: "penang-ferry", area: "ペナン", kind: "ship", name: "ペナン・フェリー（バタワース ⇄ ジョージタウン）",
    route: "バタワース（スルタン・アブドゥル・ハリム・ターミナル）⇄ ジョージタウン（ラジャ・トゥン・ウダ・ターミナル）",
    times: [["バタワース発", "6:30〜23:00"], ["ジョージタウン発", "7:00〜23:30"]],
    freq: "混む時間は20分ごと、それ以外は30分ごと", dur: "約15〜20分", fare: "大人 RM2",
    pay: "Touch 'n Go カード、窓口、オンライン", note: "バタワース側はETSの駅と直結。2/26の朝に使う。",
    checked: "2026年10月（Penang Port公式）", url: "https://penangport.gov.my/en/services/service/ferry-services",
  },
  {
    id: "rp-401", area: "ペナン", kind: "bus", name: "Rapid Penang 401 / 401E（空港 ⇄ ジョージタウン）",
    route: "ペナン空港 → ジョージタウン（コムタ、ウェルド・キー）",
    freq: "30分〜1時間に1本ほど", dur: "約1時間", fare: "RM2.70〜4前後",
    pay: "現金はおつりが出ないのでぴったり用意", note: "夜遅く着く日はGrab（約30〜40分、RM30前後）のほうが確実。",
    checked: "2025年の情報", url: "https://www.penang-traveltips.com/malaysia/penang/taking-the-bus.htm",
  },
  {
    id: "rp-204", area: "ペナン", kind: "bus", name: "Rapid Penang 204（コムタ → エアイタム・ペナンヒル）",
    route: "コムタ → エアイタム（極楽寺の最寄り）→ ペナンヒル下駅",
    freq: "20〜30分に1本ほど", dur: "約40分", fare: "RM2前後", pay: "現金（ぴったり）",
    note: "極楽寺はエアイタムで降りて徒歩10分。", checked: "2025年の情報", url: "https://www.penang-traveltips.com/malaysia/penang/taking-the-bus.htm",
  },
  {
    id: "rp-101", area: "ペナン", kind: "bus", name: "Rapid Penang 101（ウェルド・キー → バトゥ・フェリンギ）",
    route: "ウェルド・キー → コムタ → ガーニー → バトゥ・フェリンギ → テロッバハン",
    freq: "20〜30分に1本ほど", dur: "約40〜60分", fare: "RM2〜4前後", pay: "現金（ぴったり）",
    note: "", checked: "2025年の情報", url: "https://www.penang-traveltips.com/malaysia/penang/taking-the-bus.htm",
  },
  {
    id: "rp-cat", area: "ペナン", kind: "bus", name: "CAT（ジョージタウン中心部の無料バス）",
    route: "コムタ ⇄ ウェルド・キー ⇄ アルメニアン通り周辺を循環",
    freq: "10〜20分に1本ほど", dur: "", fare: "無料", pay: "", note: "世界遺産地区の移動に便利。運行状況は現地で確認。",
    checked: "2025年の情報", url: "https://www.penang-traveltips.com/malaysia/penang/taking-the-bus.htm",
  },
  {
    id: "taiping-sepetang", area: "ペラ", kind: "car", name: "タイピン ⇄ クアラスプタン",
    route: "タイピン駅 → クアラスプタン（約17km）",
    freq: "路線バス（Rapid Kamunting）は2021年に廃止", dur: "車で約20分", fare: "Grab RM20〜30前後（目安）",
    pay: "Grabアプリ", note: "帰りの車がつかまりにくい。行きのドライバーに待ってもらうか、チャーターにする。",
    checked: "2026年10月", url: "https://railtravelstation.com/rapid-kamunting/",
  },
  {
    id: "ipoh-tualang", area: "ペラ", kind: "car", name: "イポー ⇄ タンジュントゥアラン",
    route: "イポー旧市街 → タンジュントゥアラン（約35km）",
    freq: "便利な路線バスなし", dur: "車で約40分", fare: "Grab 片道 RM40〜60前後（目安）",
    pay: "Grabアプリ", note: "田舎なので帰りのGrabは来にくい。往復で頼むか、半日チャーター（約5,000〜8,000円/台）。", checked: "目安",
  },
  {
    id: "sebang-melaka", area: "マラッカ", kind: "car", name: "プラウスバン（タンピン）駅 → マラッカ市内",
    route: "ETSプラウスバン駅 → マラッカ旧市街（約35km）",
    freq: "直通の便利なバスなし", dur: "車で約30〜40分", fare: "Grab RM45〜60前後（目安）",
    pay: "Grabアプリ", note: "夜20時ごろの到着なので、駅でGrabを呼ぶ。つながりにくいときに備えて、ホテルに送迎を頼むのも手。",
    checked: "2026年10月", url: "https://www.rome2rio.com/s/Pulau-Sebang/Sentral-Melaka-Terminal",
  },
  {
    id: "melaka-kl", area: "マラッカ", kind: "bus", name: "長距離バス マラッカ・セントラル → KL（TBS）",
    route: "マラッカ・セントラル → TBS（KLの南のバスターミナル。電車でKLセントラルへ約15分）",
    times: [["始発", "5:00"], ["最終", "23:45"]],
    freq: "1日30本以上（ほぼ30分ごと）", dur: "約2時間（渋滞すると3時間）", fare: "RM12〜20",
    pay: "窓口、またはeasybook・Busonlineticketで予約", note: "日曜の午後はKL行きが混むので、前日までに予約しておく。",
    checked: "2026年10月", url: "https://12go.asia/en/travel/melaka-sentral/tbs-kuala-lumpur",
  },
  {
    id: "melaka-17", area: "マラッカ", kind: "bus", name: "Panorama Melaka 17番（セントラル ⇄ オランダ広場）",
    route: "マラッカ・セントラル ⇄ オランダ広場周辺",
    freq: "15〜30分に1本ほど", dur: "約15〜20分", fare: "RM2前後", pay: "現金",
    note: "荷物が多いときはGrab（約15分）が楽。", checked: "目安",
  },
  {
    id: "klia-ekspres", area: "KL", kind: "train", name: "KLIAエクスプレス（KLセントラル ⇄ 空港）",
    route: "KLセントラル ⇄ KLIA ターミナル1 / ターミナル2",
    freq: "15〜20分ごと", dur: "約30分", fare: "大人 RM65（2027年1月から値上げ後）。アプリ・公式サイトで買うと10%引き",
    pay: "窓口、公式アプリ、クレジットカードのタッチ決済", note: "今回はクランからチャーター車で直接空港へ行く予定なので、予備の手段。",
    checked: "2026年10月", url: "https://soyacincau.com/2026/10/01/klia-ekspres-and-transit-adult-fares-to-hit-rm65-starting-1st-january-2027/amp/",
  },
  {
    id: "komuter-batu", area: "KL", kind: "train", name: "KTMコミューター（KLセントラル → バトゥ洞窟）",
    route: "KLセントラル → バトゥ洞窟駅（終点）",
    freq: "30分〜1時間に1本ほど", dur: "約30分", fare: "RM2〜3前後", pay: "窓口、Touch 'n Go カード",
    note: "", checked: "目安",
  },
  {
    id: "komuter-klang", area: "KL", kind: "train", name: "KTMコミューター（KLセントラル → クラン）",
    route: "KLセントラル → クラン駅（ポートクラン線）",
    freq: "30分に1本ほど", dur: "約1時間", fare: "RM3〜5前後", pay: "窓口、Touch 'n Go カード",
    note: "今回はチャーター車で回る予定。", checked: "目安",
  },
];
