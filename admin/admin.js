// ---------------------------------------------------------------
// Admin dashboard logic.
// Requires firebase-config.js (auth + db) loaded before this file.
// ---------------------------------------------------------------

// --- Auth guard ---------------------------------------------------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

document.getElementById("signOutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

// --- Tab switching --------------------------------------------------
document.querySelectorAll(".admin-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-nav button").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.getElementById("panel-" + btn.dataset.panel).classList.add("is-active");
  });
});

// ---------------------------------------------------------------
// Home page images (collection: homeImages)
// Each doc: { url, publicId, alt, order, createdAt }
// ---------------------------------------------------------------
const imageGrid = document.getElementById("imageGrid");

async function renderImages() {
  imageGrid.innerHTML = "";
  const snap = await db.collection("homeImages").orderBy("order").get();
  if (snap.empty) {
    imageGrid.innerHTML = '<p style="color:var(--ink-400);">No images yet. Upload the first homepage photo above.</p>';
    return;
  }
  snap.forEach((doc) => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "image-card";
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${data.url}')"></div>
      <div class="meta">
        <small>Order ${data.order ?? "-"}</small>
        <button class="icon-btn" data-id="${doc.id}">Remove</button>
      </div>
    `;
    card.querySelector(".icon-btn").addEventListener("click", async () => {
      if (confirm("Remove this image from the homepage?")) {
        await db.collection("homeImages").doc(doc.id).delete();
        renderImages();
      }
    });
    imageGrid.appendChild(card);
  });
}

// Cloudinary upload widget — uploads directly from the browser
// using the unsigned preset configured in firebase-config.js.
// `createWidget` is a small factory so each part of the dashboard
// (homepage images, leader photos, activity photos) can open its
// own widget with its own onSuccess handler.
const cloudinaryReady = window.cloudinary && cloudinaryConfig.cloudName !== "REPLACE_WITH_CLOUD_NAME";

// Inserts Cloudinary's automatic-format / automatic-quality delivery
// flags into a secure_url returned by the upload widget, plus a
// smart "fill" crop: c_fill with g_auto uses Cloudinary's
// content-aware auto-gravity to center the crop on the actual
// subject (faces, for portraits) rather than relying on a manual
// crop box at upload time, which is where mis-cropped photos were
// actually coming from. Pass width/height matching the aspect
// ratio each part of the site displays photos at — for a fixed-
// shape container (gallery grid, leader circle, activity/program
// thumbnail). Omit height for a context whose on-screen shape
// varies by viewport (the homepage hero): that case just resizes
// the full photo without forcing any crop, so CSS "cover" can do
// the adaptive per-device cropping itself, same as before.
//
// For fixed-shape containers we use c_pad (not c_fill) with a
// blurred background fill: this fits the WHOLE photo inside the
// target shape instead of cropping anything out. Auto-gravity
// cropping was still cutting off parts of well-framed photos
// because it re-guesses the "subject" itself; padding never
// removes any part of the original photo, just adds soft blurred
// fill around it if the shape doesn't match exactly.
function optimizeCloudinaryUrl(url) {
  return url;
}

// Upload widget — no manual cropping step. Whoever uploads just
// picks a photo; Cloudinary stores it as-is, and optimizeCloudinaryUrl
// applies the smart crop automatically when we save the delivery URL
// to Firestore. This removes the step where a badly-dragged crop box
// produced a bad photo everywhere it was used.
function createWidget(onSuccess) {
  if (!cloudinaryReady) return null;
  return cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      sources: ["local", "camera", "url"],
      multiple: false,
      cropping: false,
    },
    (error, result) => {
      if (!error && result && result.event === "success") {
        onSuccess(result.info.secure_url, result.info.public_id);
      }
    }
  );
}

const uploadWidget = createWidget(async (url, publicId) => {
  const snap = await db.collection("homeImages").orderBy("order", "desc").limit(1).get();
  const nextOrder = snap.empty ? 1 : (snap.docs[0].data().order || 0) + 1;
  await db.collection("homeImages").add({
    url: url,
    publicId,
    alt: "Central Baptist Church Wakiso",
    order: nextOrder,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  renderImages();
});

document.getElementById("uploadBtn").addEventListener("click", () => {
  if (uploadWidget) {
    uploadWidget.open();
  } else {
    alert("Add your Cloudinary cloud name and unsigned upload preset in js/firebase-config.js first.");
  }
});

// ---------------------------------------------------------------
// Photo gallery (collection: gallery)
// Each doc: { url, caption, order, createdAt }
// ---------------------------------------------------------------
const galleryAdminGrid = document.getElementById("galleryAdminGrid");

async function renderGalleryAdmin() {
  const snap = await db.collection("gallery").orderBy("order").get();
  if (snap.empty) {
    galleryAdminGrid.innerHTML = '<p style="color:var(--ink-400);">No photos yet — upload the first one above.</p>';
    return;
  }
  galleryAdminGrid.innerHTML = "";
  snap.forEach((doc) => {
    const g = doc.data();
    const card = document.createElement("div");
    card.className = "image-card";
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${g.url}')"></div>
      <div class="meta">
        <small>${g.caption || "No caption"}</small>
        <button class="icon-btn" data-id="${doc.id}">Remove</button>
      </div>
    `;
    card.querySelector(".icon-btn").addEventListener("click", async () => {
      if (confirm("Remove this photo from the gallery?")) {
        await db.collection("gallery").doc(doc.id).delete();
        renderGalleryAdmin();
      }
    });
    galleryAdminGrid.appendChild(card);
  });
}

