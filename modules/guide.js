/* 注意事項・持ち込み・緊急連絡先 */
App.register({
  id: "guide", title: "注意事項・持ち込み", short: "注意", icon: "shield", order: 60, nav: "more",
  desc: "入国、禁止品、マナー、ラマダン、アプリ",
  render(el, { h, icon }) {
    const lv = { must: ["必ず", "must"], warn: ["注意", "warn"], info: ["参考", "info"] };
    el.append(
      h("nav", { class: "chips scroll", "aria-label": "項目へ移動" },
        App.data.guide.map((s) => h("a", { class: "chip", href: "#g-" + s.id, onclick: (e) => { e.preventDefault(); document.getElementById("g-" + s.id).scrollIntoView({ behavior: "smooth", block: "start" }); } }, s.title)),
        h("a", { class: "chip", href: "#g-sos", onclick: (e) => { e.preventDefault(); document.getElementById("g-sos").scrollIntoView({ behavior: "smooth" }); } }, "緊急連絡先")),
      ...App.data.guide.map((s) =>
        h("section", { class: "block", id: "g-" + s.id },
          h("h2", { class: "sec" }, icon(s.icon), s.title),
          h("ul", { class: "guide-list" }, s.items.map((it) =>
            h("li", { class: "gitem " + lv[it.level][1] },
              h("details", { open: it.level === "must" ? true : null },
                h("summary", null, h("span", { class: "lv" }, lv[it.level][0]), h("strong", null, it.t)),
                h("p", null, it.d),
                it.url ? h("a", { href: it.url, target: "_blank", rel: "noopener", class: "small" }, "公式サイトを開く") : null
              ))))
        )),
      h("section", { class: "block", id: "g-sos" },
        h("h2", { class: "sec" }, icon("phone"), "緊急連絡先"),
        h("ul", { class: "sos" }, App.data.emergency.map((e) =>
          h("li", { class: "card" },
            h("div", { class: "row between" }, h("strong", null, e.name),
              e.tel ? h("button", { class: "btn small", onclick: async (ev) => {
                const b = ev.currentTarget;
                try { await navigator.clipboard.writeText(e.tel); b.textContent = "コピーしました"; } catch (x) { b.textContent = e.tel; }
              } }, "番号をコピー") : null),
            e.tel ? h("div", { class: "mono big sel" }, e.tel) : null,
            h("small", { class: "muted sel" }, e.note)
          )))
      ),
      h("p", { class: "small muted" }, "情報は2026年10月時点で調べたものです。出発前に外務省の海外安全ホームページと在マレーシア日本国大使館のページで最新情報を確認してください。")
    );
  },
});
