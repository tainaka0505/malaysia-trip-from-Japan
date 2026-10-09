/* 持ち物チェック（チェックは自分だけに保存） */
App.register({
  id: "packing", title: "持ち物チェック", short: "持ち物", icon: "bag", order: 50, nav: "more",
  desc: "チェックは自分だけに保存",
  render(el, { h, store, icon, onLeave }) {
    const mine = store.mine("packing");
    let st = { checked: {}, custom: [] }, loaded = false;
    const head = h("div", { class: "progress-card card" });
    const list = h("div");
    const save = () => mine.set({ checked: st.checked, custom: st.custom }).catch(() => {});

    function draw() {
      const all = App.data.packing.concat(st.custom.map((c) => Object.assign({ g: "自分で追加", mine: true }, c)));
      const done = all.filter((x) => st.checked[x.id]).length;
      head.replaceChildren(
        h("div", { class: "row between" }, h("strong", null, "準備できたもの"), h("span", { class: "mono" }, done + " / " + all.length)),
        h("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(all.length), "aria-valuenow": String(done) }, h("i", { style: { width: (all.length ? (done / all.length) * 100 : 0) + "%" } }))
      );
      const groups = [...new Set(all.map((x) => x.g))];
      const input = h("input", { id: "pk-new", class: "input", placeholder: "持ち物を追加（例：イヤホン）", maxlength: "40" });
      list.replaceChildren(
        ...groups.map((g) => h("section", { class: "block" },
          h("h2", { class: "sec small" }, g),
          h("ul", { class: "checklist" }, all.filter((x) => x.g === g).map((x) =>
            h("li", null,
              h("label", { class: "check" + (st.checked[x.id] ? " done" : "") },
                h("input", { type: "checkbox", id: "pk-" + x.id, checked: st.checked[x.id] ? true : null, onchange: (e) => {
                  if (e.target.checked) st.checked[x.id] = true; else delete st.checked[x.id];
                  draw(); save();
                } }),
                h("span", { class: "box" }, icon("check")),
                h("span", null, x.t)),
              x.mine ? h("button", { class: "icon-btn", "aria-label": x.t + "を削除", onclick: () => { st.custom = st.custom.filter((c) => c.id !== x.id); delete st.checked[x.id]; draw(); save(); } }, icon("trash")) : null
            )))
        )),
        h("form", { class: "row gap block", onsubmit: (e) => {
            e.preventDefault();
            const t = input.value.trim();
            if (!t) return;
            st.custom = st.custom.concat({ id: "c" + Date.now().toString(36), t });
            draw(); save();
          } }, input, h("button", { class: "btn primary", type: "submit" }, "追加")),
        h("p", { class: "small muted" }, "チェックはこの画面を開いた人ごとに別々に保存されます。")
      );
    }
    el.append(head, list);
    draw();
    const stop = mine.watch((d) => {
      if (d) st = { checked: d.checked || {}, custom: d.custom || [] };
      loaded = true;
      draw();
    });
    onLeave(stop);
  },
});
