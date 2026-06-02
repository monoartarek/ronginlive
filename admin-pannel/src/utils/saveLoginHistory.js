import Parse from "../parseConfig";

/* ════════════════════════════════════════════════════════════
   saveLoginHistory.js — Complete Version
   
   Exports:
     saveLoginHistory(user, "login")   → call after login
     saveLoginHistory(user, "logout")  → call before logout
   
   ⚠️  REPLACE YOUR GOOGLE API KEY BELOW
   Steps:
     1. Go to https://console.cloud.google.com
     2. Create/select a project
     3. Enable "Geocoding API"
     4. Go to Credentials → Create API Key
     5. Paste it below
════════════════════════════════════════════════════════════ */
const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY_HERE"; // ← paste your key here

/* ─────────────────────────────────────────────────────────
   DETECT OS
───────────────────────────────────────────────────────── */
function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua))  return "Windows 10";
  if (/Windows NT 6.3/.test(ua)) return "Windows 8.1";
  if (/Windows NT 6.1/.test(ua)) return "Windows 7";
  if (/Windows/.test(ua))        return "Windows";
  if (/Mac OS X 13/.test(ua))    return "macOS Ventura";
  if (/Mac OS X 12/.test(ua))    return "macOS Monterey";
  if (/Mac OS X 11/.test(ua))    return "macOS Big Sur";
  if (/Mac OS X 10_15/.test(ua)) return "macOS Catalina";
  if (/Mac OS X/.test(ua))       return "macOS";
  if (/iPhone/.test(ua))         return "iOS";
  if (/iPad/.test(ua))           return "iPadOS";
  if (/Android/.test(ua)) {
    const v = ua.match(/Android ([0-9.]+)/);
    return v ? `Android ${v[1]}` : "Android";
  }
  if (/CrOS/.test(ua)) return "Chrome OS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}

/* ─────────────────────────────────────────────────────────
   DETECT BROWSER
───────────────────────────────────────────────────────── */
function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))          return "Microsoft Edge";
  if (/OPR\//.test(ua))          return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Browser";
  if (/UCBrowser/.test(ua))      return "UC Browser";
  if (/YaBrowser/.test(ua))      return "Yandex Browser";
  if (/Chrome\//.test(ua))       return "Chrome";
  if (/Firefox\//.test(ua))      return "Firefox";
  if (/Safari\//.test(ua))       return "Safari";
  if (/MSIE|Trident/.test(ua))   return "Internet Explorer";
  return "Unknown Browser";
}

/* ─────────────────────────────────────────────────────────
   DETECT DEVICE TYPE
───────────────────────────────────────────────────────── */
function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobi|Android.*Mobile|iPhone/.test(ua))     return "Mobile";
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return "Tablet";
  return "Desktop";
}

/* ─────────────────────────────────────────────────────────
   DETECT DEVICE NAME
───────────────────────────────────────────────────────── */
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua))   return "iPad";
  if (/Android/.test(ua)) {
    const match = ua.match(/Android [^;]+;\s*([^)]+)\)/);
    if (match) return match[1].trim().replace(/\s*Build\/.*$/, "").trim() || "Android Device";
    return "Android Device";
  }
  if (/Surface/.test(ua))   return "Microsoft Surface";
  if (/Windows/.test(ua))   return "Windows PC";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/CrOS/.test(ua))      return "Chromebook";
  return "Desktop";
}

