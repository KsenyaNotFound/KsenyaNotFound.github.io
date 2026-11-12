"use strict";

// Optional accordion behavior for blocks containing a header and content.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".block").forEach((block) => {
    const header = block.querySelector(".header");
    const content = block.querySelector(".content");
    if (!header || !content) return;

    function expand() {
      content.style.maxHeight = content.scrollHeight + "px";
    }

    function collapse() {
      content.style.maxHeight = "0";
    }

    header.addEventListener("mouseenter", expand);
    block.addEventListener("mouseleave", collapse);
    header.addEventListener("focusin", expand);
    block.addEventListener("focusout", (event) => {
      if (!block.contains(event.relatedTarget)) collapse();
    });
    header.addEventListener("click", () => {
      if (content.style.maxHeight && content.style.maxHeight !== "0px") collapse();
      else expand();
    });
  });
});
