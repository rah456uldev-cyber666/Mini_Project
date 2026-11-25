/* Icons, emergency numbers, first-aid guides and health tips (all offline). */
(function () {
  "use strict";
  var MB = (window.MB = window.MB || {});

  // Simple line icons (inline SVG, no internet needed)
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z"/><path d="M8 11h8M8 14.5h5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/>',
    sos: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    steth: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M11 14v2a5 5 0 0 0 10 0v-1"/><circle cx="21" cy="12.5" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7-7-1Z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
    pin: '<path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.5C1.6 7 4 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4 20 4 22.4 7 21.2 10.5 19.5 15.4 12 20 12 20Z"/>',
    pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
    scale: '<path d="M4 20h16"/><path d="M6 20V8h12v12"/><path d="M12 11v3"/><path d="M9 4h6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    wifiOff: '<path d="M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M5 12.5a10 10 0 0 1 4.1-2.2M19 12.5a10 10 0 0 0-1.5-1.2M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hospital: '<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M2 21h20M12 7v6M9 10h6M9 21v-4h6v4"/>',
    back: '<path d="M15 18 9 12l6-6"/>'
  };
  MB.icon = function (name, cls) {
    return '<svg class="i ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || "") + "</svg>";
  };

  MB.WARNING_TAG = "Use the emergency call only in a real emergency. Any false or misleading call may lead to severe punishment.";

  MB.HELPLINES = [
    { num: "108", name: "Ambulance (emergency medical)", note: "Free, 24x7, all over India" },
    { num: "112", name: "National emergency number", note: "Police, fire and ambulance" },
    { num: "102", name: "Mother and child ambulance", note: "Pregnancy and newborn transport" },
    { num: "14416", name: "Tele-MANAS mental health", note: "Free counselling, 24x7" },
    { num: "1800-11-6117", name: "Poison information (AIIMS)", note: "Advice on poisoning" }
  ];

  // Standard first-aid steps (general public guidance). Not a substitute for trained help.
  MB.FIRST_AID = [
    { t: "Not breathing / no pulse (CPR)", c: "c3", s: [
      "Call 108 (or ask someone to call) and get an AED if available.",
      "Lay the person on their back on a firm surface.",
      "Push hard and fast in the centre of the chest: 100-120 pushes a minute, about 5 cm deep.",
      "If trained, give 2 rescue breaths after every 30 pushes; if not, keep doing chest pushes only.",
      "Do not stop until help arrives or the person starts breathing."] },
    { t: "Choking (adult)", c: "c4", s: [
      "Ask 'Are you choking?' If they can cough, encourage them to keep coughing.",
      "If they cannot breathe or speak: give up to 5 firm back blows between the shoulder blades.",
      "Then give up to 5 abdominal thrusts (stand behind, fist above the navel, pull in and up).",
      "Repeat back blows and thrusts. If they become unconscious, call 108 and start CPR."] },
    { t: "Heavy bleeding", c: "c3", s: [
      "Call 108 if bleeding is severe.",
      "Press firmly on the wound with a clean cloth and keep pressing.",
      "If blood soaks through, add more cloth on top; do not remove the first one.",
      "Raise the injured part above heart level if possible. Keep the person warm and lying down."] },
    { t: "Burns", c: "c4", s: [
      "Cool the burn under cool running water for 20 minutes. Do not use ice, butter or toothpaste.",
      "Remove rings or tight items near the burn before it swells.",
      "Cover loosely with clean cling film or a clean cloth.",
      "Call 108 for large, deep, facial or electrical burns, or burns in children."] },
    { t: "Heat stroke", c: "c4", s: [
      "Move the person to a cool, shaded place and call 108 if they are confused or unconscious.",
      "Remove extra clothing; cool them with water, wet cloths and fanning.",
      "If awake and able to swallow, give small sips of water.",
      "Do not give medicines for fever."] },
    { t: "Snake bite", c: "c6", s: [
      "Keep the person calm and still; call 108 and go to the nearest hospital quickly.",
      "Keep the bitten limb still and at heart level; remove rings and tight clothing.",
      "Do NOT cut, suck the wound, apply ice or tie a tight tourniquet.",
      "Note the time of the bite; anti-venom is given only at a hospital."] },
    { t: "Fainting", c: "c5", s: [
      "Lay the person flat and raise their legs about 30 cm.",
      "Loosen tight clothing and make sure they have fresh air.",
      "If they do not wake within a minute, or are not breathing normally, call 108."] },
    { t: "Seizure (fits)", c: "c2", s: [
      "Stay calm, move hard objects away, cushion the head.",
      "Do not hold them down and do not put anything in their mouth.",
      "After the shaking stops, turn them on their side.",
      "Call 108 if it lasts more than 5 minutes, repeats, or it is their first seizure."] }
  ];

  MB.dailyTip = function () {
    var list = (window.MB_DISEASES || []).filter(function (d) { return d.prevention && d.prevention.length > 60 && !/americ|united states|\bu\.s\./i.test(d.prevention.slice(0, 300)); });
    if (!list.length) return null;
    var day = Math.floor(Date.now() / 86400000), d = list[day % list.length];
    var points = MB.toPoints ? MB.toPoints(d.prevention, 1) : [d.prevention.slice(0, 200)];
    return { disease: d, text: points[0] || d.prevention.slice(0, 200) };
  };

  MB.bmi = function (kg, cm) {
    var m = cm / 100, v = kg / (m * m);
    // WHO Asian cut-offs used in India: <18.5 under, 18.5-22.9 normal, 23-24.9 overweight, >=25 obese
    var cat = v < 18.5 ? "Underweight" : v < 23 ? "Normal" : v < 25 ? "Overweight" : "Obese";
    return { value: Math.round(v * 10) / 10, category: cat };
  };
})();
