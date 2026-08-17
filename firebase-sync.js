// Cross-device sync for this site's plan progress (checkboxes) and plan registry
// (active/completed status), backed by Firebase Realtime Database.
//
// Falls back silently to localStorage-only if Firebase isn't configured yet or is
// unreachable (offline, ad-blocker, etc.) — the site works either way, just without
// cross-device sync until FIREBASE_CONFIG below is filled in.
//
// Security model: signs in anonymously (silent, no UI) so the database rules can
// require `auth != null` instead of being wide open — this blocks direct REST/curl
// access to the database from anyone who finds this public repo, while staying
// zero-friction for real visitors. See CLAUDE.md's Firebase setup section for the
// exact rules and console steps this depends on. The FIREBASE_CONFIG values below
// are not secret in Firebase's security model — access control lives in the
// database rules and API key restrictions (Google Cloud Console), not in hiding
// this file.

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
  var pending = [];

  function isConfigured(){
    return FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf("REPLACE_ME") === -1;
  }

  function localGet(key){
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function localSet(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* private-browsing or storage disabled; sync (if any) still works */ }
  }

  function attach(key, callback){
    db.ref(SYNC_PATH_PREFIX + '/' + key).on('value', function (snap) {
      var val = snap.val();
      if (val) { localSet(key, val); callback(val); }
    });
  }

  if (isConfigured() && global.firebase) {
    try {
      global.firebase.initializeApp(FIREBASE_CONFIG);
      db = global.firebase.database();
      global.firebase.auth().signInAnonymously().then(function(){
        ready = true;
        pending.forEach(function(item){
          if (item.type === 'watch') attach(item.key, item.callback);
          else db.ref(SYNC_PATH_PREFIX + '/' + item.key).set(item.value);
        });
        pending = [];
      }).catch(function(){ ready = false; });
    } catch (e) { ready = false; }
  }

  global.PlanSync = {
    // callback(value) fires immediately with any cached local value, then again
    // whenever Firebase has fresher data (including changes made on another device).
    watch: function (key, callback) {
      var local = localGet(key);
      if (local) callback(local);
      if (!db) return;
      if (ready) attach(key, callback);
      else pending.push({ type: 'watch', key: key, callback: callback });
    },
    save: function (key, value) {
      localSet(key, value);
      if (!db) return;
      if (ready) db.ref(SYNC_PATH_PREFIX + '/' + key).set(value);
      else pending.push({ type: 'save', key: key, value: value });
    },
    isReady: function () { return ready; }
  };
})(window);
