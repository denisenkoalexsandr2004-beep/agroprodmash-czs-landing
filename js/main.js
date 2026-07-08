/* ════════════════════════════════════════════════════════════════
   main.js — language switching, role toggle, list rendering,
   scroll reveal, mobile menu, sticky header.
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SUPPORTED = ["ru", "zh", "en"];
  var DEFAULT_LANG = "ru";
  var state = { lang: DEFAULT_LANG, role: "supplier" };

  /* ---- helpers ---- */
  function get(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : undefined;
    }, obj);
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function svgIcon(id, cls) {
    return '<svg class="' + (cls || "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  /* ---- apply translations ---- */
  function applyLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    state.lang = lang;
    var dict = window.I18N[lang];
    if (!dict) return;

    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";

    // scalar text
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      var val = get(dict, node.getAttribute("data-i18n"));
      if (typeof val === "string") {
        if (node.tagName === "TITLE") node.textContent = val;
        else if (node.tagName === "META") node.setAttribute("content", val);
        else node.textContent = val;
      }
    });
    // html-allowed text (with <strong>)
    document.querySelectorAll("[data-i18n-html]").forEach(function (node) {
      var val = get(dict, node.getAttribute("data-i18n-html"));
      if (typeof val === "string") node.innerHTML = val;
    });

    // current lang label
    document.getElementById("langCurrent").textContent = lang.toUpperCase();
    document.querySelectorAll(".lang__opt").forEach(function (opt) {
      opt.setAttribute("aria-current", opt.getAttribute("data-lang") === lang ? "true" : "false");
    });

    renderDynamic(dict);
    applyRoleHint(dict);

    try { localStorage.setItem("czs_lang", lang); } catch (e) {}
  }

  /* ---- render array-driven content ---- */
  function renderDynamic(dict) {
    // facts
    var fg = document.getElementById("factsGrid");
    fg.innerHTML = "";
    var icons = ["i-calendar", "i-handshake", "i-store", "i-layers"];
    get(dict, "facts.items").forEach(function (f, i) {
      var card = el("div", "fact");
      card.innerHTML =
        svgIcon(icons[i] || "i-check", "fact__icon") +
        '<div class="fact__num">' + f.num + "</div>" +
        '<div class="fact__label">' + f.label + "</div>";
      fg.appendChild(card);
    });

    // results (track record) — stat cards
    var rgs = document.getElementById("resultsGrid");
    if (rgs) {
      rgs.innerHTML = "";
      (get(dict, "results.items") || []).forEach(function (r) {
        var c = el("div", "result");
        c.innerHTML = '<div class="result__num">' + r.num + "</div><div class=\"result__label\">" + r.label + "</div>";
        rgs.appendChild(c);
      });
    }

    // audience benefit lists
    fillList("supplierList", get(dict, "aud.supplier.items"), "i-check");
    fillList("buyerList", get(dict, "aud.buyer.items"), "i-check");

    // categories (numbered)
    var cg2 = document.getElementById("catsGrid");
    if (cg2) {
      cg2.innerHTML = "";
      var cats = get(dict, "cats.items") || [];
      cats.forEach(function (c, i) {
        var li = el("li", "cat");
        li.innerHTML =
          '<span class="cat__num">' + (i + 1 < 10 ? "0" + (i + 1) : (i + 1)) + "</span>" +
          '<span class="cat__label">' + c + "</span>";
        cg2.appendChild(li);
      });
    }

    // steps
    var sl = document.getElementById("stepsList");
    sl.innerHTML = "";
    get(dict, "how.steps").forEach(function (s) {
      var step = el("div", "step");
      step.innerHTML =
        '<div class="step__num">' + s.n + "</div>" +
        "<div><h4>" + s.title + "</h4><p>" + s.text + "</p></div>";
      sl.appendChild(step);
    });

    // gallery: real photos from img/gallery-N.jpg, clean placeholder if missing
    var gg = document.getElementById("galleryGrid");
    gg.innerHTML = "";
    var phLabel = get(dict, "how.gallery.phLabel");
    var phMarkup = '<div class="ph"><div class="ph__label">' + svgIcon("i-image") + "<span>" + phLabel + "</span></div></div>";
    for (var g = 1; g <= 5; g++) {
      var fig = el("figure");
      var img = document.createElement("img");
      img.alt = phLabel;
      img.setAttribute("data-ph", phMarkup);
      img.onerror = function () { var f = this.parentNode; this.remove(); f.innerHTML = f.getAttribute("data-phm"); };
      fig.setAttribute("data-phm", phMarkup);
      img.src = "img/gallery-" + g + ".jpg";
      fig.appendChild(img);
      gg.appendChild(fig);
    }

    // reviews
    var rg = document.getElementById("reviewsGrid");
    rg.innerHTML = "";
    get(dict, "reviews.items").forEach(function (r) {
      var card = el("article", "review");
      card.innerHTML =
        svgIcon("i-quote", "review__quote") +
        "<p>" + r.text + "</p>" +
        '<div class="review__author"><div class="review__avatar">' + r.initials + "</div>" +
        '<div><div class="review__name">' + r.name + '</div><div class="review__co">' + r.company + "</div></div></div>";
      rg.appendChild(card);
    });

    // program components (маршрутный лист / встречи / бизнес-гид)
    var cpg = document.getElementById("componentsGrid");
    if (cpg) {
      cpg.innerHTML = "";
      var cpIcons = ["i-pin", "i-calendar", "i-handshake"];
      (get(dict, "components.items") || []).forEach(function (m, i) {
        var card = el("article", "material reveal");
        card.innerHTML =
          '<span class="material__icon">' + svgIcon(cpIcons[i] || "i-check") + "</span>" +
          "<h3>" + m.title + "</h3>" +
          "<p>" + m.desc + "</p>";
        cpg.appendChild(card);
      });
    }

    // materials cards (placeholder links)
    var mg = document.getElementById("materialsGrid");
    if (mg) {
      mg.innerHTML = "";
      (get(dict, "materials.items") || []).forEach(function (m) {
        var card = el("article", "material reveal");
        card.innerHTML =
          '<span class="material__icon">' + svgIcon("i-layers") + "</span>" +
          "<h3>" + m.title + "</h3>" +
          "<p>" + m.desc + "</p>";
        mg.appendChild(card);
      });
    }

    // faq (native details/summary accordion)
    var fq = document.getElementById("faqList");
    if (fq) {
      fq.innerHTML = "";
      (get(dict, "faq.items") || []).forEach(function (f) {
        var d = el("details", "faq-item reveal");
        d.innerHTML =
          "<summary>" + f.q + svgIcon("i-chevron", "faq-item__chev") + "</summary>" +
          '<div class="faq-item__a"><p>' + f.a + "</p></div>";
        fq.appendChild(d);
      });
    }

    // contacts (photo + phone / email / telegram)
    var cg = document.getElementById("contactsGrid");
    cg.innerHTML = "";
    get(dict, "contacts.people").forEach(function (p, i) {
      var initials = p.name.split(/[\s（(]/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join("");
      var ci = i + 1;
      var photoSrc = (window.__CONTACTS__ && window.__CONTACTS__[ci]) ? window.__CONTACTS__[ci] : ("img/contact-" + ci + ".jpg");
      var links = "";
      if (p.phone) {
        links += '<a class="contact-link" href="tel:' + p.phone.replace(/[^+\d]/g, "") + '">' + svgIcon("i-phone") + "<span>" + p.phone + "</span></a>";
      }
      if (p.email) {
        links += '<a class="contact-link" href="mailto:' + p.email + '">' + svgIcon("i-mail") + "<span>" + p.email + "</span></a>";
      }
      if (p.telegram) {
        links += '<a class="contact-link" href="https://t.me/' + p.telegram.replace(/^@/, "") + '" target="_blank" rel="noopener">' + svgIcon("i-telegram") + "<span>" + p.telegram + "</span></a>";
      }
      var card = el("article", "contact-card reveal");
      card.innerHTML =
        '<div class="contact-card__avatar"><img src="' + photoSrc + '" alt="' + p.name + '" onerror="this.remove()"><span>' + initials + "</span></div>" +
        "<h3>" + p.name + "</h3>" +
        '<div class="contact-card__role">' + p.role + "</div>" +
        '<div class="contact-card__org">' + p.org + "</div>" +
        '<div class="contact-card__links">' + links + "</div>";
      cg.appendChild(card);
    });

    // footer org lists
    fillOrg("footerCol1", get(dict, "footer.col1items"));
    fillOrg("footerCol2", get(dict, "footer.col2items"));
    fillOrg("footerCol3", get(dict, "footer.col3items"));

    // re-observe freshly created .reveal nodes
    observeReveals();
  }

  function fillList(id, items, icon) {
    var ul = document.getElementById(id);
    if (!ul || !items) return;
    ul.innerHTML = "";
    items.forEach(function (t) {
      var li = el("li");
      li.innerHTML = svgIcon(icon) + "<span>" + t + "</span>";
      ul.appendChild(li);
    });
  }
  function fillChips(id, chips) {
    var box = document.getElementById(id);
    if (!box || !chips) return;
    box.innerHTML = "";
    chips.forEach(function (c) { box.appendChild(el("span", "tag", c)); });
  }
  function fillOrg(id, items) {
    var ul = document.getElementById(id);
    if (!ul || !items) return;
    ul.innerHTML = "";
    items.forEach(function (o) {
      var li = el("li", "footer-org");
      li.innerHTML = "<b>" + o + "</b>";
      ul.appendChild(li);
    });
  }

  /* ---- role toggle (supplier / buyer) ---- */
  function applyRoleHint(dict) {
    var hint = document.getElementById("roleHint");
    if (hint) hint.textContent = get(dict, state.role === "supplier" ? "hero.hintSupplier" : "hero.hintBuyer");
  }
  function setRole(role) {
    state.role = role;
    document.querySelectorAll(".role-toggle").forEach(function (tg) {
      tg.querySelectorAll(".role-toggle__btn").forEach(function (btn) {
        var on = btn.getAttribute("data-role") === role;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      movePill(tg);
    });
    var grid = document.getElementById("audGrid");
    if (grid) grid.setAttribute("data-active", role);
    applyRoleHint(window.I18N[state.lang]);
  }
  function movePill(toggle) {
    var active = toggle.querySelector('.role-toggle__btn[aria-pressed="true"]');
    var pill = toggle.querySelector(".role-toggle__pill");
    if (active && pill) {
      pill.style.left = active.offsetLeft + "px";
      pill.style.width = active.offsetWidth + "px";
    }
  }
  function initRoleToggles() {
    document.querySelectorAll(".role-toggle").forEach(function (tg) {
      tg.querySelectorAll(".role-toggle__btn").forEach(function (btn) {
        btn.addEventListener("click", function () { setRole(btn.getAttribute("data-role")); });
      });
    });
    // initial pill placement (after layout)
    requestAnimationFrame(function () {
      document.querySelectorAll(".role-toggle").forEach(movePill);
    });
  }

  /* ---- language dropdown ---- */
  function initLangMenu() {
    var lang = document.getElementById("lang");
    var btn = document.getElementById("langBtn");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = lang.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".lang__opt").forEach(function (opt) {
      opt.addEventListener("click", function () {
        applyLang(opt.getAttribute("data-lang"));
        lang.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        requestAnimationFrame(function () { document.querySelectorAll(".role-toggle").forEach(movePill); });
      });
    });
    document.addEventListener("click", function () {
      lang.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  /* ---- mobile menu ---- */
  function initMobileMenu() {
    var menu = document.getElementById("mobileMenu");
    var burger = document.getElementById("burger");
    burger.addEventListener("click", function () { menu.classList.add("open"); document.body.style.overflow = "hidden"; });
    menu.querySelectorAll("[data-close]").forEach(function (n) {
      n.addEventListener("click", function () { menu.classList.remove("open"); document.body.style.overflow = ""; });
    });
  }

  /* ---- sticky header shadow ---- */
  function initHeaderScroll() {
    var header = document.getElementById("header");
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 12); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- partners / "в рамках" strip: show only if a logo actually loads ---- */
  function initPartners() {
    [["partners", "partnersLogos"], ["footerPartners", "footerPartnersLogos"]].forEach(function (ids) {
      var sec = document.getElementById(ids[0]);
      var box = document.getElementById(ids[1]);
      if (!sec || !box) return;
      var reveal = function () { sec.style.display = box.querySelector("img") ? "" : "none"; };
      box.querySelectorAll("img").forEach(function (im) {
        im.addEventListener("load", reveal);
        im.addEventListener("error", reveal);
      });
      reveal();               // показать сразу, если логотипы в разметке есть
      setTimeout(reveal, 600); // перепроверить после загрузки (вдруг 404)
    });
  }

  /* ---- scroll reveal ---- */
  var io = null;
  function observeReveals() {
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }
    document.querySelectorAll(".reveal:not(.in)").forEach(function (n) { io.observe(n); });
  }

  /* ---- init ---- */
  function init() {
    var saved = DEFAULT_LANG;
    try { saved = localStorage.getItem("czs_lang") || DEFAULT_LANG; } catch (e) {}
    applyLang(saved);
    initRoleToggles();
    setRole("supplier");
    initLangMenu();
    initMobileMenu();
    initHeaderScroll();
    initPartners();
    observeReveals();
    window.addEventListener("resize", function () {
      document.querySelectorAll(".role-toggle").forEach(movePill);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
