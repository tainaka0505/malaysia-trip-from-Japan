/* 割り勘（立て替えの記録と精算）
   保存先：split_members（メンバー）/ split_expenses（支払い）/ split_settings/main（レート）
   kind: "expense"（立て替え）/ "transfer"（精算で払ったお金） */
App.split = {
  /* 1人ずつの「払った額 − 負担額」を円で出す */
  balances(members, expenses, rate) {
    const b = {};
    members.forEach((m) => (b[m.id] = { paid: 0, owe: 0 }));
    expenses.forEach((e) => {
      const yen = e.cur === "MYR" ? e.amount * rate : e.amount;
      const forIds = (e.for || []).filter((id) => b[id]);
      if (!b[e.payer] || !forIds.length) return;
      b[e.payer].paid += yen;
      forIds.forEach((id) => (b[id].owe += yen / forIds.length));
    });
    return b;
  },
  /* 送金の回数が少なくなるように、多く払った人と少ない人を順に組み合わせる */
  settle(bal) {
    const plus = [], minus = [];
    Object.entries(bal).forEach(([id, v]) => {
      const d = v.paid - v.owe;
      if (d > 0.5) plus.push({ id, v: d });
      else if (d < -0.5) minus.push({ id, v: -d });
    });
    plus.sort((a, b) => b.v - a.v);
    minus.sort((a, b) => b.v - a.v);
    const out = [];
    let i = 0, j = 0;
    while (i < plus.length && j < minus.length) {
      const x = Math.min(plus[i].v, minus[j].v);
      if (Math.round(x) >= 1) out.push({ from: minus[j].id, to: plus[i].id, yen: Math.round(x) });
      plus[i].v -= x; minus[j].v -= x;
      if (plus[i].v < 0.5) i++;
      if (minus[j].v < 0.5) j++;
    }
    return out;
  },
};

