import { initNav } from "./nav.js";
import { initScrollReveal } from "./scroll-reveal.js";
import { initPretextHero } from "./hero/pretext-hero.js";

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initScrollReveal();
  initPretextHero();
});
