// ---------------------------------------------------------------
// Shared front-end behaviour for the public site.
// ---------------------------------------------------------------

// Mobile nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
  }
});

// ---------------------------------------------------------------
// Home page hero carousel.
// Images are read from Firestore collection "homeImages", each
// document shaped as: { url: "<cloudinary url>", alt: "...", order: 1 }
// If Firestore has no images yet (new install) a small set of
// built-in placeholder panels is shown instead, so the page is
// never empty while content is being added from the admin app.
// ---------------------------------------------------------------
const FALLBACK_SLIDES = [
  { eyebrow: "Welcome Home", alt: "Congregation gathered in worship" },
  { eyebrow: "Every Sunday, 9:00 AM", alt: "Worship service in progress" },
  { eyebrow: "A Family in Christ", alt: "Members fellowshipping after service" },
];

async function loadHeroSlides() {
  const slidesEl = document.querySelector(".hero-slides");
  const dotsEl = document.querySelector(".hero-dots");
  if (!slidesEl || !dotsEl) return;

  let slides = [];

  try {
    if (typeof db !== "undefined") {
      const snap = await db.collection("homeImages").orderBy("order").get();
      slides = snap.docs.map((d) => d.data());
    }
  } catch (err) {
    console.warn("Could not load homepage images from Firestore, using fallback.", err);
  }

  if (!slides.length) {
    slides = FALLBACK_SLIDES.map((s) => ({ url: null, alt: s.alt }));
  }

  slidesEl.innerHTML = "";
  dotsEl.innerHTML = "";

  slides.forEach((slide, i) => {
    const panel = document.createElement("div");
    panel.className = "hero-slide" + (i === 0 ? " is-active" : "");
    if (slide.url) {
      panel.style.backgroundImage = `url("${slide.url}")`;
    } else {
      panel.style.background =
        "radial-gradient(circle at 30% 20%, #14335e 0%, #0b1d3d 55%, #060f24 100%)";
    }
    panel.setAttribute("role", "img");
    panel.setAttribute("aria-label", slide.alt || "Church photo");
    slidesEl.appendChild(panel);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = i === 0 ? "is-active" : "";
    dot.setAttribute("aria-label", `Show slide ${i + 1}`);
    dot.addEventListener("click", () => showSlide(i));
    dotsEl.appendChild(dot);
  });

  if (slides.length > 1) {
    startAutoRotate(slides.length);
  }
}

let currentSlide = 0;
let rotateTimer = null;

function showSlide(index) {
  const panels = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dots button");
  panels.forEach((p, i) => p.classList.toggle("is-active", i === index));
  dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  currentSlide = index;
}

function startAutoRotate(count) {
  if (rotateTimer) clearInterval(rotateTimer);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;
  rotateTimer = setInterval(() => {
    showSlide((currentSlide + 1) % count);
  }, 6000);
}

document.addEventListener("DOMContentLoaded", loadHeroSlides);

// ---------------------------------------------------------------
// Leadership ranking (About page).
// Reads Firestore collection "leaders", each doc shaped as:
// { name, role, rank, bio, photoUrl, order }
// ordered by "order" (1 = highest rank, e.g. Senior Pastor).
// If Firestore has no entries yet, the static fallback markup
// already in the page (see about.html) is left untouched.
// ---------------------------------------------------------------
async function loadLeaders() {
  const grid = document.getElementById("leaderGrid");
  if (!grid) return;

  try {
    if (typeof db === "undefined") return;
    const snap = await db.collection("leaders").orderBy("order").get();
    if (snap.empty) return; // keep the static fallback cards

    grid.innerHTML = "";
    snap.forEach((doc) => {
      const l = doc.data();
      const initials = (l.name || "?")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const card = document.createElement("div");
      card.className = "leader-card";
      card.innerHTML = `
        <div class="leader-photo" ${l.photoUrl ? `style="background-image:url('${l.photoUrl}')"` : ""}>
          ${l.photoUrl ? "" : initials}
        </div>
        <div class="leader-info">
          <span class="leader-rank">Rank ${l.order ?? ""}</span>
          <h3>${l.name || ""}</h3>
          <span class="leader-role">${l.role || ""}</span>
          <p>${l.bio || ""}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.warn("Could not load leadership list from Firestore, showing fallback.", err);
  }
}

document.addEventListener("DOMContentLoaded", loadLeaders);

// ---------------------------------------------------------------
// Church activities / posts (Activities page).
// Reads Firestore collection "activities", each doc shaped as:
// { title, date, description, photoUrl, createdAt }
// newest first.
// ---------------------------------------------------------------
async function loadActivities() {
  const list = document.getElementById("activityList");
  if (!list) return;

  try {
    if (typeof db === "undefined") return;
    const snap = await db.collection("activities").orderBy("createdAt", "desc").get();

    if (snap.empty) {
      list.innerHTML = '<p style="color:var(--ink-400);">No activities posted yet — check back soon.</p>';
      return;
    }

    list.innerHTML = "";
    snap.forEach((doc) => {
      const a = doc.data();
      const card = document.createElement("article");
      card.className = "activity-card";
      card.innerHTML = `
        <div class="activity-thumb" ${a.photoUrl ? `style="background-image:url('${a.photoUrl}')"` : ""}></div>
        <div class="activity-body">
          <span class="activity-date">${a.date || ""}</span>
          <h3>${a.title || ""}</h3>
          <p>${a.description || ""}</p>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.warn("Could not load church activities from Firestore.", err);
    list.innerHTML = '<p style="color:var(--ink-400);">Activities could not be loaded right now.</p>';
  }
}

document.addEventListener("DOMContentLoaded", loadActivities);