App.register({
  id: "split", title: "割り勘", icon: "wallet", order: 40, nav: "main",
  render(el, { h, store, sheet, toast, icon, fmt, onLeave }) {
    const membersCol = store.collection("split_members");
    const expCol = store.collection("split_expenses");
    const settingsDoc = store.doc("split_settings/main");
    let members = [], expenses = [], rate = 35, loaded = { m: false, e: false };
    let tab = "list";
    try { tab = localStorage.getItem("mt:split-tab") || "list"; } catch (e) {}

    const name = (id) => (members.find((m) => m.id === id) || { name: "（削除済み）" }).name;
    const toYen = (e) => (e.cur === "MYR" ? e.amount * rate : e.amount);
    const money = (e) => (e.cur === "MYR" ? fmt.rm(e.amount) + "（" + fmt.yen(e.amount * rate) + "）" : fmt.yen(e.amount));

    const summary = h("div", { class: "split-sum" });
    const tabs = h("div", { class: "seg", role: "tablist" });
    const pane = h("div", { class: "split-pane" });
    const fab = h("button", { class: "fab", onclick: () => editExpense(null) }, icon("plus"), h("span", null, "立て替えを記録"));

    /* ---------- 支払いの入力 ---------- */
    function editExpense(exp) {
      if (!members.length) { toast("先にメンバーを追加してください"); tab = "members"; draw(); return; }
      const isNew = !exp;
      const today = App.todayISO();
      const trip = App.data.trip;
      const st = {
        title: exp ? exp.title : "",
        amount: exp ? String(exp.amount) : "",
        cur: exp ? exp.cur : "MYR",
        payer: exp ? exp.payer : members[0].id,
        for: exp ? exp.for.slice() : members.map((m) => m.id),
        date: exp ? exp.date : today >= trip.start && today <= trip.end ? today : trip.start,
      };
      let close;
      const err = h("p", { class: "err", hidden: true });
      const payerBox = h("div", { class: "chips" });
      const forBox = h("div", { class: "chips" });
      const curBox = h("div", { class: "seg small" });
      const preview = h("p", { class: "muted small" });
      const amountInput = h("input", { id: "sp-amount", class: "input big mono", inputmode: "decimal", placeholder: "0", value: st.amount, oninput: (e) => { st.amount = e.target.value; drawParts(); } });

      function drawParts() {
        curBox.replaceChildren(...[["MYR", "RM（リンギット）"], ["JPY", "円"]].map(([k, t]) =>
          h("button", { type: "button", class: "seg-btn" + (st.cur === k ? " on" : ""), onclick: () => { st.cur = k; drawParts(); } }, t)));
        payerBox.replaceChildren(...members.map((m) =>
          h("button", { type: "button", class: "chip" + (st.payer === m.id ? " on" : ""), "aria-pressed": st.payer === m.id ? "true" : "false", onclick: () => { st.payer = m.id; drawParts(); } }, m.name)));
        forBox.replaceChildren(
          h("button", { type: "button", class: "chip ghost", onclick: () => { st.for = st.for.length === members.length ? [] : members.map((m) => m.id); drawParts(); } }, st.for.length === members.length ? "全員を外す" : "全員"),
          ...members.map((m) => {
            const on = st.for.includes(m.id);
            return h("button", { type: "button", class: "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", onclick: () => { st.for = on ? st.for.filter((x) => x !== m.id) : st.for.concat(m.id); drawParts(); } }, m.name);
          })
        );
        const a = parseFloat(st.amount);
        if (a > 0 && st.for.length) {
          const yen = st.cur === "MYR" ? a * rate : a;
          preview.textContent = (st.cur === "MYR" ? "約" + fmt.yen(yen) + "・" : "") + "1人あたり " + (st.cur === "MYR" ? fmt.rm(a / st.for.length) + "（" + fmt.yen(yen / st.for.length) + "）" : fmt.yen(yen / st.for.length));
        } else preview.textContent = "";
      }

      async function save(ev) {
        ev.preventDefault();
        const a = parseFloat(String(st.amount).replace(/,/g, ""));
        if (!(a > 0)) { err.textContent = "金額を入れてください"; err.hidden = false; return; }
        if (!st.for.length) { err.textContent = "誰の分かを1人以上選んでください"; err.hidden = false; return; }
        const data = { kind: "expense", title: st.title.trim() || "（名前なし）", amount: a, cur: st.cur, payer: st.payer, for: st.for, date: st.date, created: exp ? exp.created || Date.now() : Date.now() };
        try {
          if (isNew) await expCol.add(data); else await expCol.set(exp.id, data);
          close(); toast(isNew ? "記録しました" : "直しました");
        } catch (e) {}
      }

      let confirmDel = false;
      const delBtn = exp ? h("button", { type: "button", class: "btn danger ghost", onclick: async () => {
        if (!confirmDel) { confirmDel = true; delBtn.textContent = "もう一度押すと削除"; return; }
        try { await expCol.remove(exp.id); close(); toast("削除しました"); } catch (e) {}
      } }, icon("trash"), "削除") : null;

      const form = h("form", { class: "form", onsubmit: save },
        h("label", { class: "fld" }, h("span", null, "金額"), h("div", { class: "row gap" }, amountInput)),
        curBox,
        preview,
        h("label", { class: "fld" }, h("span", null, "内容"), h("input", { id: "sp-title", class: "input", placeholder: "例：ガーニードライブの夕ごはん", value: st.title, oninput: (e) => (st.title = e.target.value) })),
        h("div", { class: "fld" }, h("span", null, "払った人"), payerBox),
        h("div", { class: "fld" }, h("span", null, "誰の分？"), forBox),
        h("label", { class: "fld" }, h("span", null, "日付"), h("input", { id: "sp-date", class: "input", type: "date", value: st.date, onchange: (e) => (st.date = e.target.value) })),
        err,
        h("div", { class: "row gap end" }, delBtn, h("button", { class: "btn primary", type: "submit" }, isNew ? "記録する" : "保存する"))
      );
      drawParts();
      close = sheet(isNew ? "立て替えを記録" : "記録を直す", form);
      if (isNew) setTimeout(() => amountInput.focus(), 250);
    }

    /* ---------- 各タブ ---------- */
    function drawList() {
      if (!loaded.e) return pane.replaceChildren(h("p", { class: "empty" }, "読み込み中…"));
      if (!expenses.length)
        return pane.replaceChildren(h("div", { class: "empty-state" }, icon("wallet", "xl"), h("strong", null, "まだ記録がありません"),
          h("p", { class: "small muted" }, members.length ? "誰かが立て替えたら、下の「立て替えを記録」から入れてください。RMのまま入れると円に直して計算します。" : "まず「メンバー」タブで一緒に行く人を追加してください。")));
      const byDate = {};
      expenses.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.created || 0) - (a.created || 0)).forEach((e) => (byDate[e.date] = byDate[e.date] || []).push(e));
      pane.replaceChildren(...Object.keys(byDate).map((d) => h("section", { class: "block" },
        h("h3", { class: "sec small" }, d ? fmt.date(d) : "日付なし"),
        h("ul", { class: "exp-list" }, byDate[d].map((e) => h("li", null,
          h("button", { class: "exp" + (e.kind === "transfer" ? " transfer" : ""), onclick: () => (e.kind === "transfer" ? delTransfer(e) : editExpense(e)) },
            h("span", { class: "exp-main" },
              h("strong", null, e.kind === "transfer" ? "精算：" + name(e.payer) + " → " + name(e.for[0]) : e.title),
              h("small", { class: "muted" }, e.kind === "transfer" ? "送金の記録" : name(e.payer) + "が立て替え・" + (e.for.length === members.length ? "全員" : e.for.map(name).join("、")) + "の分")),
            h("span", { class: "exp-amt mono" }, money(e))
          ))))
      )));
    }

    function delTransfer(e) {
      let close;
      const body = h("div", { class: "form" },
        h("p", null, name(e.payer) + " → " + name(e.for[0]) + "　" + money(e)),
        h("p", { class: "small muted" }, "精算で払ったお金の記録です。取り消すと、その分はまた未精算に戻ります。"),
        h("div", { class: "row end" }, h("button", { class: "btn danger", onclick: async () => { try { await expCol.remove(e.id); close(); toast("取り消しました"); } catch (x) {} } }, "この精算を取り消す")));
      close = sheet("精算の記録", body);
    }

    function drawSettle() {
      if (!members.length) return pane.replaceChildren(h("p", { class: "empty" }, "メンバーを追加すると、ここに精算の結果が出ます。"));
      const bal = App.split.balances(members, expenses, rate);
      const moves = App.split.settle(bal);
      pane.replaceChildren(
        h("section", { class: "block" },
          h("h3", { class: "sec small" }, "精算のしかた"),
          moves.length
            ? h("ul", { class: "moves" }, moves.map((m) => h("li", { class: "card move" },
                h("div", { class: "move-who" }, h("strong", null, name(m.from)), h("span", { class: "arrow" }, "→"), h("strong", null, name(m.to))),
                h("div", { class: "move-amt" }, h("span", { class: "mono big" }, fmt.yen(m.yen)), h("small", { class: "muted mono" }, "≒ " + fmt.rm(m.yen / rate))),
                h("button", { class: "btn small", onclick: async () => {
                  try { await expCol.add({ kind: "transfer", title: "精算", amount: m.yen, cur: "JPY", payer: m.from, for: [m.to], date: App.todayISO(), created: Date.now() }); toast("精算済みにしました"); } catch (e) {}
                } }, "払った")
              )))
            : h("div", { class: "empty-state" }, icon("check", "xl"), h("strong", null, expenses.length ? "精算はすべて済んでいます" : "まだ記録がありません")),
          h("p", { class: "small muted" }, "送金の回数が少なくなる組み合わせです。払ったら「払った」を押すと、精算済みとして記録されます。")
        ),
        h("section", { class: "block" },
          h("h3", { class: "sec small" }, "1人ずつの内訳"),
          h("div", { class: "table-wrap" }, h("table", { class: "tbl" },
            h("thead", null, h("tr", null, h("th", null, "名前"), h("th", null, "立て替えた"), h("th", null, "自分の分"), h("th", null, "差し引き"))),
            h("tbody", null, members.map((m) => {
              const v = bal[m.id], d = v.paid - v.owe;
              return h("tr", null, h("td", null, m.name), h("td", { class: "mono" }, fmt.yen(v.paid)), h("td", { class: "mono" }, fmt.yen(v.owe)),
                h("td", { class: "mono " + (d > 0.5 ? "pos" : d < -0.5 ? "neg" : "") }, (d > 0.5 ? "+" : "") + fmt.yen(d)));
            }))
          )),
          h("p", { class: "small muted" }, "差し引きがプラスの人は受け取る側、マイナスの人は払う側です。精算の記録も含めて計算しています。")
        )
      );
    }

    function drawMembers() {
      const input = h("input", { id: "sp-new-member", class: "input", placeholder: "名前（例：たいご）", maxlength: "20" });
      const add = async (e) => {
        e.preventDefault();
        const n = input.value.trim();
        if (!n) return;
        if (members.some((m) => m.name === n)) { toast("同じ名前がもういます"); return; }
        try { await membersCol.add({ name: n, created: Date.now() }); input.value = ""; } catch (x) {}
      };
      const rateInput = h("input", { id: "sp-rate", class: "input mono", inputmode: "decimal", value: String(rate), style: { maxWidth: "7em" } });
      pane.replaceChildren(
        h("section", { class: "block" },
          h("h3", { class: "sec small" }, "メンバー"),
          h("form", { class: "row gap", onsubmit: add }, input, h("button", { class: "btn primary", type: "submit" }, "追加")),
          members.length
            ? h("ul", { class: "member-list" }, members.map((m) => {
                const used = expenses.some((e) => e.payer === m.id || (e.for || []).includes(m.id));
                return h("li", null, h("span", null, m.name),
                  used ? h("small", { class: "muted" }, "記録あり")
                       : h("button", { class: "icon-btn", "aria-label": m.name + "を削除", onclick: async () => { try { await membersCol.remove(m.id); } catch (x) {} } }, icon("trash")));
              }))
            : h("p", { class: "small muted" }, "一緒に行く人の名前を入れてください。自分も忘れずに。")
        ),
        h("section", { class: "block" },
          h("h3", { class: "sec small" }, "レート"),
          h("form", { class: "row gap", onsubmit: async (e) => {
              e.preventDefault();
              const v = parseFloat(rateInput.value);
              if (!(v > 0)) { toast("数字を入れてください"); return; }
              try { await settingsDoc.set({ rate: v }); toast("レートを変えました"); } catch (x) {}
            } },
            h("span", null, "1 RM ＝"), rateInput, h("span", null, "円"), h("button", { class: "btn", type: "submit" }, "保存")),
          h("p", { class: "small muted" }, "RMで記録した支払いは、このレートで円に直して精算します。クレジットカードの請求レートに合わせると正確です。")
        )
      );
    }

    function drawSummary() {
      const spent = expenses.filter((e) => e.kind !== "transfer").reduce((s, e) => s + toYen(e), 0);
      summary.replaceChildren(
        h("div", null, h("small", { class: "muted" }, "立て替えの合計"), h("strong", { class: "mono big" }, fmt.yen(spent))),
        h("div", null, h("small", { class: "muted" }, "1人あたり"), h("strong", { class: "mono" }, members.length ? fmt.yen(spent / members.length) : "—")),
        h("div", null, h("small", { class: "muted" }, "レート"), h("strong", { class: "mono" }, "1RM=" + rate + "円"))
      );
    }

    function draw() {
      try { localStorage.setItem("mt:split-tab", tab); } catch (e) {}
      tabs.replaceChildren(...[["list", "記録"], ["settle", "精算"], ["members", "メンバー" + (members.length ? "（" + members.length + "）" : "")]].map(([k, t]) =>
        h("button", { class: "seg-btn" + (tab === k ? " on" : ""), role: "tab", "aria-selected": tab === k ? "true" : "false", onclick: () => { tab = k; draw(); } }, t)));
      drawSummary();
      if (tab === "list") drawList(); else if (tab === "settle") drawSettle(); else drawMembers();
      fab.hidden = tab === "members";
    }

    el.append(summary, tabs, pane, fab);
    draw();
    let firstCheck = true;
    const check = () => {
      // 初めて開いたとき（メンバーがまだいない）はメンバー画面から始める
      if (firstCheck && loaded.m && loaded.e) { firstCheck = false; if (!members.length) tab = "members"; }
    };
    const u1 = membersCol.watch((l) => { members = l.sort((a, b) => (a.created || 0) - (b.created || 0)); loaded.m = true; check(); draw(); });
    const u2 = expCol.watch((l) => { expenses = l; loaded.e = true; check(); draw(); });
    const u3 = settingsDoc.watch((d) => { if (d && d.rate > 0) rate = d.rate; draw(); });
    onLeave(() => { u1(); u2(); u3(); });
  },
});
