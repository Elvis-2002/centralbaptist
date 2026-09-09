# Central Baptist Church Wakiso — Website & Admin App

A static, professional church website with a Firebase + Cloudinary backed
admin app, built to deploy on GitHub Pages under **centralbaptistchurchwakiso.org**.

## What's included

```
church-site/
├── index.html              Home page (rotating hero images)
├── about.html               Vision, mission, values, ministry approach, leadership
├── ministries.html          Restoration Home, Kumi Project, Daughters of Zion, education, departments
├── activities.html          Church activities / news posts
├── get-involved.html        Partnership and ways to serve
├── contact.html              Contact form + giving info
├── css/styles.css           Design system (colors, type, components)
├── js/firebase-config.js    Firebase + Cloudinary configuration (fill in)
├── js/main.js                Nav toggle, hero carousel, leadership list, activities feed
├── assets/logo-source.png   Church crest
├── robots.txt                Crawler rules + sitemap reference
├── sitemap.xml                Page list for search engines
├── CNAME                      Custom domain for GitHub Pages
├── tests/check_links.py      Automated local link/asset checker
└── admin/
    ├── index.html            Admin login (Firebase Auth)
    ├── dashboard.html        Admin dashboard shell
    ├── admin.css              Admin styling
    └── admin.js                Image uploads, leadership, activities, messages, settings
```

No build step is required — everything is plain HTML/CSS/JS, so it runs
directly on GitHub Pages.

---

## 1. Local setup

