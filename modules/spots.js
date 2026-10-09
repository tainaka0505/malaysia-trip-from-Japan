/* 観光地 */
App.register({
  id: "spots", title: "スポット", icon: "pin", order: 45, nav: "more", desc: "観光地と名物料理",
  render(el, { h, sheet, icon, param, go }) {
    const spots = App.data.spots, areas = App.data.areas, tags = App.data.foodTags;
    let area = "all";
    try { area = localStorage.getItem("mt:spots-area") || "all"; } catch (e) {}

    const tagChips = (t) => (t || "").split(" ").filter(Boolean).map((k) => h("span", { class: "tag t-" + k }, tags[k] || k));

    function detail(s) {
      const rows = [["滞在の目安", s.stay], ["営業時間", s.hours], ["料金", s.price], ["行き方", s.access]].filter((r) => r[1]);
      const usedOn = App.data.trip.days.filter((d) => d.items.some((i) => i.spot === s.id));
      let close;
      const body = h("div", { class: "detail" },
        h("div", { class: "muted small" }, (areas.find((a) => a.id === s.area) || {}).name + "・" + s.en),
        h("p", null, s.desc),
        rows.length ? h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])) : null,
        s.tips && s.tips.length ? [h("h3", null, "コツ"), h("ul", { class: "tips" }, s.tips.map((t) => h("li", null, t)))] : null,
        s.foods && s.foods.length
          ? [h("h3", null, "食べたいもの"), h("ul", { class: "foods" }, s.foods.map(([n, d, t]) => h("li", null, h("div", { class: "row between" }, h("strong", null, n), h("span", { class: "tags" }, tagChips(t))), d ? h("small", null, d) : null)))]
          : null,
        usedOn.length ? h("div", { class: "chips" }, usedOn.map((d) => h("button", { class: "chip", onclick: () => { close(); go("plan", { date: d.date }); } }, icon("calendar"), App.fmt.date(d.date) + "の予定"))) : null,
        h("a", { class: "btn wide", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.q || s.en), target: "_blank", rel: "noopener" }, icon("map"), "Googleマップで開く"),
        h("p", { class: "muted small" }, "営業時間・料金は目安です。行く前に確認してください。")
      );
      close = sheet(s.name, body);
    }

    const chips = h("div", { class: "chips scroll" });
    const list = h("div", { class: "spot-list" });
    function draw() {
      chips.replaceChildren(
        ...[{ id: "all", name: "すべて" }].concat(areas).map((a) =>
          h("button", { class: "chip" + (area === a.id ? " on" : ""), "aria-pressed": area === a.id ? "true" : "false", onclick: () => { area = a.id; try { localStorage.setItem("mt:spots-area", area); } catch (e) {} draw(); } }, a.name)
        )
      );
      const shown = spots.filter((s) => area === "all" || s.area === area);
      list.replaceChildren(
        ...areas.filter((a) => shown.some((s) => s.area === a.id)).map((a) =>
          h("section", { class: "block" },
            h("h2", { class: "sec" }, a.name),
            h("div", { class: "cards2" },
              shown.filter((s) => s.area === a.id).map((s) =>
                h("button", { class: "card spot", onclick: () => detail(s) },
                  h("div", { class: "row between" }, h("strong", null, s.name), icon("ext")),
                  h("p", { class: "small clamp" }, s.desc),
                  s.foods && s.foods.length ? h("div", { class: "tags" }, s.foods.slice(0, 3).map((f) => h("span", { class: "tag food" }, f[0]))) : null
                )
              )
            )
          )
        )
      );
    }
    el.append(
      h("p", { class: "legend small" }, "食べ物のタグ：", tagChips("cn herb hot my in sw")),
      chips, list
    );
    draw();
    if (param && param.spot) {
      const s = spots.find((x) => x.id === param.spot);
      if (s) detail(s);
    }
  },
});
