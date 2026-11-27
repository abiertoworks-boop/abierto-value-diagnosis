/* =========================================================
   らしさと本来の価値がわかる診断 — ABIERTO WORKS
   ・サーバーなしで動く。回答はこの端末の localStorage にだけ保存する
   ・周りの人は ?ask=1 のページで答え、「回答コード」（AW-…）を本人に送る
   ========================================================= */
(function () {
  'use strict';

  /* ✎ 個別セッションの申込み・問い合わせ先URL。決まったらここに入れる（空ならボタンを隠す） */
  var SESSION_URL = '';

  var STORE_KEY = 'aw-value-diagnosis-v1';
  var STAGE_LINE = 3.5;   // この点数を下回った最初の領域を「今の段階」とする
  var GAP_LINE = 1.0;     // 自己評価と周りの評価の差がこれ以上なら「差がある」とする

  /* ---------- 設問 ---------- */
  // 問いは「個人（p）」と「企業・チーム（c）」で言い方を分ける。日常の言葉で、1問に1つのことだけを聞く。
  var AREAS = [
    { key: 'A', en: 'Find', name: 'らしさや価値を見つける', short: '見つける', icon: 'images/icons/find.png',
      cheer: ['いいスタートです！', 'あなたの良さの「芽」が見えてきました。次は、それをどう活かしているか。'],
      lead: '自分の良さに、気づいているか',
      about: '「当たり前」にしていることの中に、人から喜ばれている良さが隠れています。',
      items: {
        p: ['人から「ありがとう」「助かった」と言われた場面を、具体的に思い出せる。',
            '周りの人が自分のどこを「いいな」と思ってくれているか、だいたい分かる。',
            '自分の得意なことを、実際にあったエピソードで話せる。'],
        c: ['お客様や取引先から「ありがとう」「助かった」と言われた場面を、具体的に思い出せる。',
            'お客様が自社のどこを気に入って選んでくれているか、だいたい分かる。',
            '自社の強みを、実際にあったエピソードで話せる。']
      } },
    { key: 'B', en: 'Expand', name: '可能性を広げる', short: '広げる', icon: 'images/icons/expand.png',
      cheer: ['その調子です！', 'あと3つの領域です。次は「届ける」。'],
      lead: 'その良さを、活かせる場を広げているか',
      about: '得意なことが「誰の、どんな変化」につながるかを知ると、活かせる場面が増えていきます。',
      items: {
        p: ['自分の得意なことで、相手がどう変わるか（楽になる・前に進めるなど）を言える。',
            '今の仕事以外にも、自分の得意なことが役立ちそうな場面が思い浮かぶ。',
            '得意なことを活かせる機会を、自分から増やそうとしている。'],
        c: ['自社の強みで、お客様がどう変わるか（楽になる・前に進めるなど）を言える。',
            '今の事業以外にも、自社の強みが役立ちそうな場面や相手が思い浮かぶ。',
            '強みを活かせる機会を、会社として意識して増やそうとしている。']
      } },
    { key: 'C', en: 'Deliver', name: '必要な人に届ける', short: '届ける', icon: 'images/icons/deliver.png',
      cheer: ['折り返しを過ぎました！', 'あと2つ。ここからは「つながり」と「これから」の話です。'],
      lead: '必要としている人に、伝わっているか',
      about: '良さがあっても、伝わる言葉と届け方がなければ、相手からは見えません。',
      items: {
        p: ['「誰の・どんな悩みを・どう助けられるか」を、ひとことで言える。',
            '自分のサービスや活動の良さを、相手に伝わる言葉で説明できる。',
            '興味を持った人が「次に何をすればいいか」分かるようにしている（連絡先・申込み方法など）。'],
        c: ['「誰の・どんな悩みを・どう助けられるか」を、ひとことで言える。',
            '自社の商品やサービスの良さを、お客様に伝わる言葉で説明できている。',
            '興味を持った人が「次に何をすればいいか」分かるようにしている（問い合わせ先・申込み方法など）。']
      } },
    { key: 'D', en: 'Circulate', name: '価値を循環させる', short: '循環させる', icon: 'images/icons/circulate.png',
      cheer: ['次がラストの領域です！', 'あと3問で、5つの領域がそろいます。'],
      lead: '喜ばれたことが、次につながっているか',
      about: '感想・リピート・紹介。価値は、人から人へめぐるほど大きくなります。',
      items: {
        p: ['相手の感想や「その後どうなったか」を、聞くようにしている。',
            'また頼まれたり、紹介されたりして、次の人へつながっている。',
            '無理なく続けられる料金や時間の使い方になっている。'],
        c: ['お客様の感想や「その後どうなったか」を、聞く仕組みがある。',
            'リピートや紹介で、次のお客様へつながっている。',
            '無理なく続けられる価格や、働き方・体制になっている。']
      } },
    { key: 'E', en: 'Create', name: '新しい価値を生み出す', short: '生み出す', icon: 'images/icons/create.png',
      cheer: ['15問、おつかれさまでした！', '結果まで、あと1問だけです。'],
      lead: '次の新しい価値を、つくっているか',
      about: '周りの声と、自分の強み・仲間の強みを組み合わせると、新しい喜びが生まれます。',
      items: {
        p: ['周りの声をヒントに、新しいことを始めたり、やり方を変えたりしている。',
            'ほかの人と組んで、一人ではできないことに取り組んでいる。',
            '今の強みを活かして、これからやってみたいことが思い浮かぶ。'],
        c: ['お客様の声をヒントに、新しい商品やサービスをつくったり、やり方を変えたりしている。',
            'ほかの会社や人と組んで、自社だけではできないことに取り組んでいる。',
            '今の強みを活かして、これから挑戦したいことが思い浮かぶ。']
      } }
  ];
  var ALIGN_ITEM = {
    p: '周りから喜ばれていることと、今いちばん時間を使っている仕事や活動が、一致している。',
    c: 'お客様から喜ばれていることと、今いちばん力を入れている事業や仕事が、一致している。'
  };

  var WORDS = {
    p: [
      '人より少ない力で、自然にできてしまうことは何ですか？',
      '時間を忘れて取り組めることは何ですか？',
      '周りからよく頼まれること・聞かれることは何ですか？'
    ],
    c: [
      '自社が、無理をしなくても自然にできてしまうことは何ですか？',
      '社内で、自然と熱が入る仕事は何ですか？',
      'お客様や取引先から、よく頼まれること・聞かれることは何ですか？'
    ]
  };

  // 周りの人への問い（1問＝1領域。A〜Eの順）。{t} = 相手の呼び方
  var OTHERS_ITEMS = [
    '{t}の「ここがいい」と思うところを、具体的に言える。',
    '{t}のおかげで、誰かが助かったり、いい方向に変わったりしたのを見たことがある。',
    '{t}が「どんな人の、どんな役に立つのか」を、ほかの人に説明できる。',
    'また{t}に頼みたい、または人に紹介したいと思う。',
    '{t}は、周りの声を取り入れて、新しいことに挑戦していると思う。'
  ];
  var OTHERS_FREE = [
    '{t}を一言で表すと、どんな{k}ですか？',
    '{t}に頼りたくなるのは、どんなときですか？',
    '{t}らしいと感じる行動や言葉は何ですか？',
    '{t}のおかげで、どんなことが変わりましたか？',
    '{t}の価値を特に必要としているのは、どんな人だと思いますか？',
    'もっと知られてほしい・もったいないと感じるところはありますか？',
    'これから、どんな価値をもっと届けてほしいですか？'
  ];
  var RELATIONS = {
    p: ['家族', '友人', '仕事仲間', 'お客様', 'その他'],
    c: ['顧客', '従業員', '取引先', 'その他']
  };

  var STAGES = [
    { name: '価値の芽を見つける段階',
      desc: '自分・自社の価値が、まだ言葉や具体例になっていないようです。価値がないのではなく、見えていないだけかもしれません。',
      hint: '周りの人に「どんなときに頼りたくなる？」「何が助かっている？」と聞いてみましょう。' },
    { name: '強みを広げる段階',
      desc: '価値のヒントは見えています。ただ、その強みを活かす相手や場面が、まだ定まっていないようです。',
      hint: 'その強みは、どんな人の、どんな変化につながりますか。今とは違う場面も含めて書き出してみましょう。' },
    { name: '価値を届ける段階',
      desc: '価値はあります。次は、相手に伝わる言葉と届け方を整える段階です。',
      hint: '「誰の、どんな困りごとに、何を届けるのか」を一文で表してみましょう。' },
    { name: '価値を循環させる段階',
      desc: '価値は相手に届いています。次は、継続や紹介、改善につながる仕組みを考える段階です。',
      hint: '感想や利用後の変化を集め、提供する価値と見せ方に反映していきましょう。' },
    { name: '新しい価値を生み出す段階',
      desc: '今ある価値を土台に、次の可能性を考えられる状態です。',
      hint: '顧客や仲間の声と、自分・自社の強みを組み合わせ、新しい喜びにつながる形を探してみましょう。' }
  ];

  var REFLECT = [
    '自分では強みだと思っていないのに、周りから何度も挙がる価値はありますか？',
    '自分では大切にしているのに、相手にはまだ伝わっていないことはありますか？',
    '周りが評価している点と、今の商品・サービス・活動の見せ方は一致していますか？',
    'これから届けたい価値と、実際に求められている価値に差はありますか？',
    'その差を埋めるために、今週できる小さな行動は何ですか？'
  ];

  /* ---------- 状態 ---------- */
  var state = { mode: 'p', name: '', self: { a: [], align: 0, words: ['', '', ''], done: false }, others: [], reflect: [] };

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.self) state = Object.assign(state, s);
      }
    } catch (e) { /* 保存できない環境でも動く */ }
  }
  var DEMO = false;
  function save() {
    if (DEMO) return;   // サンプル表示は保存しない
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- 小道具 ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (text != null) e.textContent = text;
    return e;
  }
  function selfWord() { return state.mode === 'c' ? '自社' : '自分'; }
  function fmt(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function band(v) {
    var r = round1(v);
    if (r >= 4.0) return '手応えがある';
    if (r > 2.5) return '伸ばせる余地がある';
    return 'これから育てる';
  }
  function avg(arr) {
    var a = arr.filter(function (x) { return x > 0; });
    if (!a.length) return null;
    return a.reduce(function (s, x) { return s + x; }, 0) / a.length;
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { toast('コピーしました'); }, fallback);
    }
    fallback();
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('コピーしました'); } catch (e) { toast('コピーできませんでした。手動で選択してください'); }
      ta.remove();
    }
  }

  /* 回答コード: "AW-" + base64url(UTF-8 JSON) */
  function encode(obj) {
    var json = JSON.stringify(obj);
    var bin = unescape(encodeURIComponent(json));
    return 'AW-' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    var b = code.replace(/^AW-/, '').replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var obj = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!obj || !Array.isArray(obj.s) || obj.s.length !== 5) throw new Error('bad');
    obj.s = obj.s.map(function (x) { x = Number(x); return x >= 1 && x <= 5 ? Math.round(x) : 0; });
    obj.f = Array.isArray(obj.f) ? obj.f.slice(0, OTHERS_FREE.length).map(function (x) { return String(x || '').slice(0, 600); }) : [];
    obj.r = String(obj.r || 'その他').slice(0, 20);
    return obj;
  }

  /* ---------- 5段階の問い ---------- */
  function rateField(name, no, text, ends, value) {
    var fs = el('fieldset', { class: 'q', 'data-name': name });
    var lg = el('legend');
    lg.appendChild(el('span', { class: 'q__no' }, no));
    lg.appendChild(el('span', null, text));
    fs.appendChild(lg);
    var box = el('div', { class: 'rate' });
    for (var i = 1; i <= 5; i++) {
      var lb = el('label');
      var inp = el('input', { type: 'radio', name: name, value: String(i), 'aria-label': i + '：' + ends[i - 1] });
      if (value === i) inp.checked = true;
      lb.appendChild(inp);
      lb.appendChild(el('span', { 'aria-hidden': 'true' }, String(i)));
      box.appendChild(lb);
    }
    fs.appendChild(box);
    var en = el('div', { class: 'rate__ends', 'aria-hidden': 'true' });
    en.appendChild(el('span', null, ends[0]));
    en.appendChild(el('span', null, ends[4]));
    fs.appendChild(en);
    return fs;
  }
  var SELF_ENDS = ['あてはまらない', 'あまりあてはまらない', 'どちらともいえない', 'ややあてはまる', 'あてはまる'];
  var OTHER_ENDS = ['そう思わない', 'あまりそう思わない', 'どちらともいえない', 'そう思う', 'とてもそう思う'];

  function textField(name, label, value, rows) {
    var w = el('label', { class: 'wq' });
    w.appendChild(el('span', null, label));
    var ta = el('textarea', { name: name, rows: String(rows || 2), maxlength: '600' });
    ta.value = value || '';
    w.appendChild(ta);
    return w;
  }

  /* ---------- Step 1 ---------- */
  function renderSelf() {
    var s = selfWord();
    var box = $('#selfItems'); box.textContent = '';
    var n = 0;
    AREAS.forEach(function (area, ai) {
      var blk = el('div', { class: 'block area-block', 'data-area': String(ai) });
      var head = el('div', { class: 'area-head' });
      head.appendChild(el('img', { class: 'area-head__icon', src: area.icon, alt: '', width: '240', height: '240' }));
      var tx = el('div', { class: 'area-head__txt' });
      tx.appendChild(el('p', { class: 'area-head__k' }, 'AREA ' + (ai + 1) + ' / 5 — ' + area.en.toUpperCase()));
      tx.appendChild(el('h3', { class: 'area-head__name' }, area.name));
      tx.appendChild(el('p', { class: 'area-head__lead' }, area.lead + '？'));
      head.appendChild(tx);
      blk.appendChild(head);
      area.items[state.mode].forEach(function (t) {
        n++;
        blk.appendChild(rateField('q' + (n - 1), String(n), t, SELF_ENDS, state.self.a[n - 1]));
      });
      // その領域を答え終えたら出る、ひと声
      var ch = el('div', { class: 'cheer', 'data-cheer': String(ai), 'aria-live': 'polite' });
      ch.appendChild(el('img', { class: 'cheer__face', src: GUIDE_FACES[ai % GUIDE_FACES.length], alt: '', width: '240', height: '240' }));
      var msg = el('p', { class: 'cheer__msg' });
      msg.appendChild(el('b', null, area.cheer[0]));
      msg.appendChild(document.createTextNode(area.cheer[1]));
      ch.appendChild(msg);
      blk.appendChild(ch);
      box.appendChild(blk);
    });
    var al = $('#alignItem'); al.textContent = '';
    al.appendChild(rateField('q15', '16', ALIGN_ITEM[state.mode], SELF_ENDS, state.self.align));
    var wb = $('#wordItems'); wb.textContent = '';
    WORDS[state.mode].forEach(function (t, i) { wb.appendChild(textField('w' + i, t, state.self.words[i])); });
    $$('[data-self]').forEach(function (e) { e.textContent = s; });
    updateProgress();
  }
  function readSelf() {
    var f = $('#selfForm');
    var a = [];
    for (var i = 0; i < 15; i++) {
      var c = f.querySelector('input[name="q' + i + '"]:checked'); a.push(c ? Number(c.value) : 0);
    }
    var al = f.querySelector('input[name="q15"]:checked');
    state.self.a = a;
    state.self.align = al ? Number(al.value) : 0;
    state.self.words = [0, 1, 2].map(function (i) { var t = f.querySelector('[name="w' + i + '"]'); return t ? t.value.trim() : ''; });
  }
  var GUIDE_FACES = ['images/guide/ok.png', 'images/guide/fist.png', 'images/guide/cheer.png', 'images/guide/peace.png', 'images/guide/joy.png'];
  function answered(f, i) { return !!f.querySelector('input[name="q' + i + '"]:checked'); }
  function updateProgress() {
    var f = $('#selfForm');
    var cnt = 0;
    for (var i = 0; i < 16; i++) if (answered(f, i)) cnt++;
    $('#selfProgress').textContent = cnt === 16 ? '16 / 16 問　すべて答えました！' : cnt + ' / 16 問';
    // 領域ごとのひと声
    AREAS.forEach(function (_, ai) {
      var done = [0, 1, 2].every(function (k) { return answered(f, ai * 3 + k); });
      var c = f.querySelector('[data-cheer="' + ai + '"]'); if (c) c.classList.toggle('is-on', done);
    });
    var ca = f.querySelector('[data-cheer="align"]'); if (ca) ca.classList.toggle('is-on', answered(f, 15));
    // 画面下の進み具合
    var next = -1; for (i = 0; i < 16; i++) if (!answered(f, i)) { next = i; break; }
    var ai2 = next === -1 ? 4 : Math.min(4, Math.floor(next / 3));
    $('#hudFill').style.width = (cnt / 16 * 100) + '%';
    $('#hudNum').textContent = String(cnt);
    if (next === 15) { $('#hudArea').textContent = 'ラスト1問'; $('#hudIcon').src = 'images/icons/circulate.png'; }
    else { $('#hudArea').textContent = AREAS[ai2].short; $('#hudIcon').src = AREAS[ai2].icon; }
    var left = 16 - cnt;
    $('#hudMsg').textContent = left === 0 ? '結果を見られます' : left <= 3 ? 'あと' + left + '問！' : cnt >= 8 ? '折り返し、あと約' + Math.max(1, Math.ceil(left * 12 / 60)) + '分' : 'あと約' + Math.max(1, Math.ceil(left * 12 / 60)) + '分';
    return cnt;
  }
  // 答えたら、次のまだ答えていない問いへ静かに送る（前の問いを直したときは動かさない）
  function autoAdvance(input) {
    var m = /^q(\d+)$/.exec(input.name || ''); if (!m) return;
    var f = $('#selfForm'), cur = Number(m[1]);
    for (var i = 0; i < cur; i++) if (!answered(f, i)) return;
    var next = -1; for (i = cur + 1; i < 16; i++) if (!answered(f, i)) { next = i; break; }
    var target = next === -1 ? $('.form-foot', f) : f.querySelector('input[name="q' + next + '"]').closest('.q');
    if (cur % 3 === 2 && cur < 15) target = f.querySelector('[data-cheer="' + Math.floor(cur / 3) + '"]') || target;
    setTimeout(function () {
      var r = target.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.62 || r.top < 0) {
        window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.32, behavior: REDUCED ? 'auto' : 'smooth' });
      }
    }, 260);
  }
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function selfScores() {
    return AREAS.map(function (_, i) { return avg(state.self.a.slice(i * 3, i * 3 + 3)); });
  }
  function stageIndex(scores) {
    for (var i = 0; i < 4; i++) if (scores[i] == null || round1(scores[i]) < STAGE_LINE) return i;
    return 4;
  }

  /* ---------- チャート（ダンベル型） ---------- */
  function pos(v) { return ((v - 1) / 4 * 100) + '%'; }
  function renderChart(target, selfS, othersS) {
    var root = $(target); root.textContent = '';
    var axis = el('div', { class: 'db-axis', 'aria-hidden': 'true' });
    axis.appendChild(el('span'));
    var ticks = el('div', { class: 'db-axis__ticks' });
    [1, 2, 3, 4, 5].forEach(function (v) { var t = el('span', null, String(v)); t.style.left = pos(v); ticks.appendChild(t); });
    axis.appendChild(ticks);
    axis.appendChild(el('span'));
    root.appendChild(axis);

    AREAS.forEach(function (area, i) {
      var sv = selfS ? selfS[i] : null, ov = othersS ? othersS[i] : null;
      var row = el('div', { class: 'db-row', role: 'group',
        'aria-label': area.name + '：自分 ' + (sv != null ? fmt(sv) : 'なし') + (othersS ? '、周り ' + (ov != null ? fmt(ov) : 'なし') : '') });
      var lab = el('div', { class: 'db-label' });
      lab.appendChild(el('small', null, area.key + ' ' + area.en.toUpperCase()));
      lab.appendChild(el('b', null, area.name));
      row.appendChild(lab);

      var tr = el('div', { class: 'db-track' });
      [1, 2, 3, 4, 5].forEach(function (v) { var g = el('span', { class: 'db-grid' }); g.style.left = pos(v); tr.appendChild(g); });
      if (sv != null && ov != null) {
        var lk = el('span', { class: 'db-link' });
        lk.style.left = pos(Math.min(sv, ov)); lk.style.width = (Math.abs(sv - ov) / 4 * 100) + '%';
        tr.appendChild(lk);
      }
      if (ov != null) tr.appendChild(dot('others', ov, '周りの人 ' + fmt(ov)));
      if (sv != null) tr.appendChild(dot('self', sv, selfWord() + ' ' + fmt(sv)));
      row.appendChild(tr);

      var vals = el('div', { class: 'db-vals' });
      if (sv != null) { var a = el('span'); a.appendChild(el('em', null, selfWord())); a.appendChild(document.createTextNode(fmt(sv))); vals.appendChild(a); }
      if (othersS) { var b = el('span'); b.appendChild(el('em', null, '周り')); b.appendChild(document.createTextNode(ov != null ? fmt(ov) : '—')); vals.appendChild(b); }
      if (!othersS && sv != null) vals.appendChild(el('span', { class: 'db-band' }, band(sv)));
      row.appendChild(vals);
      root.appendChild(row);
    });
    function dot(cls, v, tip) {
      var d = el('span', { class: 'db-dot ' + cls, 'data-tip': tip, tabindex: '0' });
      d.style.left = pos(v);
      d.appendChild(el('span', { class: 'db-hit' }));
      return d;
    }
  }
  /* レーダーチャートと3Dマップ（js/viz.js） */
  var maps = {};
  function shortLabels() { return AREAS.map(function (a) { return a.short; }); }
  function drawViz(key, selfS, othersS) {
    if (!window.AWViz) return;
    var fill = function (arr) { return arr ? arr.map(function (v) { return v == null ? 0 : v; }) : null; };
    var rd = $('#radar' + key);
    if (rd) AWViz.radar(rd, { labels: shortLabels(), self: fill(selfS), others: fill(othersS), selfName: selfWord() });
    // 人のシルエットとオーラ（3D）。使えない環境では、数値の図を開いておく
    var box = $('#aura' + key);
    if (!maps[key]) maps[key] = AWViz.AuraFigure(box, { gapLine: GAP_LINE });
    maps[key].set(fill(selfS), fill(othersS), { labels: shortLabels(), selfName: selfWord(), gapLine: GAP_LINE });
    if (box.classList.contains('is-fallback')) { var dt = box.closest('.chart-card').querySelector('.num-detail'); if (dt) dt.open = true; }
    $$('[data-self]').forEach(function (e) { e.textContent = selfWord(); });
  }
  function initVisuals() {
    if (!window.AWViz) return;
    // HERO：サンプルの「層」。自分の声と周りの声が重なっては離れる
    var hero = AWViz.HoloLayers($('#heroLayers'), { cycle: true, gapLine: GAP_LINE });
    hero.set([3.3, 3.0, 2.3, 2.7, 3.7], [4.3, 4.0, 3.0, 4.3, 2.7], { labels: shortLabels(), selfName: '自分' });

    // 5つの領域：ホログラムの地図と説明の連動
    var list = $('#areaList'); list.textContent = '';
    var items = AREAS.map(function (a, i) {
      var li = el('li', { class: 'area-item', tabindex: '0' });
      li.appendChild(el('img', { class: 'area-item__icon', src: a.icon, alt: '', width: '240', height: '240', loading: 'lazy' }));
      var body = el('div');
      body.appendChild(el('p', { class: 'area-item__en' }, '0' + (i + 1) + ' — ' + a.en.toUpperCase()));
      body.appendChild(el('h3', null, a.name));
      body.appendChild(el('p', { class: 'area-item__lead' }, a.lead + '？'));
      body.appendChild(el('p', { class: 'area-item__about' }, a.about));
      li.appendChild(body);
      list.appendChild(li);
      return li;
    });
    var ring = AWViz.HoloMap($('#cycleRing'), {
      labels: shortLabels(), icons: AREAS.map(function (a) { return a.icon; }), coreLabel: 'らしさ',
      onStep: function (i) { items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); }); }
    });
    items.forEach(function (li, i) {
      li.addEventListener('click', function () { ring.jump(i); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ring.jump(i); } });
    });
  }

  function legend(target, withOthers) {
    var l = $(target); l.textContent = '';
    var a = el('li'); a.appendChild(el('i', { class: 'self' })); a.appendChild(document.createTextNode(selfWord() + 'の回答')); l.appendChild(a);
    if (withOthers) { var b = el('li'); b.appendChild(el('i', { class: 'others' })); b.appendChild(document.createTextNode('周りの人の回答（平均）')); l.appendChild(b); }
  }

  // アイコンつきの一覧の行
  function iconItem(area, title) {
    var li = el('li', { class: 'icon-item' });
    li.appendChild(el('img', { src: area.icon, alt: '', width: '240', height: '240', loading: 'lazy' }));
    var body = el('div'); body.appendChild(el('b', null, title));
    li.appendChild(body); li._body = body;
    return li;
  }

  /* ---------- 自己評価の結果 ---------- */
  function renderResult() {
    if (!state.self.done) { $('#result').hidden = true; return; }
    $('#result').hidden = false;
    var sc = selfScores();
    var st = STAGES[stageIndex(sc)];
    $('#stageTitle').textContent = '今は、' + st.name + '。';
    $('#stageDesc').textContent = st.desc;
    $('#stageHint').textContent = st.hint;
    legend('#legend1', false);
    renderChart('#chartSelf', sc, null);
    drawViz('Self', sc, null);

    var al = state.self.align;
    $('#alignNote').textContent = al
      ? '今の活動とのつながり：' + al + ' / 5 ' + (al <= 3 ? '— 周りが感じている価値と、今の時間の使い方にズレがあるかもしれません。Step 3 で、周りの声と照らし合わせてみましょう。' : '— 周りが感じている価値を、今の活動に活かせていると感じています。周りの声でも確かめてみましょう。')
      : '';

    var strong = $('#strongList'), grow = $('#growList'); strong.textContent = ''; grow.textContent = '';
    AREAS.forEach(function (a, i) {
      var v = sc[i]; if (v == null) return;
      var li = iconItem(a, a.name + '　' + fmt(v));
      if (round1(v) >= 4.0) { li._body.appendChild(el('small', null, '手応えがある領域です。具体的なエピソードを、言葉にして残しておきましょう。')); strong.appendChild(li); }
      else if (round1(v) <= 3.0) { li._body.appendChild(el('small', null, band(v) + '。' + STAGES[i].hint)); grow.appendChild(li); }
    });
    if (!strong.children.length) strong.appendChild(el('li', { class: 'empty' }, '4.0以上の領域はまだありません。周りの声から、思わぬ強みが見つかることがあります。'));
    if (!grow.children.length) grow.appendChild(el('li', { class: 'empty' }, '3.0以下の領域はありません。周りの評価との差に注目してみましょう。'));
  }

  /* ---------- Step 2 ---------- */
  function targetLabel(mode, name) {
    if (name) return name;
    return mode === 'c' ? 'この会社' : 'この人';
  }
  function inviteUrl() {
    var base = location.href.split('#')[0].split('?')[0];
    var q = '?ask=1&t=' + state.mode + (state.name ? '&n=' + encodeURIComponent(state.name) : '');
    return base + q;
  }
  function renderInvite() {
    var who = state.name ? state.name : (state.mode === 'c' ? '私たちの会社' : '私');
    var txt = (state.mode === 'c'
      ? '【ご協力のお願い】\n' + who + 'が、お客様や関わる方々にどんな価値をお届けできているのかを見つめ直しています。'
      : '【ご協力のお願い】\n' + who + 'の「らしさ」や価値を見つめ直しています。周りから見た私について、率直に教えていただけませんか。') +
      '\n5つの問いと、答えられる範囲のひとことで、3分ほどです。回答の最後に出る「回答コード」を返信で送ってください。\n' + inviteUrl();
    $('#inviteText').value = txt;
    $$('[data-mode-text]').forEach(function (e) { e.hidden = e.getAttribute('data-mode-text') !== state.mode; });
  }

  function buildOthersForm(form, mode, name, onSubmit) {
    form.textContent = '';
    var t = targetLabel(mode, name);
    var kind = mode === 'c' ? '会社' : '人';
    var sel = el('label', { class: 'field' });
    sel.appendChild(el('span', { class: 'field__label' }, t + 'とあなたの関係'));
    var s = el('select', { name: 'rel', required: 'required' });
    s.appendChild(el('option', { value: '' }, '選んでください'));
    RELATIONS[mode].forEach(function (r) { s.appendChild(el('option', { value: r }, r)); });
    sel.appendChild(s);
    form.appendChild(sel);

    var b1 = el('div', { class: 'block' });
    b1.appendChild(el('p', { class: 'block__en' }, 'Rating'));
    b1.appendChild(el('h3', { class: 'block__title' }, '5段階で答える'));
    b1.appendChild(el('p', { class: 'block__desc' }, '1 そう思わない　〜　5 とてもそう思う'));
    OTHERS_ITEMS.forEach(function (q, i) { b1.appendChild(rateField('o' + i, String(i + 1), q.replace(/\{t\}/g, t), OTHER_ENDS)); });
    form.appendChild(b1);

    var b2 = el('div', { class: 'block' });
    b2.appendChild(el('p', { class: 'block__en' }, 'Your words'));
    var h = el('h3', { class: 'block__title' }, '具体的な声'); h.appendChild(el('small', null, '答えられる範囲で')); b2.appendChild(h);
    b2.appendChild(el('p', { class: 'block__desc' }, '短い言葉で大丈夫です。具体的な場面があると、とても参考になります。'));
    OTHERS_FREE.forEach(function (q, i) { b2.appendChild(textField('f' + i, q.replace(/\{t\}/g, t).replace(/\{k\}/g, kind), '', 2)); });
    form.appendChild(b2);

    var foot = el('div', { class: 'form-foot' });
    var msg = el('p', { class: 'msg', 'aria-live': 'polite' });
    foot.appendChild(msg);
    foot.appendChild(el('button', { class: 'btn btn--primary', type: 'submit' }, '回答を完了する'));
    form.appendChild(foot);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var rel = form.querySelector('[name="rel"]').value;
      var sc = OTHERS_ITEMS.map(function (_, i) { var c = form.querySelector('input[name="o' + i + '"]:checked'); return c ? Number(c.value) : 0; });
      $$('.q', form).forEach(function (q, i) { q.classList.toggle('is-missing', !sc[i]); });
      if (!rel || sc.indexOf(0) !== -1) {
        msg.className = 'msg is-error';
        msg.textContent = !rel ? '関係を選んでください。' : 'まだ答えていない問いがあります。';
        return;
      }
      msg.textContent = '';
      var f = OTHERS_FREE.map(function (_, i) { return form.querySelector('[name="f' + i + '"]').value.trim(); });
      onSubmit({ r: rel, s: sc, f: f });
    });
  }

  function addResponse(obj, src) {
    var key = JSON.stringify([obj.r, obj.s, obj.f]);
    var dup = state.others.some(function (o) { return JSON.stringify([o.r, o.s, o.f]) === key; });
    if (dup) return false;
    state.others.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), r: obj.r, s: obj.s, f: obj.f || [], src: src || 'code' });
    return true;
  }
  function renderResponses() {
    var ul = $('#respList'); ul.textContent = '';
    var n = state.others.length;
    $('#respCount').textContent = n + '件';
    $('#respCheerMsg').textContent = n === 0 ? '1人目の回答が届いたら、すぐに重ねて見られます。'
      : n < 3 ? n + '人分が届きました！ あと' + (3 - n) + '人集まると、見え方の傾向がつかみやすくなります。'
      : n + '人分そろいました！ 下のボタンから、重ねて見てみましょう。';
    if (!n) { ul.appendChild(el('li', { class: 'empty' }, 'まだ回答はありません。')); return; }
    state.others.forEach(function (o, i) {
      var li = el('li');
      var l = el('span');
      l.appendChild(el('span', { class: 'rel' }, (i + 1) + '. ' + o.r + (o.src === 'manual' ? '（聞き取り）' : '')));
      l.appendChild(el('span', { class: 'scores' }, o.s.join(' · ')));
      li.appendChild(l);
      var b = el('button', { type: 'button' }, '削除');
      b.addEventListener('click', function () {
        if (!confirm('この回答を削除しますか？')) return;
        state.others = state.others.filter(function (x) { return x.id !== o.id; });
        save(); renderResponses(); renderCompare();
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  /* ---------- Step 3 ---------- */
  function othersScores(list) {
    if (!list.length) return null;
    return AREAS.map(function (_, i) { return avg(list.map(function (o) { return o.s[i]; })); });
  }
  function renderCompare() {
    var has = state.self.done && state.others.length > 0;
    $('#compareEmpty').hidden = has;
    $('#compareBody').hidden = !has;
    if (!has) return;

    var rels = [];
    state.others.forEach(function (o) { if (rels.indexOf(o.r) === -1) rels.push(o.r); });
    var fs = $('#relFilter'); var cur = fs.value || 'all';
    fs.textContent = '';
    fs.appendChild(el('option', { value: 'all' }, 'すべての立場'));
    rels.forEach(function (r) { fs.appendChild(el('option', { value: r }, r)); });
    fs.value = rels.indexOf(cur) !== -1 ? cur : 'all';
    var list = fs.value === 'all' ? state.others : state.others.filter(function (o) { return o.r === fs.value; });
    $('#filterN').textContent = list.length + '人の回答' + (state.others.length < 3 ? '（3人以上集まると、見え方の傾向がつかみやすくなります）' : '');

    var ss = selfScores(), os = othersScores(list);
    legend('#legend2', true);
    renderChart('#chartCompare', ss, os);
    drawViz('Compare', ss, os);

    // 立場ごとの表（2つ以上の立場があるとき）
    var wrap = $('#relTableWrap');
    wrap.hidden = rels.length < 2;
    if (rels.length >= 2) {
      var tb = $('#relTable'); tb.textContent = '';
      var thead = el('thead'), hr = el('tr');
      hr.appendChild(el('th', { scope: 'col' }, '領域'));
      hr.appendChild(el('th', { scope: 'col' }, selfWord()));
      rels.forEach(function (r) {
        var n = state.others.filter(function (o) { return o.r === r; }).length;
        hr.appendChild(el('th', { scope: 'col' }, r + '（' + n + '）'));
      });
      thead.appendChild(hr); tb.appendChild(thead);
      var tbody = el('tbody');
      AREAS.forEach(function (a, i) {
        var tr = el('tr');
        tr.appendChild(el('td', null, a.short));
        tr.appendChild(el('td', null, ss[i] != null ? fmt(ss[i]) : '—'));
        rels.forEach(function (r) {
          var v = othersScores(state.others.filter(function (o) { return o.r === r; }))[i];
          tr.appendChild(el('td', null, v != null ? fmt(v) : '—'));
        });
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody);
    }

    // 差
    var hid = $('#gapHidden'), uns = $('#gapUnseen'); hid.textContent = ''; uns.textContent = '';
    AREAS.forEach(function (a, i) {
      if (ss[i] == null || os[i] == null) return;
      var d = round1(os[i] - ss[i]);
      var li = iconItem(a, a.name);
      li._body.appendChild(el('small', null, selfWord() + ' ' + fmt(ss[i]) + ' / 周り ' + fmt(os[i]) + '（差 ' + (d > 0 ? '+' : '') + d.toFixed(1) + '）'));
      if (d >= GAP_LINE) hid.appendChild(li);
      else if (d <= -GAP_LINE) uns.appendChild(li);
    });
    if (!hid.children.length) hid.appendChild(el('li', { class: 'empty' }, '大きな差（1.0以上）はありません。「具体的な声」の中に、意外な言葉がないか探してみましょう。'));
    if (!uns.children.length) uns.appendChild(el('li', { class: 'empty' }, '大きな差（1.0以上）はありません。大切にしていることは、相手にも届いているようです。'));

    // ことば
    var wb = $('#wordsBody'); wb.textContent = '';
    var t = targetLabel(state.mode, '');
    var groups = [
      { q: 'らしさ（' + selfWord() + 'の言葉と、周りの言葉）', mine: state.self.words.filter(Boolean), idx: [0, 2] },
      { q: '頼りたくなるとき', mine: [], idx: [1] },
      { q: 'おかげで変わったこと', mine: [], idx: [3] },
      { q: '特に必要としている人', mine: [], idx: [4] },
      { q: 'もっと知られてほしい・もったいないところ', mine: [], idx: [5] },
      { q: 'これから届けてほしい価値', mine: [], idx: [6] }
    ];
    groups.forEach(function (g) {
      var items = [];
      g.mine.forEach(function (m) { items.push({ t: m, who: selfWord(), mine: true }); });
      list.forEach(function (o) { g.idx.forEach(function (k) { if (o.f[k]) items.push({ t: o.f[k], who: o.r }); }); });
      if (!items.length) return;
      var box = el('div', { class: 'word-group' });
      box.appendChild(el('h4', null, g.q));
      var ul = el('ul');
      items.forEach(function (it) {
        var li = el('li', { class: it.mine ? 'mine' : '' }, it.t);
        li.appendChild(el('small', null, '— ' + it.who));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      wb.appendChild(box);
    });
    if (!wb.children.length) wb.appendChild(el('p', { class: 'block__desc' }, 'まだ言葉の回答はありません。'));
  }

  function renderReflect() {
    var f = $('#reflectForm'); f.textContent = '';
    REFLECT.forEach(function (q, i) { f.appendChild(textField('r' + i, q, state.reflect[i], i === 4 ? 3 : 2)); });
    f.addEventListener('input', function () {
      state.reflect = REFLECT.map(function (_, i) { return f.querySelector('[name="r' + i + '"]').value; });
      save();
    });
  }

  function renderStageList() {
    var ol = $('#stageList'); ol.textContent = '';
    STAGES.forEach(function (s, i) {
      var li = el('li'); var d = el('div');
      li.appendChild(el('img', { src: AREAS[i].icon, alt: '', width: '240', height: '240', loading: 'lazy' }));
      d.appendChild(el('b', null, s.name));
      d.appendChild(document.createTextNode(i < 4 ? '「' + AREAS[i].short + '」が3.5未満のとき。' + s.hint : 'A〜Dがすべて3.5以上のとき。' + s.hint));
      li.appendChild(d); ol.appendChild(li);
    });
  }

  /* ---------- 周りの人のページ（?ask=1） ---------- */
  function initAsk(params) {
    var mode = params.get('t') === 'c' ? 'c' : 'p';
    var name = (params.get('n') || '').slice(0, 40);
    var t = targetLabel(mode, name);
    $$('[data-view="main"]').forEach(function (e) { e.hidden = true; });
    $$('[data-view="ask"]').forEach(function (e) { e.hidden = false; });
    $$('[data-target-name]').forEach(function (e) { e.textContent = t; });
    document.title = t + 'について教えてください｜ABIERTO WORKS';
    var form = $('#askForm');
    buildOthersForm(form, mode, name, function (obj) {
      var code = encode({ v: 1, r: obj.r, s: obj.s, f: obj.f });
      form.hidden = true;
      $('#askDone').hidden = false;
      $('#askCode').value = code;
      $('#askDone').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#copyAsk').addEventListener('click', function () { copyText($('#askCode').value); });
    if (navigator.share) {
      $('#shareAsk').hidden = false;
      $('#shareAsk').addEventListener('click', function () { navigator.share({ text: $('#askCode').value }).catch(function () {}); });
    }
  }

  /* ---------- デモ（?demo=1：確認・説明用のサンプル） ---------- */
  function loadDemo() {
    state = {
      mode: 'p', name: '（サンプル）', reflect: [],
      self: { a: [4, 3, 3, 3, 4, 2, 3, 2, 2, 2, 3, 3, 3, 4, 4], align: 2, done: true,
        words: ['初対面の人の話を引き出すこと', '資料の見せ方を整えること', '「これ、どう伝えたらいい？」と相談される'] },
      others: [
        { id: 'd1', r: 'お客様', s: [5, 5, 4, 5, 3], f: ['話していると考えが整理される人', '言いたいことがまとまらないとき', '質問の仕方がやさしい', '自分の商品を一言で言えるようになった', '起業したばかりの人', 'もっと発信したほうがいい', '講座をしてほしい'] },
        { id: 'd2', r: '仕事仲間', s: [4, 4, 3, 4, 3], f: ['段取りの人', '企画が行き詰まったとき', '必ず相手の立場から考える', '', '小さな会社の経営者', '実績を見せていない', ''] },
        { id: 'd3', r: '友人', s: [4, 3, 2, 4, 2], f: ['聞き上手', '迷っているとき', '', '', '', '', ''] }
      ]
    };
  }

  /* ---------- 起動 ---------- */
  function init() {
    var params = new URLSearchParams(location.search);
    if (params.get('capture') === '1') document.documentElement.classList.add('capture');
    if (params.get('ask') === '1') { initAsk(params); return; }

    if (params.get('demo') === '1') { DEMO = true; loadDemo(); } else load();

    if (SESSION_URL) $('#sessionBtn').href = SESSION_URL;
    else $('#sessionBtn').hidden = true;

    // 個人／企業
    $$('input[name="mode"]').forEach(function (r) {
      r.checked = r.value === state.mode;
      r.addEventListener('change', function () {
        readSelf();
        state.mode = r.value; save();
        renderSelf(); renderResult(); renderInvite(); renderCompare();
        buildManual();
      });
    });
    var nm = $('#targetName'); nm.value = state.name || '';
    nm.addEventListener('input', function () { state.name = nm.value.trim(); save(); renderInvite(); });

    initVisuals();
    renderSelf();
    var sf = $('#selfForm');
    sf.addEventListener('change', function (ev) { updateProgress(); readSelf(); save(); if (ev.target.type === 'radio') autoAdvance(ev.target); });
    // 回答中だけ、画面下に進み具合を出す
    var hud = $('#hud');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { hud.classList.toggle('is-on', e.isIntersecting); });
      }, { rootMargin: '-35% 0px -45% 0px' }).observe(sf);
    }
    // ふわっと現れる
    var rv = $$('.reveal');
    if ('IntersectionObserver' in window && !document.documentElement.classList.contains('capture')) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: 0.15 });
      rv.forEach(function (x) { io.observe(x); });
    } else rv.forEach(function (x) { x.classList.add('is-in'); });
    sf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      readSelf();
      var missing = $$('.q', sf).filter(function (q) { return !q.querySelector('input:checked'); });
      $$('.q', sf).forEach(function (q) { q.classList.toggle('is-missing', missing.indexOf(q) !== -1); });
      if (missing.length) {
        toast('まだ答えていない問いが ' + missing.length + ' 問あります');
        missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      state.self.done = true; save();
      renderResult(); renderCompare();
      $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    renderResult();
    renderInvite();
    $('#copyInvite').addEventListener('click', function () { copyText($('#inviteText').value); });
    if (navigator.share) {
      $('#shareInvite').hidden = false;
      $('#shareInvite').addEventListener('click', function () { navigator.share({ text: $('#inviteText').value }).catch(function () {}); });
    }

    $('#addCodes').addEventListener('click', function () {
      var raw = $('#codeInput').value;
      var codes = raw.match(/AW-[A-Za-z0-9_-]+/g) || [];
      var ok = 0, bad = 0, dup = 0;
      codes.forEach(function (c) {
        try { if (addResponse(decode(c), 'code')) ok++; else dup++; } catch (e) { bad++; }
      });
      var msg = $('#codeMsg');
      if (!codes.length) { msg.className = 'msg is-error'; msg.textContent = '「AW-」から始まる回答コードが見つかりませんでした。'; return; }
      msg.className = 'msg' + (bad ? ' is-error' : '');
      msg.textContent = ok + '件を追加しました。' + (dup ? '（' + dup + '件は追加済み）' : '') + (bad ? '（' + bad + '件は読み取れませんでした。コードが途中で切れていないか確かめてください）' : '');
      if (ok) { $('#codeInput').value = ''; save(); renderResponses(); renderCompare(); }
    });

    function buildManual() {
      buildOthersForm($('#manualForm'), state.mode, state.name, function (obj) {
        addResponse(obj, 'manual'); save(); renderResponses(); renderCompare();
        toast('回答を追加しました');
        buildManual();
        $('#manualWrap').hidden = true;
      });
    }
    buildManual();
    $('#openManual').addEventListener('click', function () {
      var w = $('#manualWrap'); w.hidden = !w.hidden;
      if (!w.hidden) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    renderResponses();
    $('#relFilter').addEventListener('change', renderCompare);
    renderCompare();
    renderReflect();
    renderStageList();

    $('#printBtn').addEventListener('click', function () { window.print(); });
    $('#resetBtn').addEventListener('click', function () {
      if (!confirm('自分の回答・集まった回答・メモをすべて消します。元に戻せません。よろしいですか？')) return;
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      location.href = location.pathname;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
