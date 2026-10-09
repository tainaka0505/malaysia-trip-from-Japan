/* 日程 */
App.register({
  id: "plan", title: "日程", icon: "calendar", order: 10, nav: "main",
  render(el, { h, go, fmt, icon, param }) {
    const trip = App.data.trip;
    const today = App.todayISO();
    const dayIdx = trip.days.findIndex((d) => d.date === today);
    const startMs = new Date(trip.start + "T00:00:00").getTime();
    const todayMs = new Date(today + "T00:00:00").getTime();
    const until = Math.round((startMs - todayMs) / 86400000);

    let status;
    if (dayIdx >= 0) status = h("span", { class: "pill accent" }, "旅行" + (dayIdx + 1) + "日目");
    else if (until > 0) status = h("span", { class: "pill" }, "出発まであと" + until + "日");
    else status = h("span", { class: "pill" }, "旅行は終了しました");

    el.append(
      h("section", { class: "hero" },
        h("div", { class: "hero-top" }, status, h("span", { class: "muted" }, fmt.date(trip.start) + " 〜 " + fmt.date(trip.end))),
        h("h1", null, trip.name),
        h("ol", { class: "route" }, trip.route.map((r) => h("li", null, r)))
      )
    );

    // 飛行機
    el.append(
      h("section", { class: "block" },
        h("h2", { class: "sec" }, "飛行機"),
        h("div", { class: "cards2" },
          trip.flights.map((f) =>
            h("article", { class: "card flight" },
              h("div", { class: "row between" },
                h("strong", null, f.dir + "　" + fmt.date(f.date)),
                h("span", { class: "pill " + (f.status === "booked" ? "ok" : "warn") }, f.status === "booked" ? "予約済み" : "未予約")
              ),
              h("div", { class: "flight-line" }, h("span", { class: "mono" }, f.from), icon("plane"), h("span", { class: "mono" }, f.to)),
              h("div", null, f.airline),
              h("div", { class: "muted small" }, f.price),
              f.note ? h("p", { class: "small" }, f.note) : null
            )
          )
        )
      )
    );

    // 日付の選択
    let sel = param && param.date ? trip.days.findIndex((d) => d.date === param.date) : dayIdx >= 0 ? dayIdx : 0;
    if (sel < 0) sel = 0;
    const strip = h("div", { class: "daystrip", role: "tablist" });
    const body = h("div", { class: "day-body" });

    const typeIcon = { move: "train", see: "pin", eat: "food", stay: "bed", fly: "plane", note: "info" };
    function drawDay() {
      strip.replaceChildren(
        ...trip.days.map((d, i) => {
          const dt = new Date(d.date + "T00:00:00");
          return h("button", {
              class: "daypill" + (i === sel ? " on" : "") + (d.date === today ? " today" : ""),
              role: "tab", "aria-selected": i === sel ? "true" : "false",
              onclick: () => { sel = i; drawDay(); },
            },
            h("small", null, i + 1 + "日目"),
            h("strong", null, dt.getMonth() + 1 + "/" + dt.getDate()),
            h("small", null, "日月火水木金土"[dt.getDay()])
          );
        })
      );
      const d = trip.days[sel];
      body.replaceChildren(
        h("div", { class: "day-head" },
          h("div", null, h("div", { class: "muted small" }, fmt.date(d.date) + "・" + d.area), h("h2", null, d.title)),
          d.stay ? h("span", { class: "pill" }, icon("bed"), d.stay) : null
        ),
        h("ol", { class: "timeline" },
          d.items.map((it) => {
            const link = it.spot ? () => go("spots", { spot: it.spot }) : it.train ? () => go("transit", { train: it.train }) : null;
            return h("li", { class: "tl " + it.type },
              h("span", { class: "tl-time mono" }, it.time || "—"),
              h("span", { class: "tl-dot" }, icon(typeIcon[it.type] || "dot")),
              h("div", { class: "tl-text" },
                h("span", null, it.text),
                link ? h("button", { class: "linkbtn", onclick: link }, it.spot ? "スポット情報" : "時刻表", icon("ext")) : null
              )
            );
          })
        ),
        d.notes ? h("p", { class: "note" }, icon("info"), h("span", null, d.notes)) : null
      );
      const on = strip.children[sel];
      if (on) requestAnimationFrame(() => (strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2));
    }
    el.append(h("section", { class: "block" }, h("h2", { class: "sec" }, "毎日の予定"), strip, body));
    drawDay();
  },
});
