/* On-device search: BM25 over encyclopedia passages + disease library helpers. No internet needed. */
(function () {
  "use strict";
  var MB = (window.MB = window.MB || {});
  var STOP = ("a an the and or of in on at to for with by from is are was were be been being it its this that these those " +
    "what which who whom how why when where do does did can could should would will may might i me my you your we our they " +
    "their he she his her them have has had about into than then there here not no yes if so as also any some more most very " +
    "tell explain please get got").split(" ");
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });

  function stem(w) {
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /es$/.test(w) && !/ses$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function tokens(text) {
    var out = [];
    String(text || "").toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/).forEach(function (w) {
      if (w.length > 2 && !STOPSET[w]) out.push(stem(w));
    });
    return out;
  }
  MB.tokens = tokens;

  var index = null;
  function buildIndex() {
    var docs = window.MB_PASSAGES || [], inv = {}, lens = new Array(docs.length), total = 0;
    for (var i = 0; i < docs.length; i++) {
      var tf = {}, toks = tokens(docs[i].t);
      lens[i] = toks.length; total += toks.length;
      for (var j = 0; j < toks.length; j++) tf[toks[j]] = (tf[toks[j]] || 0) + 1;
      for (var t in tf) (inv[t] || (inv[t] = [])).push(i, tf[t]);
    }
    index = { inv: inv, lens: lens, avg: total / Math.max(1, docs.length), n: docs.length };
  }
  MB.idf = function (term) {
    if (!index) buildIndex();
    var postings = index.inv[term], df = postings ? postings.length / 2 : 0;
    return Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
  };

  /** Load passages.js on first use (keeps app start fast). */
  MB.ensurePassages = function () {
    if (window.MB_PASSAGES) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "data/passages.js"; s.onload = resolve; s.onerror = function () { reject(new Error("Could not load encyclopedia data")); };
      document.head.appendChild(s);
    });
  };

  /** BM25 search. Returns [{p, t, score}] best first. */
  MB.searchPassages = function (query, k) {
    if (!index) buildIndex();
    var q = tokens(query), scores = {}, K1 = 1.4, B = 0.75;
    var uniq = {}; q.forEach(function (t) { uniq[t] = 1; });
    Object.keys(uniq).forEach(function (t) {
      var post = index.inv[t]; if (!post) return;
      var idf = MB.idf(t);
      for (var i = 0; i < post.length; i += 2) {
        var d = post[i], f = post[i + 1];
        scores[d] = (scores[d] || 0) + idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * index.lens[d] / index.avg));
      }
    });
    return Object.keys(scores).map(function (d) { return { d: +d, score: scores[d] }; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, k || 5)
      .map(function (r) { var doc = window.MB_PASSAGES[r.d]; return { p: doc.p, t: doc.t, score: r.score }; });
  };

  // ---------- disease library ----------
  var bySlug = {}, nameIndex = [];
  // Drop broken symptom fragments from the PDF (risk-factor list items, words cut at line ends).
  function goodSymptom(x) {
    return !/-$/.test(x) && x.split("(").length === x.split(")").length &&
      !/^(have|has|are|is|be|belong|being|was|were|had|the major|a |an |and |or |of |to |with )/i.test(x);
  }
  (window.MB_DISEASES || []).forEach(function (d) {
    bySlug[d.slug] = d;
    d.symptoms = (d.symptoms || []).filter(goodSymptom);
    var n = d.name.toLowerCase().replace(/’/g, "'"), variants = [n, n.replace(/\s*\(.*?\)/g, "")];
    if (n.indexOf(",") > 0) { var parts = n.split(","); variants.push(parts[1].trim() + " " + parts[0].trim()); }
    variants.forEach(function (v) { if (v.length >= 4) nameIndex.push([v, d.slug]); });
  });
  // Everyday words people type, mapped to the library entry they usually mean.
  var ALIASES = { "diabetes": "diabetes-mellitus", "sugar disease": "diabetes-mellitus", "dengue": "dengue-fever",
    "high cholesterol": "cholesterol-high", "cholesterol": "cholesterol-high", "depression": "depressive-disorders",
    "cold": "common-cold", "celiac": "celiac-disease", "carpal tunnel": "carpal-tunnel-syndrome",
    "heart attack": "coronary-artery-disease", "cystic fibrosis": "cystic-fibrosis", "flesh eating": "flesh-eating-disease",
    "loose motion": "diarrhea", "loose motions": "diarrhea", "pink eye": "conjunctivitis", "chicken pox": "chickenpox" };
  Object.keys(ALIASES).forEach(function (a) { if (bySlug[ALIASES[a]]) nameIndex.push([a, ALIASES[a]]); });
  nameIndex.sort(function (a, b) { return b[0].length - a[0].length; });

  MB.diseases = function () { return window.MB_DISEASES || []; };
  MB.disease = function (slug) { return bySlug[slug]; };
  MB.letters = function () {
    var l = {}; MB.diseases().forEach(function (d) { l[d.name[0].toUpperCase()] = 1; }); return Object.keys(l).sort();
  };
  MB.findMentioned = function (text, max) {
    var t = String(text || "").toLowerCase().replace(/’/g, "'"), found = [], seen = {};
    for (var i = 0; i < nameIndex.length && found.length < (max || 2); i++) {
      var name = nameIndex[i][0], slug = nameIndex[i][1];
      if (seen[slug]) continue;
      var re = new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "s?\\b");
      if (re.test(t)) { found.push(bySlug[slug]); seen[slug] = 1; t = t.replace(name, " "); }
    }
    return found;
  };
  MB.searchDiseases = function (q, letter) {
    q = String(q || "").trim().toLowerCase();
    var list = MB.diseases();
    if (q) {
      return list.map(function (d) {
        var rank = d.name.toLowerCase().indexOf(q) >= 0 ? 0 :
          d.symptoms.join(" | ").toLowerCase().indexOf(q) >= 0 ? 1 :
          ((d.causes_and_symptoms || "") + " " + (d.definition || "")).toLowerCase().indexOf(q) >= 0 ? 2 : 9;
        return { d: d, rank: rank };
      }).filter(function (x) { return x.rank < 9; })
        .sort(function (a, b) { return a.rank - b.rank || a.d.name.localeCompare(b.d.name); })
        .map(function (x) { return x.d; });
    }
    if (letter) return list.filter(function (d) { return d.name[0].toUpperCase() === letter; });
    return list;
  };
  MB.symptomCheck = function (text) {
    var terms = String(text || "").split(/[,;\n]+/).map(function (s) { return s.trim().toLowerCase(); })
      .filter(function (s) { return s.length >= 3; }).slice(0, 10);
    if (!terms.length) return { terms: [], results: [] };
    var results = [];
    MB.diseases().forEach(function (d) {
      var list = d.symptoms.join(" | ").toLowerCase(), body = ((d.causes_and_symptoms || "") + " " + (d.definition || "")).toLowerCase();
      var matched = [], score = 0;
      terms.forEach(function (t) {
        if (list.indexOf(t) >= 0) { matched.push(t); score += 2; } else if (body.indexOf(t) >= 0) { matched.push(t); score += 1; }
      });
      if (matched.length) results.push({ d: d, matched: matched, score: score });
    });
    results.sort(function (a, b) { return b.matched.length - a.matched.length || b.score - a.score || a.d.name.localeCompare(b.d.name); });
    return { terms: terms, results: results.slice(0, 10) };
  };
})();
