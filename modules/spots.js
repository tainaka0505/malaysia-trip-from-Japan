/* スポット（旅行雑誌ふうの紹介ページ）
   データは data/spots.js、写真は img/spots/<id>.jpg（クレジットは data/spot_photos.js に build で自動生成） */
App.register({
  id: "spots", title: "スポット", icon: "star", order: 45, nav: "more", wide: true, desc: "体験・絶景・食べ歩きの特集",
  render(el, { h, sheet, icon, param, go }) {
    const D = App.data, spots = D.spots, areas = D.areas, tags = D.foodTags, cats = D.spotCats;
    const photos = D.spotPhotos || {};
    const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    const areaOf = (id) => areas.find((a) => a.id === id) || {};
    const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
    let area = ls("mt:spots-area") || "all";
    let cat = ls("mt:spots-cat") || "all";
    if (area !== "all" && !areas.some((a) => a.id === area)) area = "all";

    // アプリの地図に入っている範囲（ここに入るスポットは「アプリの地図で見る」が出る）
    const MAPBOX = [["kl", 101.655, 3.07, 101.745, 3.185], ["kl", 101.672, 3.222, 101.692, 3.247], ["pg", 100.245, 5.385, 100.372, 5.485], ["pg", 100.222, 5.335, 100.245, 5.362], ["ip", 101.06, 4.558, 101.125, 4.652]];
    const mapRegion = (s) => { if (!s.ll) return null; const [la, lo] = s.ll; const b = MAPBOX.find(([, x0, y0, x1, y1]) => lo >= x0 && lo <= x1 && la >= y0 && la <= y1); return b ? b[0] : null; };

    const tagChips = (t) => (t || "").split(" ").filter(Boolean).map((k) => h("span", { class: "tag t-" + k }, tags[k] || k));
    const catTags = (s, n) => (s.cat || []).slice(0, n || 9).map((c) => h("span", { class: "mz-cat c-" + c }, catName[c] || c));

    function photo(s, cls, eager) {
      const p = photos[s.id];
      if (!p) return h("div", { class: "mz-ph noimg " + (cls || "") }, h("span", null, areaOf(s.area).kicker || ""), h("b", null, s.en));
      return h("div", { class: "mz-ph " + (cls || "") }, h("img", { src: p.f, alt: s.name, loading: eager ? "eager" : "lazy", decoding: "async" }));
    }

    function detail(s) {
      const a = areaOf(s.area), p = photos[s.id], reg = mapRegion(s);
      const rows = [["滞在の目安", s.stay], ["営業時間", s.hours], ["料金", s.price], ["行き方", s.access]].filter((r) => r[1]);
      const usedOn = D.trip.days.filter((d) => d.items.some((i) => i.spot === s.id));
      let close;
      const body = h("div", { class: "detail mz-detail" },
        h("figure", { class: "mz-fig" }, photo(s, "wide", true), p ? h("figcaption", null, "写真：" + p.c) : null),
        h("div", { class: "mz-kicker" }, (a.kicker || "") + "　/　" + s.en),
        s.lead ? h("p", { class: "mz-lead" }, s.lead) : null,
        h("div", { class: "mz-cats" }, catTags(s)),
        s.jp ? h("aside", { class: "mz-jp" }, h("strong", null, "ここが日本と違う"), h("p", null, s.jp)) : null,
        h("p", { class: "mz-body" }, s.desc),
        rows.length ? h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])) : null,
        s.tips && s.tips.length ? [h("h3", null, "コツ"), h("ul", { class: "tips" }, s.tips.map((t) => h("li", null, t)))] : null,
        s.foods && s.foods.length
          ? [h("h3", null, "食べたいもの"), h("ul", { class: "foods" }, s.foods.map(([n, d, t]) => h("li", null, h("div", { class: "row between" }, h("strong", null, n), h("span", { class: "tags" }, tagChips(t))), d ? h("small", null, d) : null)))]
          : null,
        usedOn.length ? h("div", { class: "chips" }, usedOn.map((d) => h("button", { class: "chip", onclick: () => { close(); go("plan", { date: d.date }); } }, icon("calendar"), App.fmt.date(d.date) + "の予定"))) : null,
        h("div", { class: "mz-actions" },
          reg ? h("button", { class: "btn primary", onclick: () => { close(); go("map", { region: reg, to: { la: s.ll[0], lo: s.ll[1], name: s.name } }); } }, icon("map"), "アプリの地図で行き方") : null,
          h("a", { class: "btn", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.q || s.en), target: "_blank", rel: "noopener" }, icon("ext"), "Googleマップ")
        ),
        h("p", { class: "muted small" }, "営業時間・料金は調べた時点の目安です。行く前に公式サイトなどで確認してください。")
      );
      close = sheet(s.name, body);
    }

    // 大きい特集カード
    const feature = (s) =>
      h("article", { class: "mz-feature", tabindex: "0", role: "button", onclick: () => detail(s), onkeydown: (e) => { if (e.key === "Enter") detail(s); } },
        h("div", { class: "mz-hero" }, photo(s),
          h("div", { class: "mz-over" }, h("div", { class: "mz-cats" }, catTags(s, 2)), h("h3", null, s.name), s.lead ? h("p", null, s.lead) : null)
        ),
        s.jp ? h("p", { class: "mz-jp-mini" }, h("b", null, "日本と違う"), s.jp) : null
      );
    // 小さい記事カード
    const item = (s) =>
      h("button", { class: "mz-item", onclick: () => detail(s) },
        photo(s, "sq"),
        h("div", { class: "mz-item-t" },
          h("div", { class: "mz-cats" }, catTags(s, 3)),
          h("strong", null, s.name),
          h("span", { class: "small muted clamp2" }, s.lead || s.desc)
        )
      );

    const filt = h("div", { class: "mz-filters" });
    const list = h("div", { class: "mz-list" });
    function draw() {
      const chip = (on, label, fn) => h("button", { class: "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: fn }, label);
      filt.replaceChildren(
        h("div", { class: "chips scroll" }, [{ id: "all", name: "全エリア" }].concat(areas).map((a) => chip(area === a.id, a.name, () => { area = a.id; ls("mt:spots-area", area); draw(); }))),
        h("div", { class: "chips scroll" }, [{ id: "all", name: "すべて" }].concat(cats).map((c) => chip(cat === c.id, c.name + (c.id === "all" ? "" : "（" + spots.filter((s) => (s.cat || []).includes(c.id)).length + "）"), () => { cat = c.id; ls("mt:spots-cat", cat); draw(); })))
      );
      const shown = spots.filter((s) => (area === "all" || s.area === area) && (cat === "all" || (s.cat || []).includes(cat)));
      if (!shown.length) { list.replaceChildren(h("p", { class: "empty" }, "この条件のスポットはありません")); return; }
      list.replaceChildren(
        ...areas.filter((a) => shown.some((s) => s.area === a.id)).map((a, i) => {
          const ss = shown.filter((s) => s.area === a.id);
          // 写真つきの特集を先に
          const feats = ss.filter((s) => s.pick && photos[s.id]);
          const rest = ss.filter((s) => !feats.includes(s));
          const cover = feats[0] || ss.find((s) => photos[s.id]);
          return h("section", { class: "mz-sec" },
            h("header", { class: "mz-opener" + (cover ? "" : " plain") },
              cover ? photo(cover, "", i === 0) : null,
              h("div", { class: "mz-opener-t" },
                h("span", { class: "mz-no" }, String(areas.indexOf(a) + 1).padStart(2, "0") + "　" + (a.kicker || "")),
                h("h2", null, a.name),
                a.lead ? h("p", null, a.lead) : null,
                h("span", { class: "mz-count" }, ss.length + " スポット")
              )
            ),
            feats.length ? h("div", { class: "mz-feats" }, feats.map(feature)) : null,
            rest.length ? h("div", { class: "mz-items" }, rest.map(item)) : null
          );
        })
      );
    }

    const nExp = spots.filter((s) => (s.cat || []).includes("exp")).length;
    const nRare = spots.filter((s) => (s.cat || []).includes("rare")).length;
    const coverSpot = spots.find((s) => s.id === "masjidselat" && photos[s.id]) || spots.find((s) => photos[s.id]);
    el.append(
      h("header", { class: "mz-cover" },
        coverSpot ? photo(coverSpot, "", true) : null,
        h("div", { class: "mz-cover-t" },
          h("span", { class: "mz-no" }, "MALAYSIA 2027 ／ SPOT GUIDE"),
          h("h2", null, "日本じゃできない、", h("br"), "マレーシア。"),
          h("p", null, spots.length + "スポット ・ 体験 " + nExp + " ・ 日本では珍しい " + nRare)
        )
      ),
      D.spotNote ? h("div", { class: "note" }, icon("info"), h("span", null, D.spotNote)) : null,
      filt, list,
      h("p", { class: "muted small mz-credit" }, "写真：Wikimedia Commons（各写真の撮影者とライセンスは詳細ページに記載）")
    );
    draw();
    if (param && param.spot) {
      const s = spots.find((x) => x.id === param.spot);
      if (s) detail(s);
    }
  },
});
