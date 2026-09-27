// Mobile menu, scroll reveal (IntersectionObserver, no scroll listeners), inline form validation.
(function () {
  var nav = document.querySelector(".nav");
  var btn = document.querySelector(".menu-btn");
  if (nav && btn) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
  }

  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  var form = document.querySelector("form.form");
  if (form) {
    form.setAttribute("novalidate", "");
    var check = function (field) {
      var input = field.querySelector("input, textarea");
      var ok = input.checkValidity();
      field.classList.toggle("invalid", !ok);
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      return ok;
    };
    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, textarea");
      input.addEventListener("blur", function () { if (input.value) check(field); });
      input.addEventListener("input", function () { if (field.classList.contains("invalid")) check(field); });
    });
    form.addEventListener("submit", function (e) {
      var first = null;
      form.querySelectorAll(".field").forEach(function (field) {
        if (!check(field) && !first) first = field.querySelector("input, textarea");
      });
      if (first) { e.preventDefault(); first.focus(); }
    });
  }
})();
