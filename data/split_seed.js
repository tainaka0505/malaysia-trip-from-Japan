/* 割り勘に自動で入れる支払い（チャットで頼まれたもの）。
   割り勘の画面を誰かが開いたときに1回だけ登録される（split_settings/seeded に記録）。
   payer: 払った人の名前の候補（メンバー名に含まれていればその人）。for を省くと全員で割る。 */
App.data.splitSeed = [
  { id: "seed-hotel-0226", title: "1泊目のホテル（Iconic Regency Service Residences）", amount: 10142, cur: "JPY", payer: ["たいご", "タイゴ", "泰吾", "taigo"], date: "2027-02-26" },
];
