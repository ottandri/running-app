// Cross-device sync for this site's plan progress (checkboxes) and plan registry
// (active/completed status), backed by Firebase Realtime Database.
//
// Falls back silently to localStorage-only if Firebase isn't configured yet or is
// unreachable (offline, ad-blocker, etc.) — the site works either way, just without
// cross-device sync until FIREBASE_CONFIG below is filled in.
//
// Setup: create a free Firebase project + Realtime Database, then paste the config
// object from Project settings > General > Your apps into FIREBASE_CONFIG below.
// SYNC_PATH_PREFIX acts as a lightweight shared secret alongside open database rules
// (fine for this non-sensitive, single-user data) — keep it as the random string it
// ships with, don't shorten it to something guessable.

(function (global) {
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyDP9GWHTqlf4qZaDvao71w6BGwoWcg-g1M",
    authDomain: "andri-running.firebaseapp.com",
    databaseURL: "https://andri-running-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "andri-running"
  };
  var SYNC_PATH_PREFIX = "bFo5Lgt68_zWmKB5LzPHfHtD";

  var db = null;
  var ready = false;

  function isConfigured(){
    return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf("REPLACE_ME") === -1;
  }

  if (isConfigured() && global.firebase) {
    try {
      global.firebase.initializeApp(FIREBASE_CONFIG);
      db = global.firebase.database();
      ready = true;
    } catch (e) { ready = false; }
  }

  function localGet(key){
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function localSet(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* private-browsing or storage disabled; sync (if any) still works */ }
  }

  global.PlanSync = {
    // callback(value) fires immediately with any cached local value, then again
    // whenever Firebase has fresher data (including changes made on another device).
    watch: function (key, callback) {
      var local = localGet(key);
      if (local) callback(local);
      if (!ready) return;
      db.ref(SYNC_PATH_PREFIX + '/' + key).on('value', function (snap) {
        var val = snap.val();
        if (val) { localSet(key, val); callback(val); }
      });
    },
    save: function (key, value) {
      localSet(key, value);
      if (ready) db.ref(SYNC_PATH_PREFIX + '/' + key).set(value);
    },
    isReady: function () { return ready; }
  };
})(window);