/* ════════════════════════════════════════════════════════════
   GPS — get exact lat/lng from device
   Shows browser popup: "Allow location access?"
   - Allow → exact GPS coordinates (±1–50m)
   - Block  → returns null → IP fallback used
════════════════════════════════════════════════════════════ */
function getGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  Math.round(pos.coords.accuracy),
      }),
      () => resolve(null),           // denied or timed out
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/* ════════════════════════════════════════════════════════════
   REVERSE GEOCODING — lat/lng → country, city, region
   
   Priority order:
   1. Google Geocoding API (most accurate) — needs API key
   2. Nominatim / OpenStreetMap (FREE, no key needed) — fallback
   3. BigDataCloud (FREE, no key needed) — second fallback
════════════════════════════════════════════════════════════ */
async function reverseGeocode(latitude, longitude) {

  /* ── Try Google first if key is set ── */
  if (GOOGLE_API_KEY && GOOGLE_API_KEY !== "YOUR_GOOGLE_API_KEY_HERE") {
    try {
      const url  = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.results?.length) {
        let country = "—", city = "—", region = "—";
        const fullAddress = data.results[0]?.formatted_address || "—";
        for (const result of data.results) {
          for (const comp of result.address_components) {
            const t = comp.types;
            if (t.includes("country")                          && country === "—") country = comp.long_name;
            if (t.includes("administrative_area_level_1")      && region  === "—") region  = comp.long_name;
            if (t.includes("locality")                         && city    === "—") city    = comp.long_name;
            else if (t.includes("administrative_area_level_2") && city    === "—") city    = comp.long_name;
          }
          if (country !== "—" && city !== "—" && region !== "—") break;
        }
        return { country, city, region, fullAddress };
      }
    } catch { /* fall through to free APIs */ }
  }

  /* ── Fallback 1: BigDataCloud (FREE, no key, very good) ── */
  try {
    const url  = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.countryName) {
      return {
        country:     data.countryName                   || "—",
        city:        data.city || data.locality         || data.principalSubdivision || "—",
        region:      data.principalSubdivision          || "—",
        fullAddress: data.locality
          ? `${data.locality}, ${data.principalSubdivision}, ${data.countryName}`
          : `${data.principalSubdivision}, ${data.countryName}`,
      };
    }
  } catch { /* try next */ }

  /* ── Fallback 2: Nominatim OpenStreetMap (FREE, no key) ── */
  try {
    const url  = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
    const res  = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data.address) {
      const a = data.address;
      return {
        country:     a.country                                          || "—",
        city:        a.city || a.town || a.village || a.county         || "—",
        region:      a.state                                            || "—",
        fullAddress: data.display_name                                  || "—",
      };
    }
  } catch { /* all failed */ }

  return { country: "—", city: "—", region: "—", fullAddress: "—" };
}

/* ════════════════════════════════════════════════════════════
   IP FALLBACK — if GPS is denied
   Used when user blocks location permission
════════════════════════════════════════════════════════════ */
async function getIPLocation() {
  const apis = [
    async () => {
      const r = await fetch("https://freeipapi.com/api/json");
      const d = await r.json();
      if (!d.ipAddress) throw new Error("no data");
      return { ipAddress: d.ipAddress, country: d.countryName || "—", city: d.cityName || "—", region: d.regionName || "—", latitude: d.latitude || null, longitude: d.longitude || null };
    },
    async () => {
      const r = await fetch("https://ipapi.co/json/");
      const d = await r.json();
      if (d.error) throw new Error(d.reason);
      return { ipAddress: d.ip, country: d.country_name || "—", city: d.city || "—", region: d.region || "—", latitude: d.latitude || null, longitude: d.longitude || null };
    },
    async () => {
      const r = await fetch("https://ipwhois.app/json/");
      const d = await r.json();
      if (!d.ip) throw new Error("no data");
      return { ipAddress: d.ip, country: d.country || "—", city: d.city || "—", region: d.region || "—", latitude: d.latitude ? parseFloat(d.latitude) : null, longitude: d.longitude ? parseFloat(d.longitude) : null };
    },
  ];
  for (const api of apis) {
    try { return await api(); } catch { /* try next */ }
  }
  return { ipAddress: "—", country: "—", city: "—", region: "—", latitude: null, longitude: null };
}

/* ─── Get public IP (always) ─── */
async function getPublicIP() {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    return d.ip || "—";
  } catch { return "—"; }
}

/* ════════════════════════════════════════════════════════════
   COMBINED LOCATION
   - For "login"  → try GPS first, then IP fallback
   - For "logout" → skip GPS (no popup), use IP only (fast)
   - For "failed" → skip GPS, use IP only (fast)
════════════════════════════════════════════════════════════ */
async function getLocationInfo(eventType = "login") {
  const publicIP = await getPublicIP();

  /* Skip GPS for logout/failed — no popup, faster */
  if (eventType !== "login") {
    const ipLoc = await getIPLocation();
    return {
      ipAddress:      publicIP || ipLoc.ipAddress,
      country:        ipLoc.country,
      city:           ipLoc.city,
      region:         ipLoc.region,
      fullAddress:    "—",
      latitude:       ipLoc.latitude,
      longitude:      ipLoc.longitude,
      accuracy:       null,
      locationSource: "ip",
    };
  }

  /* For login → try GPS first */
  const gps = await getGPSLocation();

  if (gps?.latitude && gps?.longitude) {
    /* GPS succeeded — reverse geocode */
    const place = await reverseGeocode(gps.latitude, gps.longitude);

    /* If geocoding failed (no API key) → also try IP for country/city */
    if (place.country === "—") {
      const ipLoc = await getIPLocation();
      return {
        ipAddress:      publicIP,
        country:        ipLoc.country,
        city:           ipLoc.city,
        region:         ipLoc.region,
        fullAddress:    "—",
        latitude:       gps.latitude,
        longitude:      gps.longitude,
        accuracy:       gps.accuracy,
        locationSource: "gps",
      };
    }

    return {
      ipAddress:      publicIP,
      country:        place.country,
      city:           place.city,
      region:         place.region,
      fullAddress:    place.fullAddress,
      latitude:       gps.latitude,
      longitude:      gps.longitude,
      accuracy:       gps.accuracy,
      locationSource: "gps",
    };
  }

  /* GPS denied → IP fallback */
  const ipLoc = await getIPLocation();
  return {
    ipAddress:      publicIP || ipLoc.ipAddress,
    country:        ipLoc.country,
    city:           ipLoc.city,
    region:         ipLoc.region,
    fullAddress:    "—",
    latitude:       ipLoc.latitude,
    longitude:      ipLoc.longitude,
    accuracy:       null,
    locationSource: "ip",
  };
}

