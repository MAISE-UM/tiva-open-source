/* Left navigation for the TIVA docs. Included by every page with <script src="assets/nav.js" defer></script>.
   To add a page, add it to PAGES below. The current page's <h2 id="..."> sections are listed under its entry. */
(function () {
  var PAGES = [
    { href: "index.html", title: "Docs index" },
    { group: "Reference" },
    { href: "client.html", title: "Client" },
    { href: "api.html", title: "API" },
    { href: "database.html", title: "Database" },
    { group: "Project briefs" },
    { href: "project-brief.html", title: "Project brief" },
    { href: "client-brief.html", title: "Client brief" },
    { href: "opensource-libraries.html", title: "Open-source libraries" },
    { href: "related-work.html", title: "Related work" },
    { group: "Architecture" },
    { href: "graph-architecture.html", title: "Graph architecture" },
    { href: "ehr-setup.html", title: "EHR setup guide" },
    { href: "ehr-launch-flow.html", title: "EHR launch flow" },
    { href: "auth-and-permissions.html", title: "Auth and permissions" },
    { group: "PK models and simulation" },
    { href: "pk-models.html", title: "PK models" },
    { href: "simulation-algorithm.html", title: "Simulation algorithm" }
  ];

  var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (current === "") current = "index.html";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function build() {
    var nav = el("nav", "sidenav");
    nav.id = "sidenav";
    nav.setAttribute("aria-label", "Documentation");
    nav.appendChild(el("div", "sidenav-title", "TIVA docs"));

    PAGES.forEach(function (p) {
      if (p.group) {
        nav.appendChild(el("div", "sidenav-group", p.group));
        return;
      }
      var a = el("a", "sidenav-link", p.title);
      a.href = p.href;
      var isCurrent = p.href.toLowerCase() === current;
      if (isCurrent) {
        a.className += " active";
        a.setAttribute("aria-current", "page");
      }
      nav.appendChild(a);

      if (isCurrent) {
        var heads = document.querySelectorAll("main h2[id]");
        if (heads.length > 1) {
          var sub = el("div", "sidenav-sub");
          Array.prototype.forEach.call(heads, function (h) {
            var s = el("a", "sidenav-sublink", h.textContent.replace(/\s+/g, " ").trim());
            s.href = "#" + h.id;
            sub.appendChild(s);
          });
          nav.appendChild(sub);
        }
      }
    });

    var btn = el("button", "sidenav-toggle", "\u2630 Menu");
    btn.type = "button";
    btn.setAttribute("aria-controls", "sidenav");
    btn.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") document.body.classList.remove("nav-open");
    });

    document.body.classList.add("has-nav");
    document.body.appendChild(nav);
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
