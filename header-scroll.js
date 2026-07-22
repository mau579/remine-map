const siteHeader = document.querySelector("header");

function updateHeaderSize() {
  siteHeader?.classList.toggle("scrolled", window.scrollY > 40);
}

window.addEventListener("scroll", updateHeaderSize, { passive: true });
updateHeaderSize();
