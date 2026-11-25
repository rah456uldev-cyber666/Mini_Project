/* Medibot app: screens and navigation. */
(function () {
  "use strict";
  var MB = window.MB, E = MB.escape, I = MB.icon;
  var view = document.getElementById("view"), tabbar = document.getElementById("tabbar"), topbar = document.getElementById("topbar");
  var flashMsg = null;

  MB.applyTheme();

  // ---------- small helpers ----------
  function flash(text, kind) { flashMsg = { text: text, kind: kind || "info" }; }
  function takeFlash() {
    if (!flashMsg) return "";
    var h = '<div class="flash ' + flashMsg.kind + '">' + E(flashMsg.text) + "</div>"; flashMsg = null; return h;
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function $(sel) { return view.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(view.querySelectorAll(sel)); }
  function on(sel, ev, fn) { var el = $(sel); if (el) el.addEventListener(ev, fn); }
  function busy(btn, yes, label) { if (!btn) return; btn.disabled = yes; if (label) btn.textContent = label; }
  function chrome(showTabs, showTop) {
    tabbar.hidden = !showTabs; topbar.hidden = showTop === false;
    document.body.classList.toggle("no-tabs", !showTabs);
  }
  function disclaimer() {
    return '<p class="disclaimer">Medibot gives general information from <em>The Gale Encyclopedia of Medicine</em>. ' +
      "It is not medical advice or a diagnosis. In an emergency, call 108.</p>";
  }
  function warningTag() { return '<div class="warning-tag">' + I("sos") + "<span>" + E(MB.WARNING_TAG) + "</span></div>"; }
  function treatmentDisclaimer() {
    return '<div class="med-disclaimer"><strong>Disclaimer:</strong> These results are based on sources (The Gale Encyclopedia of Medicine). ' +
      "For better diagnosis, consult a doctor. Do not start or stop any medicine without medical advice.</div>";
  }
  function pwField(name, label, auto) {
    return "<label>" + label + '<div class="pw-wrap"><input type="password" name="' + name + '" required minlength="' + (name === "pw" && auto === "current-password" ? 1 : 8) +
      '" autocomplete="' + auto + '" autocapitalize="none" autocorrect="off" spellcheck="false"><button type="button" class="pw-toggle" aria-label="Show password" data-pw="' + name + '">' + I("eye") + "</button></div></label>";
  }
  function wirePwToggles() {
    $$(".pw-toggle").forEach(function (b) {
      b.addEventListener("click", function () {
        var input = b.parentNode.querySelector("input"), show = input.type === "password";
        input.type = show ? "text" : "password";
        b.innerHTML = I(show ? "eyeOff" : "eye");
        b.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    });
  }
  function genderSeg(name, value) {
    return '<div class="seg">' + ["Male", "Female", "Other"].map(function (g) {
      return '<label><input type="radio" name="' + name + '" value="' + g + '"' + (value === g ? " checked" : "") + "><span>" + g + "</span></label>";
    }).join("") + "</div>";
  }

  // ---------- emergency call (with misuse warning) ----------
  function callSheet(number, name) {
    var m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><h2 style="margin-top:0">Call ' + E(name) + " (" + E(number) + ")?</h2>" +
      '<p class="muted">Tell the operator the patient\'s condition and your exact location.</p>' + warningTag() +
      '<div class="row" style="margin-top:1rem"><a class="button danger" style="flex:1" href="tel:' + E(number) + '" id="callNow">' + I("phone") + " Call " + E(number) + " now</a>" +
      '<button type="button" id="cancelCall" style="flex:1">Cancel</button></div></div>';
    document.body.appendChild(m);
    function close() { m.remove(); }
    m.addEventListener("click", function (e) { if (e.target === m) close(); });
    m.querySelector("#cancelCall").addEventListener("click", close);
    m.querySelector("#callNow").addEventListener("click", function () { setTimeout(close, 300); });
  }
  MB.callSheet = callSheet;
  document.getElementById("sosTop").addEventListener("click", function () { callSheet("108", "Ambulance"); });

  // ---------- status chip ----------
  function updateStatus() {
    var s = MB.settings(), el = document.getElementById("status"), online = MB.isOnline();
    var ai = online && s.groqKey ? "AI" : s.ollamaUrl && s.mode !== "offline" ? "Local AI" : "On-device";
    el.className = "status " + (online ? "on" : "off");
    el.innerHTML = '<span class="dot"></span>' + (online ? "Online" : "Offline") + " · " + ai;
  }
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  document.getElementById("status").addEventListener("click", function () { go("#/settings"); });

  // ======================= WELCOME =======================
  function welcomeView() {
    chrome(false, false);
    var feats = [
      ["chat", "Ask health questions", "Clear, point-by-point answers with sources"],
      ["wifiOff", "Works without internet", "Encyclopedia & 203 diseases stored on your phone"],
      ["sos", "Emergency help", "One tap to call 108, plus first-aid guides"],
      ["shield", "Private by design", "Your data stays on this device"]
    ];
    view.innerHTML = '<div class="welcome"><div class="welcome-top">' +
      '<img class="logo" src="icons/icon-192.png" alt="">' +
      "<h1>Your pocket medical companion</h1>" +
      '<p class="lead">Medibot answers your health questions from a trusted medical encyclopedia, online or offline.</p>' +
      '<div class="feature-list">' + feats.map(function (f, i) {
        return '<div class="feature" style="animation-delay:' + (0.25 + i * 0.08) + 's"><div class="fi">' + I(f[0]) + "</div><div><b>" + f[1] + "</b><small>" + f[2] + "</small></div></div>";
      }).join("") + "</div></div>" +
      '<div class="welcome-actions"><a class="button btn-white" href="#/register">Create free account</a>' +
      '<a class="button btn-outline-white" href="#/login">I already have an account</a>' +
      '<p class="fine">For education only. Not a substitute for a doctor.</p></div></div>';
    view.className = "";
  }

  // ======================= AUTH =======================
  function authShell(title, sub, body) {
    chrome(false, true);
    view.className = "container";
    return '<div class="narrow"><div class="auth-hero"><img src="icons/icon-192.png" alt=""><h1>' + title + '</h1><p class="muted">' + sub + "</p></div>" +
      takeFlash() + '<div class="card">' + body + "</div></div>";
  }

  function registerView() {
    var d = JSON.parse(sessionStorage.getItem("mb_reg_draft") || "{}");
    view.innerHTML = authShell("Create your account", "Takes a minute. We send a one-time code (OTP) to your email to verify you.",
      '<form id="f" autocomplete="on"><fieldset><legend>Account</legend>' +
      '<label>Full name<input name="name" required maxlength="80" autocomplete="name" value="' + E(d.name || "") + '"></label>' +
      '<label>Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="98765 43210" value="' + E(d.phone || "") + '"></label>' +
      '<label>Email address<input name="email" type="email" required autocomplete="email" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="you@gmail.com" value="' + E(d.email || "") + '"></label>' +
      '<small class="muted" style="margin:-.6rem 0 .9rem">Your one-time code (OTP) is sent to this email, free.</small>' +
      pwField("pw", "Password", "new-password") + '<small class="muted" style="margin:-.6rem 0 .9rem">At least 8 characters, with a letter and a number.</small>' +
      pwField("pw2", "Confirm password", "new-password") + "</fieldset>" +
      "<fieldset><legend>Patient details</legend>" +
      '<div class="grid2"><label>Age<input name="age" type="number" min="0" max="120" inputmode="numeric" required value="' + E(d.age || "") + '"></label>' +
      "<label>Gender" + genderSeg("gender", d.gender) + "</label></div>" +
      '<label>Address<textarea name="address" rows="2" maxlength="200" required placeholder="House, street, city, PIN">' + E(d.address || "") + "</textarea></label></fieldset>" +
      '<label class="check"><input type="checkbox" name="agree" required><span>I understand Medibot gives general information and is not a doctor.</span></label>' +
      '<button class="primary block" id="go">' + I("shield") + " Send OTP</button></form>" + warningTag() +
      '<p class="muted center" style="margin-bottom:0">Already registered? <a href="#/login">Log in</a></p>');
    wirePwToggles();
    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, errors = [], phone;
      var draft = { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), age: f.age.value, gender: (f.gender.value || ""), address: f.address.value.trim() };
      sessionStorage.setItem("mb_reg_draft", JSON.stringify(draft));
      if (draft.name.length < 2) errors.push("Please enter your full name.");
      try { phone = MB.normalizePhone(f.phone.value); } catch (err) { errors.push(err.message); }
      var probs = MB.passwordProblems(f.pw.value);
      if (probs.length) errors.push("Password needs " + probs.join(", ") + ".");
      if (f.pw.value !== f.pw2.value) errors.push("Passwords do not match.");
      if (!MB.validEmail(draft.email)) errors.push("Please enter a valid email address.");
      if (!draft.gender) errors.push("Please choose a gender.");
      if (!(+draft.age >= 0 && +draft.age <= 120) || draft.age === "") errors.push("Please enter a valid age.");
      if (phone && MB.users()[phone] && MB.users()[phone].verified) errors.push("This number is already registered on this device. Please log in.");
      if (errors.length) { flash(errors.join(" "), "error"); return registerView(); }
      busy($("#go"), true, "Sending OTP…");
      MB.hashPassword(f.pw.value).then(function (h) {
        return MB.sendOtp(phone, "register", { name: draft.name, email: draft.email, age: draft.age, gender: draft.gender, address: draft.address, salt: h.salt, hash: h.hash });
      }).then(function () { go("#/verify"); })
        .catch(function (err) { flash(err.message, "error"); registerView(); });
    });
  }

  function otpStatusBox(p) {
    if (p.mode === "email") return '<div class="sms-ok">' + I("shield") + " OTP sent to your email " + E(MB.maskEmail(p.email)) + ". Check your inbox (and the Spam folder). It may take a minute.</div>";
    if (p.mode === "sms") return '<div class="sms-ok">' + I("shield") + " OTP sent by SMS to " + E(MB.maskPhone(p.phone)) + ". It may take up to a minute.</div>";
    var reason = !MB.isOnline() ? "You are offline, so no email or SMS could be sent." :
      MB.otpConfigured() ? "The code could not be sent." : "Email OTP is not set up in this app yet.";
    return '<div class="otp-screen"><span class="demo-badge">DEMO MODE</span><p class="small" style="margin:.4rem 0">' + reason + " Use this code:</p>" +
      (p.shownCode ? '<div class="otp-code">' + E(p.shownCode) + "</div>" : "") +
      (!MB.otpConfigured() ? '<p class="small" style="margin:.4rem 0 0"><a href="#/settings?sms=1">Set up free email OTP →</a></p>' : "") + "</div>";
  }
  function resendButton() { return '<p class="center" style="margin:.9rem 0 0"><button type="button" class="link" id="resend">Resend code</button></p>'; }
  function wireResend(again) {
    var b = $("#resend"); if (!b) return;
    (function tick() {
      if (!document.body.contains(b)) return;
      var w = MB.resendWait();
      b.disabled = w > 0; b.textContent = w > 0 ? "Resend code in " + w + "s" : "Resend code";
      if (w > 0) setTimeout(tick, 1000);
    })();
    b.addEventListener("click", function () {
      var p = MB.pending(); b.disabled = true;
      var extra = {}; ["name", "email", "age", "gender", "address", "salt", "hash"].forEach(function (k) { if (p[k] !== undefined) extra[k] = p[k]; });
      MB.sendOtp(p.phone, p.purpose, extra).then(function () { flash("A new code has been issued.", "success"); again(); })
        .catch(function (err) { flash(err.message, "error"); again(); });
    });
  }

  function verifyView() {
    var p = MB.pending();
    if (!p || p.purpose !== "register") return go("#/register");
    view.innerHTML = authShell("Verify your account", "Enter the 6-digit code for " + E(p.email ? MB.maskEmail(p.email) : MB.maskPhone(p.phone)),
      otpStatusBox(p) + '<form id="f"><label>One-time code<input name="otp" class="otp" required inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label>' +
      '<button class="primary block">Verify and create account</button></form>' + resendButton());
    wireResend(verifyView);
    on("#f", "submit", function (e) {
      e.preventDefault();
      MB.verifyOtp(e.target.otp.value).then(function (p) {
        var users = MB.users();
        users[p.phone] = { name: p.name, email: p.email || "", age: p.age, gender: p.gender, address: p.address, salt: p.salt, hash: p.hash,
          verified: true, verifiedBy: p.mode === "screen" ? "demo" : p.mode, fails: 0, lockedUntil: 0, createdAt: MB.now() };
        MB.saveUsers(users); MB.setPending(null); sessionStorage.removeItem("mb_reg_draft");
        flash("Registration successful! Log in with your mobile number and password.", "success");
        sessionStorage.setItem("mb_last_phone", p.phone);
        go("#/login");
      }).catch(function (err) { flash(err.message, "error"); verifyView(); });
    });
  }

  function loginView() {
    var last = sessionStorage.getItem("mb_last_phone") || "";
    view.innerHTML = authShell("Welcome back", "Log in to continue to Medibot",
      '<form id="f"><label>Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" value="' + E(last.replace(MB.settings().countryCode, "")) + '"></label>' +
      pwField("pw", "Password", "current-password") +
      '<div class="row between" style="margin:-.3rem 0 1rem"><label class="check" style="margin:0"><input type="checkbox" name="remember" checked><span>Keep me logged in</span></label>' +
      '<a href="#/forgot" class="small">Forgot password?</a></div>' +
      '<button class="primary block" id="go">Log in</button></form>' + warningTag() +
      '<p class="muted center">New here? <a href="#/register">Create an account</a></p>' +
      '<p class="center small" style="margin-bottom:0"><a href="#/settings">' + I("gear") + " Settings (AI and OTP)</a></p>") + disclaimer();
    wirePwToggles();
    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, phone;
      try { phone = MB.normalizePhone(f.phone.value); } catch (err) { flash(err.message, "error"); return loginView(); }
      busy($("#go"), true, "Logging in…");
      MB.login(phone, f.pw.value).then(function (u) {
        MB.startSession(phone, f.remember.checked);
        flash("Welcome, " + u.name.split(" ")[0] + "!", "success");
        go("#/home");
      }).catch(function (err) { flash(err.message, "error"); loginView(); });
    });
  }

  function forgotView() {
    view.innerHTML = authShell("Reset password", "Enter your mobile number. We'll send a code to the email you registered with.",
      '<form id="f"><label>Mobile number<input name="phone" required inputmode="tel"></label>' +
      '<button class="primary block" id="go">Send reset code</button></form>' +
      '<p class="muted center" style="margin-bottom:0"><a href="#/login">Back to log in</a></p>');
    on("#f", "submit", function (e) {
      e.preventDefault();
      var phone;
      try { phone = MB.normalizePhone(e.target.phone.value); } catch (err) { flash(err.message, "error"); return forgotView(); }
      var u = MB.users()[phone];
      if (!u || !u.verified) { flash("No account with this number on this device.", "error"); return forgotView(); }
      busy($("#go"), true, "Sending…");
      MB.sendOtp(phone, "reset", { email: u.email || null, name: u.name }).then(function () { go("#/reset"); })
        .catch(function (err) { flash(err.message, "error"); forgotView(); });
    });
  }

  function resetView() {
    var p = MB.pending();
    if (!p || p.purpose !== "reset") return go("#/forgot");
    view.innerHTML = authShell("Choose a new password", "Code for " + E(p.email ? MB.maskEmail(p.email) : MB.maskPhone(p.phone)),
      otpStatusBox(p) + '<form id="f"><label>One-time code<input name="otp" class="otp" required inputmode="numeric" maxlength="6"></label>' +
      pwField("pw", "New password", "new-password") + pwField("pw2", "Confirm new password", "new-password") +
      '<button class="primary block">Update password</button></form>' + resendButton());
    wirePwToggles(); wireResend(resetView);
    on("#f", "submit", function (e) {
      e.preventDefault();
      var f = e.target, probs = MB.passwordProblems(f.pw.value);
      if (probs.length) { flash("Password needs " + probs.join(", ") + ".", "error"); return resetView(); }
      if (f.pw.value !== f.pw2.value) { flash("Passwords do not match.", "error"); return resetView(); }
      MB.verifyOtp(f.otp.value).then(function (p) {
        return MB.hashPassword(f.pw.value).then(function (h) {
          var users = MB.users(), u = users[p.phone];
          u.salt = h.salt; u.hash = h.hash; u.fails = 0; u.lockedUntil = 0;
          MB.saveUsers(users); MB.setPending(null);
          sessionStorage.setItem("mb_last_phone", p.phone);
          flash("Password updated. Please log in.", "success"); go("#/login");
        });
      }).catch(function (err) { flash(err.message, "error"); resetView(); });
    });
  }

  // ======================= PATIENT PICKER =======================
  function patientChip(user, extraClass) {
    var p = MB.activePatient(user);
    return '<button type="button" class="patient-chip ' + (extraClass || "") + '" id="pickPatient"><span class="avatar">' + E(MB.initials(p.name)) + "</span>" +
      E(p.name.split(" ")[0]) + (MB.patientLabel(p) ? " · " + E(MB.patientLabel(p)) : "") + " ▾</button>";
  }
  function wirePatientChip(user, after) {
    on("#pickPatient", "click", function () {
      var m = document.createElement("div"), active = MB.activePatient(user);
      m.className = "modal";
      m.innerHTML = '<div class="sheet"><h2 style="margin-top:0">Who is this for?</h2><div class="list">' + MB.patients(user).map(function (p) {
        return '<a href="#" data-id="' + E(p.id) + '"><span class="avatar lg">' + E(MB.initials(p.name)) + '</span><span class="grow"><b>' + E(p.name) +
          '</b><span class="muted small ellipsis">' + E([p.relation, MB.patientLabel(p)].filter(Boolean).join(" · ")) + "</span></span>" + (p.id === active.id ? "✓" : "") + "</a>";
      }).join("") + '</div><div class="row" style="margin-top:1rem"><a class="button" style="flex:1" href="#/profile">' + I("plus") + ' Add family member</a><button type="button" style="flex:1" id="closeSheet">Close</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener("click", function (e) {
        var a = e.target.closest("a[data-id]");
        if (a) { e.preventDefault(); MB.setActivePatient(user, a.dataset.id); m.remove(); after(); }
        else if (e.target === m || e.target.id === "closeSheet" || e.target.closest("a[href='#/profile']")) m.remove();
      });
    });
  }

  // ======================= HOME =======================
  function homeView(user) {
    var hour = new Date().getHours(), greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    var p = MB.activePatient(user), tip = MB.dailyTip(), hist = MB.history(user.phone, p.id).filter(function (m) { return m.role === "user"; }).slice(-3).reverse();
    var actions = [["#/chat", "chat", "Ask Medibot", "c1"], ["#/checker", "steth", "Symptom checker", "c2"], ["#/library", "book", "Disease library", "c5"],
      ["#/emergency", "heart", "First aid", "c3"], ["#/bmi", "scale", "BMI check", "c6"], ["#/saved", "star", "Saved", "c4"]];
    view.innerHTML = takeFlash() +
      '<div class="hello"><p>' + greet + ",</p><h1>" + E(user.name.split(" ")[0]) + " 👋</h1>" + patientChip(user) +
      '<a class="ask-bar" href="#/chat">' + I("search") + " Ask about symptoms, diseases, treatment…</a></div>" +
      '<button class="sos-card" id="sos"><span class="big">108</span><span><b>Emergency? Call an ambulance</b><small>Free, 24x7 across India. Use only in a real emergency.</small></span></button>' +
      '<div class="actions">' + actions.map(function (a) {
        return '<a class="action" href="' + a[0] + '"><span class="ai ' + a[3] + '">' + I(a[1]) + "</span>" + a[2] + "</a>";
      }).join("") + "</div>" +
      (tip ? '<h2>Health tip of the day</h2><div class="tip"><div class="label">' + I("sparkle") + " Prevention · " + E(tip.disease.name) + "</div><p style=\"margin:.4rem 0 .2rem\">" + E(tip.text) +
        '</p><a class="small" href="#/disease/' + encodeURIComponent(tip.disease.slug) + '">Read more</a></div>' : "") +
      (hist.length ? '<h2>Recent questions</h2><div class="list">' + hist.map(function (m) {
        return '<a href="#/chat">' + I("clock") + '<span class="grow ellipsis">' + E(m.content) + "</span></a>"; }).join("") + "</div>" : "") +
      disclaimer();
    on("#sos", "click", function () { callSheet("108", "Ambulance"); });
    wirePatientChip(user, function () { homeView(user); });
  }

  // ======================= CHAT =======================
  var SUGGESTIONS = ["What are the symptoms of dengue fever?", "How is diabetes mellitus treated?",
    "What causes cataracts?", "How can I prevent food poisoning?"];

  function userMsgHtml(m) { return '<div class="msg user"><div class="bubble">' + MB.nl2br(m.content) + "</div></div>"; }
  function botMsgHtml(m, idx) {
    var h = '<div class="msg bot"><img class="bot-av" src="icons/icon-192.png" alt=""><div class="bubble">';
    var urg = m.urgency || (m.notice ? { level: "emergency", text: m.notice } : null);
    if (urg) {
      h += '<div class="emergency-card"><b>' + I("sos") + (urg.level === "selfharm" ? " You matter. Help is available." : " Possible emergency") + "</b><div class=\"small\" style=\"margin-top:.3rem\">" + E(urg.text) + "</div>" +
        '<div class="row">' + (urg.level === "selfharm" ? '<button class="danger mini" data-call="14416|Tele-MANAS">' + I("phone") + " Call 14416</button>" : "") +
        '<button class="danger mini" data-call="108|Ambulance">' + I("phone") + " Call 108 Ambulance</button>" +
        '<a class="button mini" href="#/emergency">First aid</a></div><div class="small" style="margin-top:.5rem;color:var(--danger);font-weight:600">' + E(MB.WARNING_TAG) + "</div></div>";
    }
    h += '<div class="answer">' + MB.renderAnswer(m.content) + "</div>";
    if (m.treatment) h += treatmentDisclaimer();
    if (m.diseases && m.diseases.length) {
      h += '<div class="related">' + m.diseases.map(function (d) {
        return '<a href="#/disease/' + encodeURIComponent(d.slug) + '">' + I("book") + " " + E(d.name) + "</a>"; }).join("") + "</div>";
    }
    if (m.sources && m.sources.length) {
      h += '<details class="sources"><summary>Sources (' + m.sources.length + ")</summary><ul>" + m.sources.map(function (s) {
        return "<li><strong>Page " + E(s.page) + "</strong>: " + E(s.snippet) + "…</li>"; }).join("") + "</ul></details>";
    }
    h += '<div class="answer-foot"><span class="engine-chip" title="' + E(m.engineNote || "") + '">' + I(/Offline/.test(m.engine || "") ? "wifiOff" : "sparkle") + " " + E(m.engine || "Medibot") + "</span>" +
      '<button class="mini" data-copy="' + idx + '">' + I("copy") + " Copy</button>" +
      ("speechSynthesis" in window ? '<button class="mini" data-speak="' + idx + '">' + I("speaker") + " Listen</button>" : "") + "</div>";
    return h + "</div></div>";
  }
  function plainText(md) { return String(md || "").replace(/^#+\s*/gm, "").replace(/^>\s?/gm, "").replace(/\*\*/g, ""); }

  function chatView(user) {
    var patient = MB.activePatient(user), msgs = MB.history(user.phone, patient.id);
    view.innerHTML = takeFlash() + '<div class="chat-head"><h1>Ask Medibot</h1>' + patientChip(user) + "</div>" +
      '<div id="box" class="chat-box">' + (msgs.length ? msgs.map(function (m, i) { return m.role === "user" ? userMsgHtml(m) : botMsgHtml(m, i); }).join("") :
        '<div class="empty-chat" id="empty"><img src="icons/icon-192.png" alt=""><h2>How can I help ' + (patient.id === "self" ? "you" : E(patient.name.split(" ")[0])) + ' today?</h2>' +
        '<p class="muted small">Answers come from <em>The Gale Encyclopedia of Medicine</em>, point by point, with page numbers.</p>' +
        '<div class="suggestions">' + SUGGESTIONS.map(function (s) { return '<button type="button" class="chip">' + I("sparkle") + " " + E(s) + "</button>"; }).join("") + "</div></div>") +
      "</div>" +
      '<form id="f" class="composer"><div class="composer-inner"><textarea id="q" rows="1" placeholder="Type your health question…" maxlength="1000" required></textarea>' +
      '<button class="primary send-btn" id="send" aria-label="Send">' + I("send") + "</button></div></form>" +
      (msgs.length ? '<p class="center"><button type="button" class="link small" id="clearChat">Clear this conversation</button></p>' : "");
    var box = $("#box"), q = $("#q"), send = $("#send");
    if (box.lastElementChild) box.lastElementChild.scrollIntoView({ block: "end" });
    function autosize() { q.style.height = "auto"; q.style.height = Math.min(160, q.scrollHeight) + "px"; }
    q.addEventListener("input", autosize);

    function ask(text) {
      text = text.trim(); if (!text || send.disabled) return;
      var empty = $("#empty"); if (empty) empty.remove();
      var history = MB.history(user.phone, patient.id), um = { role: "user", content: text, at: MB.now() };
      box.insertAdjacentHTML("beforeend", userMsgHtml(um) +
        '<div class="msg bot" id="typing"><img class="bot-av" src="icons/icon-192.png" alt=""><div class="bubble"><span class="typing-dots"><i></i><i></i><i></i></span> <span class="muted small">Searching the encyclopedia…</span></div></div>');
      $("#typing").scrollIntoView({ behavior: "smooth", block: "end" });
      send.disabled = true;
      MB.answer(text, history, patient).then(function (r) {
        var am = Object.assign({ role: "assistant", at: MB.now() }, r), all = history.concat([um, am]);
        MB.saveHistory(user.phone, all, patient.id);
        $("#typing").remove();
        box.insertAdjacentHTML("beforeend", botMsgHtml(am, all.length - 1));
      }).catch(function (err) {
        $("#typing").remove();
        box.insertAdjacentHTML("beforeend", botMsgHtml({ role: "assistant", content: "## Sorry\nSomething went wrong: " + err.message }, -1));
      }).then(function () {
        send.disabled = false;
        var last = box.lastElementChild; if (last) last.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    on("#f", "submit", function (e) { e.preventDefault(); var t = q.value; q.value = ""; autosize(); ask(t); });
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); $("#f").requestSubmit(); }
    });
    $$(".chip").forEach(function (c) { c.addEventListener("click", function () { ask(c.textContent); }); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var all = MB.history(user.phone, patient.id);
      if (b.dataset.call) { var parts = b.dataset.call.split("|"); callSheet(parts[0], parts[1]); }
      else if (b.dataset.copy) {
        var m = all[+b.dataset.copy]; if (!m) return;
        (navigator.clipboard ? navigator.clipboard.writeText(plainText(m.content)) : Promise.reject()).then(function () { b.textContent = "Copied ✓"; }, function () { b.textContent = "Copy failed"; });
      } else if (b.dataset.speak) {
        var mm = all[+b.dataset.speak]; if (!mm) return;
        if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
        var u = new SpeechSynthesisUtterance(plainText(mm.content)); u.lang = "en-IN"; speechSynthesis.speak(u);
      }
    });
    on("#clearChat", "click", function () { if (confirm("Clear this conversation?")) { MB.saveHistory(user.phone, [], patient.id); chatView(user); } });
    wirePatientChip(user, function () { chatView(user); });
  }

  // ======================= LIBRARY =======================
  function libraryView(params) {
    var q = params.q || "", letter = params.letter || "";
    var list = MB.searchDiseases(q, letter);
    view.innerHTML = "<h1>Disease library</h1>" +
      '<p class="muted">' + MB.diseases().length + " diseases with symptoms, standard treatment, remedies and prevention. Works offline.</p>" +
      '<form id="f" class="search"><div class="search-box">' + I("search") + '<input name="q" value="' + E(q) + '" placeholder="Search disease or symptom"></div><button class="primary">Search</button></form>' +
      '<div class="letters"><a href="#/library" class="' + (!letter && !q ? "active" : "") + '">All</a>' +
      MB.letters().map(function (l) { return '<a href="#/library?letter=' + l + '" class="' + (l === letter ? "active" : "") + '">' + l + "</a>"; }).join("") + "</div>" +
      (q ? '<p class="muted">' + list.length + " result(s) for “" + E(q) + "”</p>" : "") +
      '<div class="grid">' + (list.map(function (d) {
        var t = d.definition || d.description || "";
        return '<a class="tile" href="#/disease/' + encodeURIComponent(d.slug) + '"><h3>' + E(d.name) + "</h3><p>" + E(t.slice(0, 120)) + (t.length > 120 ? "…" : "") + "</p></a>";
      }).join("") || "<p>No diseases found.</p>") + "</div>";
    on("#f", "submit", function (e) { e.preventDefault(); go("#/library?q=" + encodeURIComponent(e.target.q.value.trim())); });
  }

  function diseaseView(slug, user) {
    var d = MB.disease(slug);
    if (!d) { view.innerHTML = '<p>Not found. <a href="#/library">Back to the library</a></p>'; return; }
    var saved = MB.saved(user.phone).indexOf(slug) >= 0;
    function sec(icon, color, title, text, max, cls) {
      if (!text) return "";
      var pts = MB.toPoints(text, max || 5), rest = text.length > 600;
      return '<section class="dsection ' + (cls || "") + '"><h2><span class="si ' + color + '">' + I(icon) + "</span>" + title + '</h2><ul class="points">' +
        pts.map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul>" +
        (rest ? "<details><summary>Read full text</summary><p>" + MB.nl2br(text) + "</p></details>" : "") + "</section>";
    }
    view.innerHTML = '<div class="dhero"><a href="#/library" class="small">' + I("back") + " Disease library</a><h1>" + E(d.name) + "</h1>" +
      "<p>" + E(MB.toPoints(d.definition, 2).join(" ")) + "</p>" +
      '<div class="row"><button type="button" id="save">' + I("star") + (saved ? " Saved" : " Save") + '</button><a class="button" href="#/chat" id="askAbout">' + I("chat") + " Ask Medibot</a></div></div>" +
      (d.symptoms.length ? '<section class="dsection"><h2><span class="si c2">' + I("steth") + '</span>Common symptoms</h2><div class="symptom-grid">' +
        d.symptoms.map(function (s) { return "<span>" + E(s) + "</span>"; }).join("") + "</div></section>" : "") +
      sec("pill", "c1", "Standard treatment (cure)", d.treatment, 6, "cure") +
      (d.treatment ? treatmentDisclaimer().replace("med-disclaimer", "med-disclaimer\" style=\"margin:-.4rem 0 .85rem") : "") +
      sec("heart", "c4", "Remedies and alternative treatment", d.alternative_treatment, 5) +
      sec("shield", "c6", "Prevention", d.prevention, 5) +
      sec("search", "c5", "Causes and symptoms", d.causes_and_symptoms, 5) +
      sec("steth", "c2", "Diagnosis", d.diagnosis, 4) +
      sec("sparkle", "c3", "Outlook (prognosis)", d.prognosis, 3) +
      '<p class="muted small center">Source: The Gale Encyclopedia of Medicine, PDF page ' + E(d.source_page) + ". Information may be dated; consult a doctor.</p>";
    on("#save", "click", function () { var now = MB.toggleSaved(user.phone, slug); $("#save").innerHTML = I("star") + (now ? " Saved" : " Save"); });
    on("#askAbout", "click", function (e) { e.preventDefault(); sessionStorage.setItem("mb_prefill", "Tell me about " + d.name); go("#/chat"); });
    window.scrollTo(0, 0);
  }

  function savedView(user) {
    var list = MB.saved(user.phone).map(MB.disease).filter(Boolean);
    view.innerHTML = "<h1>Saved diseases</h1>" + (list.length ? '<div class="grid">' + list.map(function (d) {
      return '<a class="tile" href="#/disease/' + encodeURIComponent(d.slug) + '"><h3>' + E(d.name) + "</h3><p>" + E((d.definition || "").slice(0, 110)) + "…</p></a>"; }).join("") + "</div>" :
      '<div class="card center"><p>' + I("star") + ' Nothing saved yet.</p><p class="muted small">Tap “Save” on any disease to keep it here.</p><a class="button primary" href="#/library">Browse the library</a></div>');
  }

  // ======================= SYMPTOM CHECKER =======================
  var COMMON = ["fever", "headache", "cough", "sore throat", "runny nose", "rash", "itching", "vomiting", "nausea", "diarrhea", "abdominal pain",
    "fatigue", "dizziness", "chest pain", "shortness of breath", "joint pain", "back pain", "swelling", "weight loss", "blurred vision"];
  function checkerView(params) {
    var text = params.s || "", r = text ? MB.symptomCheck(text) : null, chosen = text.split(",").map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
    view.innerHTML = "<h1>Symptom checker</h1>" +
      '<p class="muted">Tap your symptoms or type them, separated by commas.</p>' +
      '<div class="chips" id="common">' + COMMON.map(function (c) { return '<button type="button" class="' + (chosen.indexOf(c) >= 0 ? "on" : "") + '">' + c + "</button>"; }).join("") + "</div>" +
      '<form id="f" class="search"><div class="search-box">' + I("steth") + '<input name="s" value="' + E(text) + '" placeholder="e.g. fever, headache, rash" required></div><button class="primary">Check</button></form>' +
      '<div class="notice">For learning only, it cannot diagnose you. If you feel unwell, see a doctor. In an emergency call 108.</div>' +
      (r ? (r.results.length ? '<div class="stack">' + r.results.map(function (x) {
        var pct = Math.round(100 * x.matched.length / r.terms.length);
        return '<a class="tile" href="#/disease/' + encodeURIComponent(x.d.slug) + '"><h3>' + E(x.d.name) + '<span class="badge">' + x.matched.length + "/" + r.terms.length + " match</span></h3>" +
          '<div class="bar"><i style="width:' + pct + '%"></i></div><p>Matches: ' + E(x.matched.join(", ")) + "</p></a>";
      }).join("") + "</div>" : "<p>No matching conditions found. Try simpler words like “fever” or “cough”.</p>") : "");
    $$("#common button").forEach(function (b) {
      b.addEventListener("click", function () {
        var input = $("#f").s, items = input.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean), i = items.indexOf(b.textContent);
        if (i >= 0) items.splice(i, 1); else items.push(b.textContent);
        input.value = items.join(", "); b.classList.toggle("on");
      });
    });
    on("#f", "submit", function (e) { e.preventDefault(); go("#/checker?s=" + encodeURIComponent(e.target.s.value)); });
  }

  // ======================= EMERGENCY =======================
  function emergencyView(user) {
    view.innerHTML = '<div class="em-hero"><h1 style="margin:0">Emergency</h1><p style="margin:.2rem 0 0;opacity:.9">Tap to call an ambulance</p>' +
      '<button class="call-108" id="call108"><span><span class="num">108</span><br><span class="lbl">AMBULANCE</span></span></button>' + warningTag() + "</div>" +
      '<h2>Your location for the operator</h2><div class="card"><p style="margin-top:0"><b>' + E(user.name) + "</b>" + (user.address ? "<br>" + E(user.address) : "") + "</p>" +
      '<button type="button" id="loc">' + I("pin") + ' Show my GPS location</button><p id="locOut" class="small muted" style="margin-bottom:0"></p></div>' +
      '<h2>Helplines</h2><div class="list helplines">' + MB.HELPLINES.map(function (h) {
        return '<a href="#" data-call="' + E(h.num) + "|" + E(h.name) + '">' + I("phone") + '<span class="grow"><b>' + E(h.name) + '</b><span class="small muted ellipsis">' + E(h.note) + '</span></span><span class="num">' + E(h.num) + "</span></a>";
      }).join("") + "</div>" +
      '<a class="button block" style="margin-top:.8rem" href="https://www.google.com/maps/search/hospital+near+me" target="_blank" rel="noopener">' + I("hospital") + " Find nearby hospitals (needs internet)</a>" +
      '<h2>First aid guides</h2><div class="list">' + MB.FIRST_AID.map(function (a) {
        return '<details class="aid"><summary><span class="ai ' + a.c + '" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff">' + I("heart") + "</span>" + E(a.t) +
          "</summary><ol>" + a.s.map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ol></details>";
      }).join("") + "</div>" +
      '<p class="disclaimer">First-aid steps are general guidance. Always call 108 for serious situations and follow the operator\'s instructions.</p>';
    on("#call108", "click", function () { callSheet("108", "Ambulance"); });
    $$("[data-call]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); var p = a.dataset.call.split("|"); callSheet(p[0], p[1]); }); });
    on("#loc", "click", function () {
      var out = $("#locOut");
      if (!navigator.geolocation) { out.textContent = "Location is not available on this device."; return; }
      out.textContent = "Finding your location…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude.toFixed(5), lon = pos.coords.longitude.toFixed(5);
        out.innerHTML = "Latitude <b>" + lat + "</b>, Longitude <b>" + lon + "</b> (±" + Math.round(pos.coords.accuracy) + " m). Read this to the operator." +
          '<br><a href="https://maps.google.com/?q=' + lat + "," + lon + '" target="_blank" rel="noopener">Open in Maps</a>';
      }, function (err) { out.textContent = "Could not get location: " + err.message + ". Turn on GPS and allow location for Medibot."; },
      { enableHighAccuracy: true, timeout: 15000 });
    });
  }

  // ======================= BMI =======================
  function bmiView(user) {
    view.innerHTML = "<h1>BMI check</h1><p class=\"muted\">Body Mass Index, using the cut-offs recommended for Indian adults.</p>" +
      '<div class="card"><form id="f"><div class="grid2"><label>Weight (kg)<input name="kg" type="number" step="0.1" min="2" max="400" required inputmode="decimal"></label>' +
      '<label>Height (cm)<input name="cm" type="number" step="0.1" min="40" max="250" required inputmode="decimal"></label></div>' +
      '<button class="primary block">Calculate</button></form><div id="out"></div></div>' +
      '<p class="disclaimer">BMI is a screening number, not a diagnosis. It is not meant for children, pregnant women or athletes.</p>';
    on("#f", "submit", function (e) {
      e.preventDefault();
      var r = MB.bmi(+e.target.kg.value, +e.target.cm.value);
      var color = r.category === "Normal" ? "var(--success)" : r.category === "Underweight" ? "#d97706" : "var(--danger)";
      var advice = { Underweight: "Eat regular balanced meals with enough protein; see a doctor if you are losing weight without trying.",
        Normal: "Great! Keep up a balanced diet and at least 30 minutes of activity most days.",
        Overweight: "Small changes help: more vegetables, fewer sugary drinks, and daily walking.",
        Obese: "Talk to a doctor about a safe plan; this raises the risk of diabetes and heart disease." }[r.category];
      $("#out").innerHTML = '<div class="center" style="margin-top:1rem"><div style="font-size:2.6rem;font-weight:800;color:' + color + '">' + r.value + "</div><b>" + r.category +
        '</b><p class="muted small">' + advice + "</p></div>";
    });
  }

  // ======================= PROFILE =======================
  function profileView(user) {
    var family = MB.patients(user).slice(1);
    view.innerHTML = takeFlash() + '<div class="row" style="gap:.9rem;margin-bottom:1rem"><span class="avatar lg">' + E(MB.initials(user.name)) + "</span><div><h1 style=\"margin:0\">" + E(user.name) +
      '</h1><span class="muted small">' + E(MB.maskPhone(user.phone)) + (user.verifiedBy === "email" ? " · verified by email" : user.verifiedBy === "sms" ? " · verified by SMS" : user.verifiedBy === "demo" ? " · verified in demo mode" : "") + "</span></div></div>" +
      '<div class="card"><h2 style="margin-top:0">My details</h2><form id="me"><label>Full name<input name="name" required value="' + E(user.name) + '"></label>' +
      '<label>Email address<input name="email" type="email" value="' + E(user.email || "") + '" placeholder="Used for password reset codes"></label>' +
      '<div class="grid2"><label>Age<input name="age" type="number" min="0" max="120" value="' + E(user.age || "") + '"></label><label>Gender' + genderSeg("gender", user.gender) + "</label></div>" +
      '<label>Address<textarea name="address" rows="2" maxlength="200">' + E(user.address || "") + "</textarea></label>" +
      '<button class="primary block">Save my details</button></form></div>' +
      '<div class="card"><h2 style="margin-top:0">Family members</h2><p class="muted small">Ask questions on behalf of family members; each has a separate chat history.</p>' +
      (family.length ? '<div class="list" style="margin-bottom:1rem">' + family.map(function (p) {
        return '<div class="item"><span class="avatar">' + E(MB.initials(p.name)) + '</span><span class="grow"><b>' + E(p.name) + '</b><span class="small muted ellipsis">' +
          E([p.relation, MB.patientLabel(p)].filter(Boolean).join(" · ")) + '</span></span><button class="mini" data-del="' + E(p.id) + '" aria-label="Remove">' + I("trash") + "</button></div>";
      }).join("") + "</div>" : "") +
      '<form id="fam"><div class="grid2"><label>Name<input name="name" required maxlength="60"></label><label>Relation<select name="relation">' +
      ["Mother", "Father", "Spouse", "Son", "Daughter", "Brother", "Sister", "Grandparent", "Other"].map(function (r) { return "<option>" + r + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="grid2"><label>Age<input name="age" type="number" min="0" max="120" required></label><label>Gender' + genderSeg("fgender", "") + "</label></div>" +
      '<button class="block">' + I("plus") + " Add family member</button></form></div>" +
      '<div class="card"><div class="list"><a href="#/saved">' + I("star") + '<span class="grow">Saved diseases</span>›</a><a href="#/bmi">' + I("scale") + '<span class="grow">BMI check</span>›</a>' +
      '<a href="#/settings">' + I("gear") + '<span class="grow">Settings (AI, OTP, theme)</span>›</a></div>' +
      '<button class="block" style="margin-top:1rem" id="logout">Log out</button></div>';
    on("#me", "submit", function (e) {
      e.preventDefault(); var f = e.target;
      if (f.email.value.trim() && !MB.validEmail(f.email.value)) { flash("Please enter a valid email address.", "error"); return profileView(user); }
      MB.updateUser(user.phone, { name: f.name.value.trim() || user.name, email: f.email.value.trim(), age: f.age.value, gender: f.gender.value, address: f.address.value.trim() });
      flash("Your details were saved.", "success"); render();
    });
    on("#fam", "submit", function (e) {
      e.preventDefault(); var f = e.target;
      if (!f.fgender.value) { flash("Please choose a gender for the family member.", "error"); return profileView(user); }
      var list = MB.patients(user).slice(1);
      list.push({ id: "p" + MB.now().toString(36), name: f.name.value.trim(), relation: f.relation.value, age: f.age.value, gender: f.fgender.value, address: user.address || "" });
      MB.saveFamily(user, list); flash(f.name.value.trim() + " was added. Choose them from the patient button in Chat.", "success"); profileView(user);
    });
    $$("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Remove this family member and their chat history?")) return;
        MB.saveFamily(user, MB.patients(user).slice(1).filter(function (p) { return p.id !== b.dataset.del; }));
        MB.saveHistory(user.phone, [], b.dataset.del);
        if (MB.activePatient(user).id === b.dataset.del) MB.setActivePatient(user, "self");
        profileView(user);
      });
    });
    on("#logout", "click", function () { MB.logout(); flash("You have been logged out.", "info"); go("#/login"); });
  }

  // ======================= SETTINGS =======================
  function settingsView(user, params) {
    var s = MB.settings();
    chrome(!!user, true);
    function field(label, name, value, extra) { return "<label>" + label + '<input name="' + name + '" value="' + E(value) + '" ' + (extra || "") + "></label>"; }
    var otpState = MB.emailConfigured() ? '<div class="sms-ok">' + I("shield") + " Email OTP is set up. Codes are emailed to users when online (free).</div>" :
      MB.smsConfigured() ? '<div class="sms-ok">' + I("shield") + " Paid SMS is set up. Codes are sent by SMS when online.</div>" :
      '<div class="otp-screen" style="text-align:left"><span class="demo-badge">DEMO MODE</span><p class="small" style="margin:.4rem 0 0">Real OTP is not set up, so codes are shown on screen. Follow the steps below once (free, about 10 minutes) to email real codes.</p></div>';
    view.innerHTML = takeFlash() + (user ? "" : '<p><a href="#/login">' + I("back") + " Back to log in</a></p>") + "<h1>Settings</h1>" +
      '<form id="f">' +
      '<div class="card" id="smsCard"><h2 style="margin-top:0">' + I("shield") + " Real OTP by email (free)</h2>" + otpState +
      '<details' + (params && params.sms || !MB.otpConfigured() ? " open" : "") + '><summary class="small" style="cursor:pointer;font-weight:700;margin-bottom:.6rem">How to set it up (free EmailJS account)</summary><ol class="small">' +
      "<li>Open <b>emailjs.com</b> and sign up free (200 emails a month).</li>" +
      "<li><b>Email Services → Add New Service → Gmail</b>. Connect your Gmail and tap Create. Copy the <b>Service ID</b>.</li>" +
      "<li><b>Email Templates → Create New Template</b>. In the template settings, set <b>To Email</b> to <code>{{to_email}}</code>. Subject: <code>Your Medibot code</code>. Content: <code>Your Medibot verification code is {{otp}}. It expires in 5 minutes.</code> Save and copy the <b>Template ID</b>.</li>" +
      "<li><b>Account → General</b>: copy your <b>Public Key</b> (and the <b>Private Key</b> shown under it).</li>" +
      "<li><b>Account → Security</b>: turn ON “Allow EmailJS API for non-browser applications” (needed for the Android app). If “Use Private Key” is ON there, also fill in the Private Key below.</li>" +
      "<li>Paste the three values below, tap <b>Save settings</b>, then <b>Send test email</b>.</li></ol>" +
      '<p class="small muted">To put these into every phone automatically, add them as GitHub secrets before building the APK (see readme.txt). These are public ids, not passwords.</p></details>' +
      field("Service ID", "emailjsService", s.emailjsService, 'placeholder="service_xxxxxxx" autocomplete="off"') +
      field("Template ID", "emailjsTemplate", s.emailjsTemplate, 'placeholder="template_xxxxxxx" autocomplete="off"') +
      field("Public Key", "emailjsPublicKey", s.emailjsPublicKey, 'autocomplete="off"') +
      field("Private Key (only if “Use Private Key” is on in EmailJS)", "emailjsPrivateKey", s.emailjsPrivateKey, 'type="password" autocomplete="off"') +
      '<div class="row"><input name="testEmail" type="email" placeholder="Your email for a test" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" style="flex:1;margin:0"><button type="button" id="sendTestEmail">Send test email</button></div><p id="emailMsg" class="small muted"></p>' +
      '<label class="check"><input type="checkbox" name="showOtpOnScreen"' + (s.showOtpOnScreen ? " checked" : "") + "><span>Demo mode: show the code on screen when offline or OTP is not set up</span></label>" +
      '<label class="check"><input type="checkbox" name="demoOnSmsFailure"' + (s.demoOnSmsFailure ? " checked" : "") + "><span>Use demo code if sending fails</span></label>" +
      field("Default country code", "countryCode", s.countryCode) +
      '<details><summary class="small" style="cursor:pointer;font-weight:700;margin:.4rem 0 .6rem">Optional: paid SMS instead (Fast2SMS / Twilio)</summary>' +
      '<p class="small muted">SMS costs money per message. Only needed if you want the code on the phone instead of email.</p>' +
      field("Fast2SMS API key (India)", "fast2smsKey", s.fast2smsKey, 'type="password" autocomplete="off"') +
      field("Twilio Account SID", "twilioSid", s.twilioSid) + field("Twilio Auth Token", "twilioToken", s.twilioToken, 'type="password" autocomplete="off"') +
      field("Twilio phone number", "twilioFrom", s.twilioFrom, 'placeholder="+1XXXXXXXXXX"') +
      '<div class="row"><input name="testPhone" placeholder="Your number for a test" inputmode="tel" style="flex:1;margin:0"><button type="button" id="testSms">Send test SMS</button></div><p id="smsMsg" class="small muted"></p></details></div>' +

      '<div class="card"><h2 style="margin-top:0">' + I("sparkle") + " Online AI (Groq)</h2><p class=\"muted small\">Free key at console.groq.com/keys. Stored only on this device.</p>" +
      field("Groq API key", "groqKey", s.groqKey, 'type="password" autocomplete="off"') +
      '<label>Model<select name="groqModel"><option value="">Choose automatically</option>' +
      (s.groqModel ? '<option selected value="' + E(s.groqModel) + '">' + E(s.groqModel) + "</option>" : "") + "</select></label>" +
      '<button type="button" id="loadModels">Test key and load models</button> <span id="groqMsg" class="muted small"></span></div>' +

      '<div class="card"><h2 style="margin-top:0">' + I("wifiOff") + " Local AI over Wi-Fi (Ollama)</h2><p class=\"muted small\">A laptop on the same Wi-Fi or hotspot runs the AI. No internet needed.</p>" +
      field("Ollama address", "ollamaUrl", s.ollamaUrl, 'placeholder="http://192.168.137.1:11434" inputmode="url"') + field("Model", "ollamaModel", s.ollamaModel) +
      '<button type="button" id="testOllama">Test connection</button> <span id="ollamaMsg" class="muted small"></span></div>' +

      '<div class="card"><h2 style="margin-top:0">Mode and appearance</h2>' +
      '<label class="check"><input type="radio" name="mode" value="auto"' + (s.mode !== "offline" ? " checked" : "") + "><span>Online when available</span></label>" +
      '<label class="check"><input type="radio" name="mode" value="offline"' + (s.mode === "offline" ? " checked" : "") + "><span>Always offline (everything stays on this device)</span></label>" +
      "<label>Theme" + '<div class="seg">' + [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(function (t) {
        return '<label><input type="radio" name="theme" value="' + t[0] + '"' + (s.theme === t[0] ? " checked" : "") + "><span>" + t[1] + "</span></label>"; }).join("") + "</div></label>" +
      '<p class="muted small" style="margin:0">Right now: <b>' + (MB.isOnline() ? "online" : "offline") + "</b>.</p></div>" +
      '<button class="primary block" style="margin-top:1rem">Save settings</button></form>' +
      '<div class="card" style="margin-top:1rem"><h2 style="margin-top:0">About Medibot</h2><p class="small">Answers come from <em>The Gale Encyclopedia of Medicine</em> (Volume C–F) stored on this device, with ' +
      MB.diseases().length + " diseases in the library. Online it can use a cloud AI; on a local network it can use a laptop's AI; with no connection it still works on-device.</p>" +
      '<p class="muted small" style="margin:0">For education only. Not a substitute for a doctor. Version 4.2</p></div>';

    function collect() {
      var f = $("#f"), ns = MB.settings();
      ["groqKey", "groqModel", "ollamaUrl", "ollamaModel", "emailjsService", "emailjsTemplate", "emailjsPublicKey", "emailjsPrivateKey", "fast2smsKey", "twilioSid", "twilioToken", "twilioFrom", "countryCode"].forEach(function (k) { ns[k] = f[k].value.trim(); });
      ns.mode = f.mode.value; ns.theme = f.theme.value || "auto"; ns.showOtpOnScreen = f.showOtpOnScreen.checked; ns.demoOnSmsFailure = f.demoOnSmsFailure.checked;
      if (!/^\+\d{1,4}$/.test(ns.countryCode)) ns.countryCode = "+91";
      return ns;
    }
    on("#f", "submit", function (e) {
      e.preventDefault(); MB.saveSettings(collect()); MB.applyTheme(); updateStatus();
      flash("Settings saved.", "success"); settingsView(user, {}); window.scrollTo(0, 0);
    });
    on("#sendTestEmail", "click", function () {
      var msg = $("#emailMsg"), email = $("#f").testEmail.value.trim();
      MB.saveSettings(collect());
      if (!MB.validEmail(email)) { msg.textContent = "Type your email address first."; return; }
      if (!MB.emailConfigured()) { msg.textContent = "Fill in Service ID, Template ID and Public Key first."; return; }
      if (!MB.isOnline()) { msg.textContent = "You are offline. Email needs internet."; return; }
      msg.textContent = "Sending…";
      var keep = MB.pending(); MB.setPending(null);
      var s2 = MB.settings(), prev = s2.demoOnSmsFailure; s2.demoOnSmsFailure = false; MB.saveSettings(s2);
      MB.sendOtp("test-email", "test", { email: email, name: user ? user.name : "" }).then(function (r) {
        msg.textContent = r.mode === "email" ? "Test email sent to " + email + ". Check the inbox and Spam folder." : "Could not send. Check the three values.";
      }, function (err) { msg.textContent = err.message; })
        .then(function () { var s3 = MB.settings(); s3.demoOnSmsFailure = prev; MB.saveSettings(s3); MB.setPending(keep); });
    });
    on("#testSms", "click", function () {
      var msg = $("#smsMsg"), phone;
      MB.saveSettings(collect());
      try { phone = MB.normalizePhone($("#f").testPhone.value); } catch (err) { msg.textContent = err.message; return; }
      if (!MB.smsConfigured()) { msg.textContent = "Add a Fast2SMS key (or Twilio details) first."; return; }
      if (!MB.isOnline()) { msg.textContent = "You are offline. Real SMS needs internet."; return; }
      msg.textContent = "Sending…";
      var keep = MB.pending(); MB.setPending(null);
      var s2 = MB.settings(), prev = s2.demoOnSmsFailure; s2.demoOnSmsFailure = false; MB.saveSettings(s2);
      MB.sendOtp(phone, "test").then(function (r) { msg.textContent = r.mode === "sms" ? "Test SMS sent to " + MB.maskPhone(phone) + ". Check the phone." : "No SMS provider handles this number."; },
        function (err) { msg.textContent = err.message; })
        .then(function () { var s3 = MB.settings(); s3.demoOnSmsFailure = prev; MB.saveSettings(s3); MB.setPending(keep); });
    });
    on("#loadModels", "click", function () {
      var key = $("#f").groqKey.value.trim(), msg = $("#groqMsg");
      if (!key) { msg.textContent = "Enter a key first."; return; }
      msg.textContent = "Checking…";
      MB.groqModels(key).then(function (ids) {
        var sel = $("#f").groqModel, cur = sel.value;
        sel.innerHTML = '<option value="">Choose automatically</option>' + ids.map(function (id) { return '<option value="' + E(id) + '"' + (id === cur ? " selected" : "") + ">" + E(id) + "</option>"; }).join("");
        msg.textContent = "Key works: " + ids.length + " models. Remember to save.";
      }).catch(function (err) { msg.textContent = err.name === "AbortError" ? "Timed out (offline?)" : err.message; });
    });
    on("#testOllama", "click", function () {
      var url = $("#f").ollamaUrl.value.trim(), msg = $("#ollamaMsg");
      if (!url) { msg.textContent = "Enter the address first."; return; }
      msg.textContent = "Connecting…";
      MB.testOllama(url).then(function (m) { msg.textContent = "Connected. Models: " + (m.join(", ") || "none installed"); }, function () { msg.textContent = "Could not connect. Check the address and Wi-Fi."; });
    });
    if (params && params.sms) setTimeout(function () { var c = $("#smsCard"); if (c) c.scrollIntoView({ block: "start" }); }, 50);
  }

  // ======================= ROUTER =======================
  var PUBLIC = { welcome: welcomeView, login: loginView, register: registerView, verify: verifyView, forgot: forgotView, reset: resetView };
  var TAB_OF = { home: "home", chat: "chat", library: "library", disease: "library", checker: "home", saved: "profile", bmi: "home", emergency: "emergency", profile: "profile", settings: "profile" };
  function parse() {
    var h = location.hash.replace(/^#\/?/, ""), qi = h.indexOf("?"), path = qi >= 0 ? h.slice(0, qi) : h, params = {};
    if (qi >= 0) h.slice(qi + 1).split("&").forEach(function (kv) { var p = kv.split("="); params[p[0]] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    var parts = path.split("/");
    return { name: parts[0] || "", arg: decodeURIComponent(parts[1] || ""), params: params };
  }
  function render() {
    var r = parse(), user = MB.currentUser();
    updateStatus();
    var m = document.querySelector(".modal"); if (m) m.remove();
    if (!r.name) return go(user ? "#/home" : (MB.load("mb_seen_welcome", false) ? "#/login" : "#/welcome"));
    if (r.name === "welcome") MB.save("mb_seen_welcome", true);
    if (PUBLIC[r.name]) {
      if (user && r.name !== "verify" && r.name !== "reset") return go("#/home");
      view.className = "container";
      return PUBLIC[r.name]();
    }
    if (!user && r.name === "settings") { view.className = "container"; return settingsView(null, r.params); }
    if (!user) return go(MB.load("mb_seen_welcome", false) ? "#/login" : "#/welcome");
    chrome(true, true);
    view.className = "container";
    Array.prototype.forEach.call(tabbar.querySelectorAll("a"), function (a) { a.classList.toggle("active", a.dataset.tab === (TAB_OF[r.name] || "home")); });
    window.scrollTo(0, 0);
    switch (r.name) {
      case "chat":
        chatView(user);
        var pre = sessionStorage.getItem("mb_prefill");
        if (pre) { sessionStorage.removeItem("mb_prefill"); var q = $("#q"); if (q) { q.value = pre; q.focus(); } }
        return;
      case "library": return libraryView(r.params);
      case "disease": return diseaseView(r.arg, user);
      case "checker": return checkerView(r.params);
      case "emergency": return emergencyView(user);
      case "bmi": return bmiView(user);
      case "saved": return savedView(user);
      case "profile": return profileView(user);
      case "settings": return settingsView(user, r.params);
      default: return homeView(user);
    }
  }
  window.addEventListener("hashchange", render);
  // Load saved accounts and settings from the phone's permanent storage first, then show the app.
  MB.restoreStorage().then(function () { MB.applyTheme(); updateStatus(); render(); });

  // Splash screen, then fade out
  setTimeout(function () { var sp = document.getElementById("splash"); if (sp) { sp.classList.add("hide"); setTimeout(function () { sp.remove(); }, 600); } }, 1300);
  // Load the encyclopedia text in the background so the first answer is quick.
  setTimeout(function () { MB.ensurePassages().catch(function () {}); }, 1500);
  // Installable web app (PWA) for PC / iPhone. Not needed inside the Android app.
  if ("serviceWorker" in navigator && !window.Capacitor && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
