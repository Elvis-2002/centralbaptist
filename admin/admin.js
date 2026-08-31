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
// flags (and a sensible max width for where the photo is used) into
// a secure_url returned by the upload widget, so every photo we save
// is served as a lighter, browser-optimized file without anyone
// having to resize or compress it by hand before uploading.
function optimizeCloudinaryUrl(url, maxWidth) {
  if (!url) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${maxWidth},c_limit/`);
}

function createWidget(cropRatio, onSuccess) {
  if (!cloudinaryReady) return null;
  return cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      sources: ["local", "camera", "url"],
      multiple: false,
      cropping: true,
      croppingAspectRatio: cropRatio,
    },
    (error, result) => {
      if (!error && result && result.event === "success") {
        onSuccess(result.info.secure_url, result.info.public_id);
      }
    }
  );
}

const uploadWidget = createWidget(16 / 9, async (url, publicId) => {
  const snap = await db.collection("homeImages").orderBy("order", "desc").limit(1).get();
  const nextOrder = snap.empty ? 1 : (snap.docs[0].data().order || 0) + 1;
  await db.collection("homeImages").add({
    url: optimizeCloudinaryUrl(url, 1920),
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
    photoUrl: photoUrl ? optimizeCloudinaryUrl(photoUrl, 600) : null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  clearLeaderForm();
  renderLeaders();
}

const leaderPhotoWidget = createWidget(1 / 1, (url) => saveLeader(url));

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
    photoUrl: photoUrl ? optimizeCloudinaryUrl(photoUrl, 1200) : null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  clearActivityForm();
  renderActivities();
}

const activityPhotoWidget = createWidget(16 / 9, (url) => saveActivity(url));

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
renderLeaders();
renderActivities();
renderMessages();
loadSettings();