/* ════════════════════════════════════════════════════════════
   MAIN EXPORT
   
   eventType options:
     "login"   → admin logged in  ✅
     "logout"  → admin logged out 🚪
     "failed"  → wrong credentials ✕
════════════════════════════════════════════════════════════ */
export async function saveLoginHistory(adminUser, eventType = "login", fallbackUsername = "") {
  try {
    /* device info */
    const os         = detectOS();
    const browser    = detectBrowser();
    const deviceType = detectDeviceType();
    const device     = detectDevice();
    const screen     = `${window.screen.width}x${window.screen.height}`;
    const language   = navigator.language || "—";
    const timezone   = Intl.DateTimeFormat().resolvedOptions().timeZone || "—";

    /* location — GPS for login, IP-only for logout/failed (no popup) */
    const location = await getLocationInfo(eventType);

    /* admin info */
    let adminId       = "—";
    let adminName     = "—";
    let adminUsername = fallbackUsername || "—";
    let adminGender   = "—";
    let adminAvatar   = null;

    if (adminUser) {
      adminId   = adminUser.id || "—";
      adminName =
        adminUser.get("fullName")    ||
        adminUser.get("displayName") ||
        adminUser.get("name")        ||
        adminUser.get("firstName")   ||
        adminUser.get("adminName")   ||
        adminUser.get("username")    ||
        adminUser.id || "—";

      adminUsername = adminUser.get("username") || fallbackUsername || "—";
      adminGender   = adminUser.get("gender")   || adminUser.get("sex") || "—";

      const av =
        adminUser.get("avatar")       ||
        adminUser.get("profileImage") ||
        adminUser.get("photo")        ||
        adminUser.get("image");
      if (av && typeof av.url === "function") adminAvatar = av.url();
      else if (typeof av === "string" && av.startsWith("http")) adminAvatar = av;
    }

    /* build record */
    const LoginHistory = Parse.Object.extend("AdminLoginHistory");
    const record       = new LoginHistory();

    /* admin */
    record.set("adminId",       adminId);
    record.set("adminName",     adminName);
    record.set("adminUsername", adminUsername);
    record.set("adminGender",   adminGender);
    if (adminAvatar) record.set("adminAvatar", adminAvatar);

    /* event type — login / logout / failed */
    record.set("eventType", eventType);
    record.set("status",
      eventType === "login"  ? "success" :
      eventType === "logout" ? "logout"  : "failed"
    );
    record.set("eventAt", new Date());
    record.set("loginAt", new Date()); // keep for backward compat

    /* device */
    record.set("device",      device);
    record.set("deviceType",  deviceType);
    record.set("os",          os);
    record.set("browser",     browser);
    record.set("screen",      screen);
    record.set("language",    language);
    record.set("timezone",    timezone);
    record.set("userAgent",   navigator.userAgent);

    /* location */
    record.set("ipAddress",      location.ipAddress);
    record.set("country",        location.country);
    record.set("city",           location.city);
    record.set("region",         location.region);
    record.set("locationSource", location.locationSource);
    if (location.fullAddress && location.fullAddress !== "—")
      record.set("fullAddress", location.fullAddress);
    if (location.latitude)  record.set("latitude",  location.latitude);
    if (location.longitude) record.set("longitude", location.longitude);
    if (location.accuracy)  record.set("accuracy",  location.accuracy);

    await record.save(null, { useMasterKey: true });

    console.log(`✅ ${eventType.toUpperCase()} history saved | ${location.city}, ${location.country} | source: ${location.locationSource}`);

  } catch (err) {
    console.warn("⚠️ Login history save failed (non-critical):", err.message);
  }
}