You don't need Node or any package manager — just a way to serve static
files (double-clicking the HTML files directly will break the Firebase
calls and Cloudinary's upload widget, so always use a local server).

```bash
cd church-site
python3 -m http.server 8000
```

Then open:
- `http://localhost:8000` — the public site
- `http://localhost:8000/admin` — the admin app

If `python3` isn't available, `npx serve` works the same way.

### Firebase project

1. Create a project at the [Firebase Console](https://console.firebase.google.com).
2. Add a **Web app** (`</>` icon) and copy the config object into
   `js/firebase-config.js`.
3. Enable **Authentication → Sign-in method → Email/Password**, and add
   your admin account under **Authentication → Users**.
4. Enable **Firestore Database** (production mode).
5. Paste the rules below into **Firestore → Rules → Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /homeImages/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /leaders/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /activities/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /gallery/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /programs/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /daughterChurches/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /messages/{docId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    match /settings/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

| Collection / Doc     | Purpose                                                    |
|-----------------------|-------------------------------------------------------------|
| `homeImages`           | Homepage carousel photos (`url`, `alt`, `order`)             |
| `leaders`               | Pastors and deacons, ranked by `order` (About page)          |
| `activities`            | Short church activity/news posts (Activities page)           |
| `gallery`                | Photo gallery images, ranked by `order` (Gallery page)        |
| `programs`               | Ongoing programs with photo + description (Programs page)     |
| `daughterChurches`        | Daughter churches, ranked by `order` (Daughter Churches page) |
| `messages`               | Contact form submissions                                    |
| `settings/contact`       | Phone, email, address shown on the site                     |

`localhost` is automatically an Authorized Domain in Firebase, so login
and Firestore work locally without extra setup.

### Cloudinary (image uploads)

1. Sign up at [cloudinary.com](https://cloudinary.com) and copy your
   **Cloud name** from the Dashboard.
2. **Settings → Upload → Upload presets → Add upload preset** — set
   **Signing Mode to "Unsigned"**, save, and note the preset name.
3. Paste both into `js/firebase-config.js` (`cloudinaryConfig`).

Uploaded photos are automatically optimized (`f_auto,q_auto` + a max
width for where they're used) at upload time — nothing to resize by
hand.

---

## 2. Testing

### Automated: local link/asset check

Run this before every deploy — it catches typos in file paths, missing
images, and broken internal links across every HTML page:

```bash
cd church-site
python3 tests/check_links.py
```

It exits with a non-zero status and lists every broken reference if
anything fails, so it's safe to wire into a CI step later if you want.

### Manual checklist

Run through this locally (`http://localhost:8000`) before deploying,
and again on the live domain after:

- [ ] Homepage hero carousel rotates and dots are clickable
- [ ] Every nav link works, and the mobile menu (narrow window) opens/closes
- [ ] Contact form submits successfully and appears in the admin **Messages** tab
- [ ] Admin login works, and signing out returns you to `/admin`
- [ ] Admin: upload a homepage image → appears on the homepage carousel
- [ ] Admin: add a leader → appears in rank order on `about.html#leadership`
- [ ] Admin: post an activity → appears newest-first on `activities.html`
- [ ] Facebook icon in the footer opens the correct page
- [ ] Site looks correct at mobile width (~375px) and desktop width
- [ ] `robots.txt` and `sitemap.xml` load without errors
  (`http://localhost:8000/robots.txt`, `.../sitemap.xml`)

### SEO validation

Once deployed, check these:
- [Google's Rich Results Test](https://search.google.com/test/rich-results)
  against the homepage — should pick up the Church structured data
- [PageSpeed Insights](https://pagespeed.web.dev) — confirms images are
  loading optimized and Core Web Vitals are healthy
- View page source and confirm the canonical tag, Open Graph tags, and
  title/description match the page you're on

---

## 3. SEO — what's already set up

- **Titles & meta descriptions** — unique per page
- **Canonical URLs** — every page points to its `https://centralbaptistchurchwakiso.org/...` URL
- **Open Graph & Twitter Card tags** — for clean previews when the site
  is shared on Facebook, Twitter/X, or WhatsApp
- **`robots.txt`** — allows crawling of the public site, blocks `/admin/`
- **`sitemap.xml`** — lists all six public pages for search engines
- **Church structured data (JSON-LD)** — on the homepage, describing the
  church, address, Facebook page, and Sunday service time so Google can
  show rich results
- **Semantic HTML** — proper heading hierarchy, `alt` text on images,
  a skip-to-content link

### After you deploy

1. Add the site in [Google Search Console](https://search.google.com/search-console)
   using the `centralbaptistchurchwakiso.org` domain property.
2. Submit `https://centralbaptistchurchwakiso.org/sitemap.xml` under
   **Sitemaps**.
3. Use **URL Inspection → Request Indexing** on the homepage to speed up
   the first crawl.
4. Once you're using it, verify with Bing Webmaster Tools too — it's a
   two-minute add and Bing/DuckDuckGo results draw from it.

---

## 4. Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. **Settings → Pages** — set the source to your branch (e.g. `main`)
   and the root folder.
3. Because a `CNAME` file with `centralbaptistchurchwakiso.org` is
   already in this repo, GitHub will pick it up automatically — you'll
   see it pre-filled under **Settings → Pages → Custom domain**.

### Point the domain at GitHub

At your domain registrar, add these DNS records (GitHub's Pages
settings screen also lists the current IPs if they've changed):

**For the apex domain (`centralbaptistchurchwakiso.org`)** — four A
records pointing to GitHub Pages' IPs:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**For `www.centralbaptistchurchwakiso.org`** (optional but recommended)
— a CNAME record pointing to `<your-github-username>.github.io`.

4. Back in **Settings → Pages**, once DNS has propagated, tick
   **Enforce HTTPS**.
5. Add `centralbaptistchurchwakiso.org` (and `www.` if used) to
   **Firebase Console → Authentication → Settings → Authorized domains**
   — otherwise admin login will fail on the live domain even though it
   works on `localhost`.

DNS changes can take anywhere from a few minutes to 24-48 hours to
propagate fully.

---

## 5. Things to finish before launch

- Replace the placeholder phone number, email, address and giving
  details (mobile money code, bank account) in `contact.html`.
- Swap `assets/logo-source.png` for a high-resolution version of the
  crest — the current file was extracted from your profile document
  and is low resolution, which also affects how sharp it looks in
  social share previews.
- Add real photography through the admin app for the homepage carousel,
  leadership photos, and activity posts.
- Update service times if they differ from the placeholder "Sunday
  9:00 AM" shown in the footer and contact page.
- Update `sitemap.xml`'s dates or resubmit it in Search Console
  whenever you add a page.
