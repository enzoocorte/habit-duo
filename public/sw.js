const CACHE_NAME = "habit-duo-v2";
const ASSETS = ["/habit-duo/"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATIONS") {
    scheduleSmartNotifications(event.data.payload);
  }
  if (event.data && event.data.type === "CANCEL_NOTIFICATIONS") {
    cancelAllNotifications();
  }
});

async function scheduleSmartNotifications(payload) {
  const { todayXp, effectiveGoal, incompleteHabits, streak } = payload;
  await cancelAllNotifications();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (todayXp < effectiveGoal * 0.5) {
    const t = new Date(today); t.setHours(18,0,0,0);
    if (t > now) {
      scheduleNotif("streak-risk", t,
        "\ud83d\udd25 Tu racha esta en riesgo",
        "Te faltan " + (effectiveGoal - todayXp) + " XP. Vamos!"
      );
    }
  }

  if (todayXp < effectiveGoal) {
    const t = new Date(today); t.setHours(21,0,0,0);
    if (t > now) {
      scheduleNotif("last-chance", t,
        "\u23f3 Ultima oportunidad",
        "Te faltan " + (effectiveGoal - todayXp) + " XP. Salva tu racha!"
      );
    }
  }

  if (incompleteHabits && incompleteHabits.length > 0) {
    const t = new Date(today); t.setHours(17,0,0,0);
    if (t > now) {
      const h = incompleteHabits[0];
      scheduleNotif("habit-reminder", t,
        h.name + " te espera",
        h.progressive
          ? (h.minAmount || 5) + " " + (h.unit || "min") + " ahora valen " + (h.barrierBonus || 10) + " XP"
          : "Completalo y gana " + h.xpReward + " XP!"
      );
    }
  }
}

function scheduleNotif(id, time, title, body) {
  const delay = time.getTime() - Date.now();
  if (delay > 0 && delay < 86400000) {
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, icon: "/habit-duo/icon-192.png", tag: id, vibrate: [200,100,200]
      });
    }, delay);
  }
}

async function cancelAllNotifications() {
  self.registration.getNotifications().then(ns => ns.forEach(n => n.close()));
}
