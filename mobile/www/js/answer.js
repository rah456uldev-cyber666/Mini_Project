/* Answering questions: online AI (Groq), local-network AI (Ollama on a laptop), or fully offline. */
(function () {
  "use strict";
  var MB = (window.MB = window.MB || {});

  var EMERGENCY = /chest pain|chest tightness|heart attack|can'?t breathe|cannot breathe|difficulty breathing|trouble breathing|not breathing|stopped breathing|choking|unconscious|unresponsive|fainted|passed out|severe bleeding|bleeding heavily|won'?t stop bleeding|stroke|face drooping|slurred speech|paralys|seizure|convulsion|fits\b|overdose|poison(ed|ing)?|snake ?bite|severe burn|electric shock|accident|head injury|drowning|anaphyla|throat swelling|coughing blood|vomiting blood|very high fever|labou?r pain|pregnan\w* bleeding/i;
  var SELF_HARM = /suicid|kill myself|self[- ]harm|end my life|want to die/i;
  /** Returns {level: "emergency"|"selfharm", text} or null. */
  MB.urgency = function (q) {
    if (SELF_HARM.test(q)) return { level: "selfharm", text: "If you are thinking about harming yourself, please talk to someone right now. Call Tele-MANAS 14416 (free, 24x7) or 112. You are not alone." };
    if (EMERGENCY.test(q)) return { level: "emergency", text: "This sounds like it could be a medical emergency. Call 108 for an ambulance now, or go to the nearest hospital." };
    return null;
  };

  var INTENTS = [
    ["symptoms", /symptom|sign|feel like|look like|indicat/i, "causes_and_symptoms", "Symptoms"],
    ["treatment", /treat|cure|medic|remed|therap|manage|drug|home care|get rid|heal/i, "treatment", "Treatment"],
    ["alternative", /remed|natural|herbal|home|alternative|ayurved|diet/i, "alternative_treatment", "Remedies / alternative treatment"],
    ["prevention", /prevent|avoid|protect|stop getting|reduce risk/i, "prevention", "Prevention"],
    ["causes", /cause|why|reason|risk factor|spread|catch|transmi/i, "causes_and_symptoms", "Causes"],
    ["diagnosis", /diagnos|test|detect|confirm|check for/i, "diagnosis", "Diagnosis"],
    ["prognosis", /prognos|outlook|recover|fatal|serious|how long|dangerous|die/i, "prognosis", "Outlook"]
  ];

  // The PDF text glues section headings onto the next sentence ("Treatment There is…"). Strip them.
  var HEADING_PREFIX = /^(?:Definition|Description|Purpose|Precautions|Treatment|Alternative treatment|Dietary changes|Diagnosis|Prognosis|Prevention|Causes and symptoms|Symptoms|Causes|Risks|Preparation|Aftercare|Home care|Drug therapy|Surgery|Medications?)\s+(?=[A-Z])/;
  function toPoints(text, max) {
    var t = String(text || "").trim();
    if (!t) return [];
    var parts = t.indexOf("•") >= 0 ? t.split(/\s*•\s*/) : sentences(t);
    return parts.map(function (x) { return x.trim().replace(HEADING_PREFIX, "").replace(/:$/, "."); }).filter(function (x) { return x.length > 3; })
      .slice(0, max || 5).map(function (x) { return x.length > 260 ? x.slice(0, 260).replace(/\s+\S*$/, "") + "…" : x; });
  }
  MB.toPoints = toPoints;
  function bullets(arr) { return arr.map(function (x) { return "- " + x; }).join("\n"); }

  function sentences(text) { return String(text || "").split(/(?<=[.!?])\s+(?=[A-Z•])/); }
  function firstSentences(text, n) { return sentences(text).slice(0, n).join(" "); }
  function bestSentences(text, query, n) {
    var q = MB.tokens(query), set = {}; q.forEach(function (t) { set[t] = 1; });
    var ranked = sentences(text).map(function (s, i) {
      var score = 0; MB.tokens(s).forEach(function (t) { if (set[t]) score += 1; });
      return { s: s, i: i, score: score };
    });
    var top = ranked.slice().sort(function (a, b) { return b.score - a.score || a.i - b.i; }).slice(0, n);
    return top.sort(function (a, b) { return a.i - b.i; }).map(function (x) {
      return x.s.length > 320 ? x.s.slice(0, 320).replace(/\s+\S*$/, "") + "…" : x.s;
    }).join(" ");
  }

  /** Offline answer (Markdown-style text) composed from the disease library and the encyclopedia. */
  MB.offlineAnswer = function (question, diseases, passages) {
    var out = [], sources = [], treatment = false;
    if (diseases.length) {
      diseases.forEach(function (d) {
        var picked = INTENTS.filter(function (it) { return it[1].test(question) && d[it[2]]; });
        out.push("## " + d.name);
        if (d.definition) out.push("> " + firstSentences(d.definition, 2));
        if (!picked.length) picked = INTENTS.filter(function (it) { return it[0] === "symptoms" || it[0] === "treatment"; });
        picked.forEach(function (it) {
          if (it[0] === "symptoms") {
            out.push("### Common symptoms");
            out.push(bullets(d.symptoms.length ? d.symptoms.slice(0, 12) : toPoints(bestSentences(d.causes_and_symptoms, "symptom sign include", 3), 4)));
          } else if (it[0] === "causes") {
            out.push("### Causes"); out.push(bullets(toPoints(bestSentences(d.causes_and_symptoms, question + " cause caused", 3), 4)));
          } else {
            if (it[0] === "treatment" || it[0] === "alternative") treatment = true;
            out.push("### " + (it[0] === "treatment" ? "Standard treatment" : it[3]));
            out.push(bullets(toPoints(d[it[2]], 5)));
          }
        });
        sources.push({ page: d.source_page, snippet: "Disease library: " + d.name, slug: d.slug });
      });
    } else if (passages.length) {
      var text = passages.slice(0, 3).map(function (p) { return p.t; }).join(" ");
      out.push("## From the encyclopedia");
      out.push(bullets(toPoints(bestSentences(text, question, 4), 5)));
      treatment = /treat|cure|medic|remed|therap/i.test(question);
    } else {
      out.push("## Not found");
      out.push("I could not find this in the encyclopedia on this device (it covers diseases from C to F). Try other words, or browse the Disease Library.");
    }
    passages.slice(0, 3).forEach(function (p) { sources.push({ page: p.p, snippet: p.t.slice(0, 200) }); });
    return { content: out.join("\n\n"), sources: sources, treatment: treatment };
  };

  /** Safe Markdown-lite renderer: ## title, ### heading, - bullets, > callout, **bold**. */
  MB.renderAnswer = function (md) {
    var E = MB.escape, html = [], list = false;
    function close() { if (list) { html.push("</ul>"); list = false; } }
    function inline(t) { return E(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
    String(md || "").split(/\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) { close(); return; }
      var m;
      if ((m = line.match(/^#{1,2}\s+(.*)/)) && !/^###/.test(line)) { close(); html.push("<h4>" + inline(m[1]) + "</h4>"); }
      else if ((m = line.match(/^#{3,6}\s+(.*)/))) { close(); html.push("<h5>" + inline(m[1].replace(/:$/, "")) + "</h5>"); }
      else if ((m = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)/))) { if (!list) { html.push("<ul>"); list = true; } html.push("<li>" + inline(m[1]) + "</li>"); }
      else if ((m = line.match(/^>\s?(.*)/))) { close(); html.push('<div class="callout">' + inline(m[1]) + "</div>"); }
      else if (/^\*\*[^*]+\*\*:?$/.test(line)) { close(); html.push("<h5>" + inline(line.replace(/\*\*/g, "").replace(/:$/, "")) + "</h5>"); }
      else { close(); html.push("<p>" + inline(line) + "</p>"); }
    });
    close();
    return html.join("");
  };

  var PROMPT = "You are Medibot, a careful medical information assistant.\n" +
    "Answer using ONLY the encyclopedia context and disease notes below. If they do not contain the answer, say so. Do not guess.\n" +
    "Format the answer so it is easy to read on a phone:\n" +
    "- First line: '## ' followed by a short title.\n" +
    "- Then 2-4 short sections, each starting with '### ' and a heading (for example: Overview, Symptoms, Standard treatment, Home care, When to see a doctor).\n" +
    "- Under each heading use '- ' bullet points, one short fact per line. No long paragraphs, no tables. Under 220 words in total.\n" +
    "- Never give a definitive diagnosis or exact drug doses.\n" +
    "{patient}\n\nRecent conversation:\n{history}\n\nDisease notes:\n{diseases}\n\nEncyclopedia context:\n{context}\n\nQuestion: {question}\n\nAnswer:";

  function diseaseNotes(d) {
    return ["Disease: " + d.name, d.definition && "Definition: " + d.definition,
      d.symptoms.length && "Common symptoms: " + d.symptoms.join("; "),
      d.treatment && "Treatment: " + d.treatment.slice(0, 600), d.prevention && "Prevention: " + d.prevention.slice(0, 300)]
      .filter(Boolean).join("\n").slice(0, 1500);
  }
  function buildPrompt(question, history, diseases, passages, patient) {
    var info = patient && (patient.age || patient.gender) ?
      "The question is about a patient: " + [patient.age && ("age " + patient.age), patient.gender].filter(Boolean).join(", ") + ". Consider this where relevant." : "";
    return PROMPT.replace("{patient}", info).replace("{history}", history.slice(-6).map(function (m) { return (m.role === "user" ? "User: " : "Assistant: ") + m.content.slice(0, 500); }).join("\n") || "(none)")
      .replace("{diseases}", diseases.map(diseaseNotes).join("\n\n") || "(none)")
      .replace("{context}", passages.map(function (p) { return "[page " + p.p + "] " + p.t; }).join("\n\n---\n\n") || "(nothing found)")
      .replace("{question}", question);
  }
  function timeout(ms) { var c = new AbortController(); setTimeout(function () { c.abort(); }, ms); return c.signal; }

  MB.groqModels = function (key) {
    return fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: "Bearer " + key }, signal: timeout(15000) })
      .then(function (r) { if (!r.ok) throw new Error("Groq error " + r.status + (r.status === 401 ? " (wrong API key)" : "")); return r.json(); })
      .then(function (j) {
        return (j.data || []).filter(function (m) { return m.active !== false && !/whisper|tts|guard|embed|playai/i.test(m.id); })
          .map(function (m) { return m.id; }).sort();
      });
  };
  function pickGroqModel(s) {
    if (s.groqModel) return Promise.resolve(s.groqModel);
    return MB.groqModels(s.groqKey).then(function (ids) {
      var pref = ids.filter(function (id) { return /llama|gpt-oss|qwen|gemma|mixtral/i.test(id); });
      var chosen = pref.filter(function (id) { return /instant|8b/i.test(id); })[0] || pref[0] || ids[0];
      if (!chosen) throw new Error("No chat models available for this Groq key");
      s.groqModel = chosen; MB.saveSettings(s);
      return chosen;
    });
  }
  function askGroq(prompt, s) {
    return pickGroqModel(s).then(function (model) {
      return fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: "Bearer " + s.groqKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model, temperature: 0.2, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
        signal: timeout(45000)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) {
            var msg = (j.error && j.error.message) || ("error " + r.status);
            if (/model/i.test(msg)) { s.groqModel = ""; MB.saveSettings(s); } // pick a new model next time
            throw new Error("Groq: " + msg);
          }
          return { text: j.choices[0].message.content.trim(), engine: "Online AI · " + model };
        });
      });
    });
  }
  function askOllama(prompt, s) {
    var url = s.ollamaUrl.replace(/\/+$/, "");
    return fetch(url + "/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: s.ollamaModel, stream: false, messages: [{ role: "user", content: prompt }],
        options: { temperature: 0.2, num_predict: 600 } }),
      signal: timeout(180000)
    }).then(function (r) {
      if (!r.ok) throw new Error("Ollama error " + r.status + (r.status === 404 ? " (model not installed: ollama pull " + s.ollamaModel + ")" : ""));
      return r.json();
    }).then(function (j) { return { text: (j.message && j.message.content || "").trim(), engine: "Local AI · " + s.ollamaModel }; });
  }
  MB.testOllama = function (url) {
    return fetch(url.replace(/\/+$/, "") + "/api/tags", { signal: timeout(5000) }).then(function (r) { return r.json(); })
      .then(function (j) { return (j.models || []).map(function (m) { return m.name; }); });
  };

  /** Library diseases whose symptoms/definition share the most words with the question. */
  MB.relatedDiseases = function (question, n) {
    var q = MB.tokens(question), set = {};
    q.forEach(function (t) { set[t] = 1; });
    if (!q.length) return [];
    return MB.diseases().map(function (d) {
      var score = 0, seen = {};
      MB.tokens(d.name + " " + d.symptoms.join(" ") + " " + (d.definition || "")).forEach(function (t) {
        if (set[t] && !seen[t]) { seen[t] = 1; score += MB.idf(t); }
      });
      return { d: d, score: score };
    }).filter(function (x) { return x.score > 6; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, n).map(function (x) { return x.d; });
  };

  /** Main entry: returns {content, sources, diseases, notice, engine}. */
  MB.answer = function (question, history, patient) {
    var s = MB.settings();
    var diseases = MB.findMentioned(question, 2);
    var urgency = MB.urgency(question);
    return MB.ensurePassages().then(function () {
      var lastUser = history.filter(function (m) { return m.role === "user"; }).slice(-1)[0];
      var query = question;
      // short follow-ups ("how is it treated?") borrow the previous question's topic
      if (lastUser && MB.tokens(question).length < 4 && !diseases.length) {
        query = lastUser.content + " " + question;
        diseases = MB.findMentioned(lastUser.content, 1);
      }
      var passages = MB.searchPassages(query, 4);
      var offline = MB.offlineAnswer(query, diseases, passages);
      var links = diseases.length ? diseases : MB.relatedDiseases(query, 3);
      var base = { sources: offline.sources, urgency: urgency, treatment: offline.treatment || /treat|cure|medic|remed|therap/i.test(question),
        diseases: links.map(function (d) { return { slug: d.slug, name: d.name }; }) };

      var engines = [];
      if (MB.isOnline() && s.groqKey) engines.push(askGroq);
      if (s.mode !== "offline" && s.ollamaUrl) engines.push(askOllama);
      var prompt = buildPrompt(question, history, diseases, passages, patient), errors = [];
      function tryNext(i) {
        if (i >= engines.length) {
          return Object.assign(base, { content: offline.content,
            engine: "Offline · on-device encyclopedia", engineNote: errors.length ? "AI unavailable: " + errors[errors.length - 1] : "" });
        }
        return engines[i](prompt, s).then(function (r) { return Object.assign(base, { content: r.text, engine: r.engine }); },
          function (e) { errors.push(e.name === "AbortError" ? "timed out" : e.message); return tryNext(i + 1); });
      }
      return tryNext(0);
    });
  };
})();
