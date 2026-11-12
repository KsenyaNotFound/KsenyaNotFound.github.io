"use strict";

(() => {
  const popup = document.getElementById("popup");
  document.getElementById("openForm")?.addEventListener("click", () => popup?.showModal());

  document.querySelectorAll(".contact-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const body = [
        "Имя: " + data.get("username"),
        "Email: " + data.get("useremail"),
        "Сообщение: " + data.get("message"),
      ].join("\n");
      window.location.href = "mailto:kellisparkl@yandex.ru?subject="
        + encodeURIComponent("Сообщение") + "&body=" + encodeURIComponent(body);
    });
  });
})();
