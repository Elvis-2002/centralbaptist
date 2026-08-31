// ---------------------------------------------------------------
// Firebase project configuration.
// Replace the placeholder values below with the config object
// from Firebase Console > Project settings > General > Your apps.
// This same file is shared by the public site and the admin app.
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCUc-OGgjRb164eAlvRfTwjZi9aBc3RHrY",
  authDomain: "central-baptist-church-wakiso.firebaseapp.com",
  projectId: "central-baptist-church-wakiso",
  storageBucket: "central-baptist-church-wakiso.firebasestorage.app",
  messagingSenderId: "520162388442",
  appId: "1:520162388442:web:b94de959c6f4b1cbd4f8e3",
  measurementId: "G-YZ5TLCD9NZ"
};

// Cloudinary — used for image uploads from the admin app.
// The upload preset must be created as "unsigned" in
// Cloudinary Console > Settings > Upload so the browser can
// upload directly without exposing your API secret.
const cloudinaryConfig = {
  cloudName: "hiz0j9sa",
  uploadPreset: "Baptist",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