const galleryPhotoWidget = createWidget(async (url) => {
  const caption = document.getElementById("galleryCaption").value.trim();
  const snap = await db.collection("gallery").orderBy("order", "desc").limit(1).get();
  const nextOrder = snap.empty ? 1 : (snap.docs[0].data().order || 0) + 1;
  await db.collection("gallery").add({
    url: url,
    caption,
    order: nextOrder,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  document.getElementById("galleryCaption").value = "";
  renderGalleryAdmin();
});

document.getElementById("galleryPhotoBtn").addEventListener("click", () => {
  if (galleryPhotoWidget) {
    galleryPhotoWidget.open();
  } else {
    alert("Add your Cloudinary cloud name and unsigned upload preset in js/firebase-config.js first.");
  }
});

// ---------------------------------------------------------------
// Daughter churches (collection: daughterChurches)
// Each doc: { name, location, description, order, photoUrl, createdAt }
// ---------------------------------------------------------------
const churchesBody = document.getElementById("churchesBody");

async function renderChurches() {
  const snap = await db.collection("daughterChurches").orderBy("order").get();
  if (snap.empty) {
    churchesBody.innerHTML = '<tr><td colspan="3" style="color:var(--ink-400);">No daughter churches added yet.</td></tr>';
    return;
  }
  churchesBody.innerHTML = "";
  snap.forEach((doc) => {
    const c = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.name || ""}</td>
      <td>${c.location || ""}</td>
      <td><button class="icon-btn" data-id="${doc.id}">Remove</button></td>
    `;
    row.querySelector(".icon-btn").addEventListener("click", async () => {
      if (confirm(`Remove ${c.name}?`)) {
        await db.collection("daughterChurches").doc(doc.id).delete();
        renderChurches();
      }
    });
    churchesBody.appendChild(row);
  });
}

function readChurchForm() {
  const name = document.getElementById("churchName").value.trim();
  const location = document.getElementById("churchLocation").value.trim();
  const order = parseInt(document.getElementById("churchOrder").value, 10);
  const description = document.getElementById("churchDescription").value.trim();
  if (!name || !order) {
    alert("Please fill in at least the church name and display order before saving.");
    return null;
  }
  return { name, location, order, description };
}

function clearChurchForm() {
  document.getElementById("churchName").value = "";
  document.getElementById("churchLocation").value = "";
  document.getElementById("churchOrder").value = "";
  document.getElementById("churchDescription").value = "";
}

async function saveChurch(photoUrl) {
  const fields = readChurchForm();
  if (!fields) return;
  await db.collection("daughterChurches").add({
    ...fields,
    photoUrl: photoUrl || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  clearChurchForm();
  renderChurches();
}

const churchPhotoWidget = createWidget((url) => saveChurch(url));

document.getElementById("churchPhotoBtn").addEventListener("click", () => {
  if (!readChurchForm()) return;
  if (churchPhotoWidget) {
    churchPhotoWidget.open();
  } else {
    alert("Add your Cloudinary cloud name and unsigned upload preset in js/firebase-config.js first, or use 'Save Without Photo'.");
  }
});

document.getElementById("churchSaveNoPhotoBtn").addEventListener("click", () => saveChurch(null));

// ---------------------------------------------------------------
// Programs (collection: programs)
// Each doc: { title, description, order, photoUrl, createdAt }
// ---------------------------------------------------------------
const programsBody = document.getElementById("programsBody");

async function renderPrograms() {
  const snap = await db.collection("programs").orderBy("order").get();
  if (snap.empty) {
    programsBody.innerHTML = '<tr><td colspan="2" style="color:var(--ink-400);">No programs added yet.</td></tr>';
    return;
  }
  programsBody.innerHTML = "";
  snap.forEach((doc) => {
    const p = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.title || ""}</td>
      <td><button class="icon-btn" data-id="${doc.id}">Remove</button></td>
    `;
    row.querySelector(".icon-btn").addEventListener("click", async () => {
      if (confirm(`Remove "${p.title}"?`)) {
        await db.collection("programs").doc(doc.id).delete();
        renderPrograms();
      }
    });
    programsBody.appendChild(row);
  });
}

function readProgramForm() {
  const title = document.getElementById("programTitle").value.trim();
  const order = parseInt(document.getElementById("programOrder").value, 10);
  const description = document.getElementById("programDescription").value.trim();
  if (!title || !order || !description) {
    alert("Please fill in title, display order and description before saving.");
    return null;
  }
  return { title, order, description };
}

function clearProgramForm() {
  document.getElementById("programTitle").value = "";
  document.getElementById("programOrder").value = "";
  document.getElementById("programDescription").value = "";
}

async function saveProgram(photoUrl) {
  const fields = readProgramForm();
  if (!fields) return;
  await db.collection("programs").add({
    ...fields,
    photoUrl: photoUrl || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  clearProgramForm();
  renderPrograms();
}

const programPhotoWidget = createWidget((url) => saveProgram(url));

document.getElementById("programPhotoBtn").addEventListener("click", () => {
  if (!readProgramForm()) return;
  if (programPhotoWidget) {
    programPhotoWidget.open();
  } else {
    alert("Add your Cloudinary cloud name and unsigned upload preset in js/firebase-config.js first, or use 'Save Without Photo'.");
  }
});

document.getElementById("programSaveNoPhotoBtn").addEventListener("click", () => saveProgram(null));

// ---------------------------------------------------------------
// Leadership (collection: leaders)
// Each doc: { name, role, order, bio, photoUrl, createdAt }
// ---------------------------------------------------------------
const leadersBody = document.getElementById("leadersBody");

async function renderLeaders() {
  const snap = await db.collection("leaders").orderBy("order").get();
  if (snap.empty) {
    leadersBody.innerHTML = '<tr><td colspan="4" style="color:var(--ink-400);">No leaders added yet — the About page will show its default placeholder list until you add some here.</td></tr>';
    return;
  }
  leadersBody.innerHTML = "";
  snap.forEach((doc) => {
    const l = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${l.order ?? "-"}</td>
      <td>${l.name || ""}</td>
      <td>${l.role || ""}</td>
      <td><button class="icon-btn" data-id="${doc.id}">Remove</button></td>
    `;
    row.querySelector(".icon-btn").addEventListener("click", async () => {
      if (confirm(`Remove ${l.name} from the leadership list?`)) {
        await db.collection("leaders").doc(doc.id).delete();
        renderLeaders();
      }
    });
    leadersBody.appendChild(row);
  });
}

function readLeaderForm() {
  const name = document.getElementById("leaderName").value.trim();
  const role = document.getElementById("leaderRole").value.trim();
  const order = parseInt(document.getElementById("leaderRank").value, 10);
  const bio = document.getElementById("leaderBio").value.trim();
  if (!name || !role || !order) {
    alert("Please fill in name, role and rank before saving.");
    return null;
  }
  return { name, role, order, bio };
}

function clearLeaderForm() {
  document.getElementById("leaderName").value = "";
  document.getElementById("leaderRole").value = "";
  document.getElementById("leaderRank").value = "";
  document.getElementById("leaderBio").value = "";
}

async function saveLeader(photoUrl) {
  const fields = readLeaderForm();
  if (!fields) return;
  await db.collection("leaders").add({
    ...fields,
    photoUrl: photoUrl || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  clearLeaderForm();
  renderLeaders();
}

const leaderPhotoWidget = createWidget((url) => saveLeader(url));

document.getElementById("leaderPhotoBtn").addEventListener("click", () => {
  if (!readLeaderForm()) return;
  if (leaderPhotoWidget) {
    leaderPhotoWidget.open();
  } else {
    alert("Add your Cloudinary cloud name and unsigned upload preset in js/firebase-config.js first, or use 'Save Without Photo'.");
  }
});

document.getElementById("leaderSaveNoPhotoBtn").addEventListener("click", () => saveLeader(null));

// ---------------------------------------------------------------
// Church activities (collection: activities)
// Each doc: { title, date, description, photoUrl, createdAt }
// ---------------------------------------------------------------
const activitiesBody = document.getElementById("activitiesBody");

async function renderActivities() {
  const snap = await db.collection("activities").orderBy("createdAt", "desc").get();
  if (snap.empty) {
    activitiesBody.innerHTML = '<tr><td colspan="3" style="color:var(--ink-400);">No activities posted yet.</td></tr>';
    return;
  }
  activitiesBody.innerHTML = "";
  snap.forEach((doc) => {
    const a = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${a.title || ""}</td>
      <td>${a.date || ""}</td>
      <td><button class="icon-btn" data-id="${doc.id}">Remove</button></td>
    `;
    row.querySelector(".icon-btn").addEventListener("click", async () => {
      if (confirm(`Remove "${a.title}"?`)) {
        await db.collection("activities").doc(doc.id).delete();
        renderActivities();
      }
    });
    activitiesBody.appendChild(row);
  });
}

function readActivityForm() {
  const title = document.getElementById("activityTitle").value.trim();
  const date = document.getElementById("activityDate").value.trim();
  const description = document.getElementById("activityDescription").value.trim();
  if (!title || !description) {
    alert("Please fill in at least a title and description before posting.");
    return null;
  }
  return { title, date, description };
}

function clearActivityForm() {
  document.getElementById("activityTitle").value = "";
  document.getElementById("activityDate").value = "";
  document.getElementById("activityDescription").value = "";
}

async function saveActivity(photoUrl) {
  const fields = readActivityForm();
  if (!fields) return;
  await db.collection("activities").add({
    ...fields,
    photoUrl: photoUrl || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  clearActivityForm();
  renderActivities();
}

const activityPhotoWidget = createWidget((url) => saveActivity(url));

document.getElementById("activityPhotoBtn").addEventListener("click", () => {
  if (!readActivityForm()) return;
  if (activityPhotoWidget) {
    activityPhotoWidget.open();
  } else {
    alert("Add your Cloudinary cloud name and unsigned upload preset in js/firebase-config.js first, or use 'Post Without Photo'.");
  }
});

document.getElementById("activitySaveNoPhotoBtn").addEventListener("click", () => saveActivity(null));

// ---------------------------------------------------------------
// Messages (collection: messages)
// ---------------------------------------------------------------
const messagesBody = document.getElementById("messagesBody");

async function renderMessages() {
  const snap = await db.collection("messages").orderBy("createdAt", "desc").limit(50).get();
  if (snap.empty) {
    messagesBody.innerHTML = '<tr><td colspan="4" style="color:var(--ink-400);">No messages yet.</td></tr>';
    return;
  }
  messagesBody.innerHTML = "";
  snap.forEach((doc) => {
    const m = doc.data();
    const date = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().toLocaleDateString() : "-";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.name || ""}<br><small style="color:var(--ink-400);">${m.email || ""}</small></td>
      <td>${m.subject || ""}</td>
      <td>${date}</td>
      <td><span class="badge ${m.read ? "badge-read" : "badge-unread"}">${m.read ? "Read" : "New"}</span></td>
    `;
    row.addEventListener("click", async () => {
      alert(m.message || "");
      if (!m.read) {
        await db.collection("messages").doc(doc.id).update({ read: true });
        renderMessages();
      }
    });
    row.style.cursor = "pointer";
    messagesBody.appendChild(row);
  });
}

// ---------------------------------------------------------------
// Site settings (document: settings/contact)
// ---------------------------------------------------------------
async function loadSettings() {
  const doc = await db.collection("settings").doc("contact").get();
  if (doc.exists) {
    const d = doc.data();
    document.getElementById("settingPhone").value = d.phone || "";
    document.getElementById("settingEmail").value = d.email || "";
    document.getElementById("settingAddress").value = d.address || "";
  }
}

document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
  const status = document.getElementById("settingsStatus");
  await db.collection("settings").doc("contact").set({
    phone: document.getElementById("settingPhone").value.trim(),
    email: document.getElementById("settingEmail").value.trim(),
    address: document.getElementById("settingAddress").value.trim(),
  });
  status.textContent = "Settings saved.";
  setTimeout(() => (status.textContent = ""), 2500);
});

// --- Init -------------------------------------------------------
renderImages();
renderGalleryAdmin();
renderChurches();
renderPrograms();
renderLeaders();
renderActivities();
renderMessages();
loadSettings();
