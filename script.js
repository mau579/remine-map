const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQocNSCaHskZYIBqPuWhdCwWa24Rr8ylmmOfFJnAFTgcH7utx4CgJ7xxphu6JrOpywSFk3vgxC9lRAh/pub?gid=0&single=true&output=csv";
let allLocations = [];
let activePublicLocations = [];
let locationsMap = null;
let markerLayer = null;

const ALEXANDRIA_CENTER = [31.3113, -92.4451];

const MATERIAL_ALIASES = {
  "aluminum-cans": ["aluminum cans", "aluminum beverage cans"],
  brass: ["brass"],
  "compact-fluorescent-light-bulbs": ["compact fluorescent light bulbs", "compact fluorescent bulbs", "cfl", "cfls"],
  copper: ["copper"],
  electronics: ["electronics", "electronic equipment"],
  glass: ["glass", "glass bottles", "glass and bottles", "bottles and glass"],
  iron: ["iron", "ferrous metals", "ferrous metals iron"],
  "lead-acid-batteries": ["lead acid batteries"],
  "lead-acid-batteries-non-automotive": ["lead acid batteries non automotive", "non automotive lead acid batteries"],
  "metal-clothes-hangers": ["metal clothes hangers", "metal clothing hangers"],
  "nicad-batteries": ["nicad", "ni cad", "nicad batteries", "ni cad batteries"],
  "rechargeable-batteries": ["rechargeable batteries"],
  "steel-cans": ["steel cans", "tin or steel cans"],
  "tin-cans": ["tin cans", "tin or steel cans"],
  "used-motor-oil": ["used motor oil", "motor oil"],
  "vehicle-donation": ["vehicle donation", "vehicle donations"]
};

function normalizeMaterialText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesMaterialPhrase(text, phrase) {
  const normalizedText = ` ${normalizeMaterialText(text)} `;
  const normalizedPhrase = ` ${normalizeMaterialText(phrase)} `;
  return normalizedText.includes(normalizedPhrase);
}

function matchesMaterialCategory(location, category) {
  if (category === "electronics" && location.acceptsElectronics.toLowerCase() === "yes") {
    return true;
  }

  const materialValues = [
    ...location.materialsAccepted,
    ...location.acceptedBatteryTypes,
    ...location.acceptedElectronics,
    location.notes
  ];

  return (MATERIAL_ALIASES[category] || []).some(alias =>
    materialValues.some(value => includesMaterialPhrase(value, alias))
  );
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseCoordinate(value) {
  const normalizedValue = String(value || "")
    .trim()
    .replace(",", ".");

  return Number.parseFloat(normalizedValue);
}

function getLocationId(location) {
  const locationKey = `${location.locationName}-${location.address}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `location-${locationKey || "listing"}`;
}

function hasValidCoordinates(location) {
  return Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180;
}

function getMapPopup(location) {
  const fullAddress = [location.address, location.city, location.state, location.zipCode]
    .filter(Boolean)
    .join(", ");
  const materials = location.materialsAccepted.length > 0
    ? location.materialsAccepted.join(", ")
    : location.acceptedBatteryTypes.join(", ") || "Call to confirm";
  const isVerified = location.verificationStatus.trim().toLowerCase() === "verified";

  return `
    <div class="map-popup">
      <h3>${escapeHTML(location.locationName)}</h3>
      <p>${escapeHTML(fullAddress)}</p>
      <p><strong>Materials:</strong> ${escapeHTML(materials)}</p>
      <p class="map-popup-status ${isVerified ? "is-verified" : "is-unconfirmed"}">
        ${escapeHTML(location.verificationStatus)}
      </p>
      <a class="map-popup-link" href="#${getLocationId(location)}" data-listing-id="${getLocationId(location)}">
        View full listing
      </a>
    </div>
  `;
}

function initializeMap() {
  if (locationsMap || typeof L === "undefined") {
    return;
  }

  locationsMap = L.map("locations-map", {
    center: ALEXANDRIA_CENTER,
    zoom: 11,
    scrollWheelZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(locationsMap);

  markerLayer = L.layerGroup().addTo(locationsMap);
}

function updateMapSummary(locations) {
  const summary = document.getElementById("map-summary");
  const mappedCount = locations.filter(hasValidCoordinates).length;
  const omittedCount = locations.length - mappedCount;

  if (locations.length === 0) {
    summary.textContent = "No locations match the current search and filters.";
  } else if (mappedCount === 0) {
    summary.textContent = "No matching listings have map coordinates yet. All listings remain available in List View.";
  } else if (omittedCount > 0) {
    summary.textContent = `${mappedCount} mapped ${mappedCount === 1 ? "location" : "locations"}. ${omittedCount} additional ${omittedCount === 1 ? "listing is" : "listings are"} available in List View.`;
  } else {
    summary.textContent = `${mappedCount} ${mappedCount === 1 ? "location" : "locations"} shown on the map.`;
  }
}

function renderMapMarkers(locations) {
  updateMapSummary(locations);

  if (!locationsMap || !markerLayer) {
    return;
  }

  markerLayer.clearLayers();
  const mappedLocations = locations.filter(hasValidCoordinates);
  const bounds = [];
  const markerIcon = L.divIcon({
    className: "remine-marker-shell",
    html: '<span class="remine-map-marker"><span></span></span>',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38]
  });

  mappedLocations.forEach(location => {
    const coordinates = [location.latitude, location.longitude];
    L.marker(coordinates, { icon: markerIcon, title: location.locationName })
      .bindPopup(getMapPopup(location), { maxWidth: 300 })
      .addTo(markerLayer);
    bounds.push(coordinates);
  });

  if (bounds.length === 1) {
    locationsMap.setView(bounds[0], 14);
  } else if (bounds.length > 1) {
    locationsMap.fitBounds(bounds, { padding: [42, 42], maxZoom: 14 });
  } else {
    locationsMap.setView(ALEXANDRIA_CENTER, 11);
  }
}

function setDirectoryView(view) {
  const showMap = view === "map";
  document.getElementById("list-view").hidden = showMap;
  document.getElementById("map-view").hidden = !showMap;
  document.getElementById("list-view-button").classList.toggle("is-active", !showMap);
  document.getElementById("map-view-button").classList.toggle("is-active", showMap);
  document.getElementById("list-view-button").setAttribute("aria-pressed", String(!showMap));
  document.getElementById("map-view-button").setAttribute("aria-pressed", String(showMap));

  if (showMap) {
    initializeMap();
    renderMapMarkers(activePublicLocations);
    window.setTimeout(() => locationsMap?.invalidateSize(), 0);
  }
}

// Keeps the directory usable when index.html is opened directly from Finder.
// The published sheet remains the primary source when the site is served online.
const LOCAL_LOCATIONS = [
  {
    locationName: "Battery Warehouse", locationType: "Battery retailer / battery drop-off",
    address: "3711 Mac Lee Dr", city: "Alexandria", state: "LA", zipCode: "71302",
    phone: "(318) 448-1998", website: "https://batteryalexandria.usbatterydealers.com",
    materialsAccepted: ["Batteries"], acceptsBatteries: "Yes",
    acceptedBatteryTypes: ["Car batteries", "Lead-acid batteries", "NiCad batteries", "Rechargeable batteries", "Single-use batteries"],
    acceptsLithiumIon: "Unknown", acceptsElectronics: "No", acceptedElectronics: [],
    restrictions: "Call before drop-off. Confirm accepted battery types before visiting.",
    hours: "Mon–Fri 7:30 AM–5:00 PM; Sat 8:00 AM–12:00 PM; Sun closed.", cost: "Unknown",
    safetyInstructions: "Do not bring damaged, leaking, swollen, or hot batteries unless confirmed by the location.",
    callBeforeDropoff: "Recommended", verificationStatus: "Pending", logoFile: "battery-warehouse.png", publicListing: "Yes"
  },
  {
    locationName: "Xpress Recycling", locationType: "Recycling center / scrap metal recycler",
    address: "1210 Dallas Ave", city: "Alexandria", state: "LA", zipCode: "71303",
    phone: "(318) 619-8488", website: "https://www.xpressrecycling.com",
    materialsAccepted: ["Aluminum beverage cans", "Ferrous metals", "Nonferrous metals", "Copper", "Brass", "Aluminum", "Lead", "Batteries"],
    acceptsBatteries: "Yes", acceptedBatteryTypes: ["Call to confirm"], acceptsLithiumIon: "Unknown",
    acceptsElectronics: "No", acceptedElectronics: [], restrictions: "Call before drop-off; accepted battery types are not specified.",
    hours: "Mon–Fri 8:00 AM–4:00 PM; Sat–Sun closed.", cost: "Unknown",
    safetyInstructions: "Call before bringing batteries.", callBeforeDropoff: "Recommended",
    verificationStatus: "Pending", logoFile: "xpress-recycling.png", publicListing: "Yes"
  },
  {
    locationName: "Goodwill", locationType: "Donation center / electronics donation",
    address: "5216 Jackson Street", city: "Alexandria", state: "LA", zipCode: "71303",
    phone: "(318) 445-2606", website: "https://goodwillnla.org",
    materialsAccepted: ["Desktop computers", "LCD computer monitors", "Office machines", "Clothing", "Furniture", "Collectables"],
    acceptsBatteries: "Unknown", acceptedBatteryTypes: ["Call to confirm"], acceptsLithiumIon: "Unknown",
    acceptsElectronics: "Yes", acceptedElectronics: ["Desktop computers", "LCD computer monitors", "Office machines"],
    restrictions: "Call before drop-off. Battery acceptance is unknown.", hours: "Open daily 10:00 AM–4:00 PM.", cost: "Unknown",
    safetyInstructions: "Battery acceptance is unknown. Call before bringing batteries.", callBeforeDropoff: "Recommended",
    verificationStatus: "Pending", logoFile: "goodwill.png", publicListing: "Yes"
  },
  {
    locationName: "Home Depot", locationType: "Retail drop-off",
    address: "5000 Masonic Dr", city: "Alexandria", state: "LA", zipCode: "71301",
    phone: "(318) 767-8988", website: "https://www.homedepot.com/l/Alexandria/LA/Alexandria/71301/374",
    materialsAccepted: ["Car batteries", "Cell phones", "Compact fluorescent light bulbs", "Lead-acid batteries", "Rechargeable batteries"],
    acceptsBatteries: "Yes", acceptedBatteryTypes: ["Car batteries", "Lead-acid batteries", "Rechargeable batteries"],
    acceptsLithiumIon: "Unknown", acceptsElectronics: "Yes", acceptedElectronics: ["Cell phones"],
    restrictions: "Call before drop-off. Confirm accepted types and instructions before visiting.",
    hours: "Mon–Sat 6:00 AM–9:00 PM; Sun 8:00 AM–8:00 PM.", cost: "Unknown",
    safetyInstructions: "Call before bringing batteries.", callBeforeDropoff: "Recommended",
    verificationStatus: "Pending", logoFile: "home-depot.png", publicListing: "Yes"
  },
  {
    locationName: "Best Buy", locationType: "Retail electronics recycling / drop-off",
    address: "2657 S MacArthur Dr", city: "Alexandria", state: "LA", zipCode: "71301",
    phone: "(318) 427-7689", website: "https://stores.bestbuy.com/la/alexandria/2657-s-macarthur-dr-2507.html",
    materialsAccepted: ["Electronics", "Computers", "Cell phones", "Cables", "Printers", "Televisions", "Batteries"],
    acceptsBatteries: "Yes", acceptedBatteryTypes: ["NiCad batteries", "Rechargeable batteries"],
    acceptsLithiumIon: "Unknown", acceptsElectronics: "Yes", acceptedElectronics: ["Computers", "Cell phones", "Printers", "Televisions"],
    restrictions: "Call before drop-off. Confirm item limits and restrictions before visiting.",
    hours: "Hours vary; call or check the website before visiting.", cost: "Unknown",
    safetyInstructions: "Call before bringing batteries or electronics.", callBeforeDropoff: "Recommended",
    verificationStatus: "Pending", logoFile: "best-buy.png", publicListing: "Yes"
  }
];

function renderLocations(locations) {
  const list = document.getElementById("locations-list");

  const publicLocations = locations.filter(location => {
    return location.publicListing === "Yes";
  });

  activePublicLocations = publicLocations;
  renderMapMarkers(publicLocations);

  if (publicLocations.length === 0) {
    list.innerHTML = `
      <div class="location-card empty-location-card">
        <h3>No matching locations found.</h3>
        <p>Try changing your search or filters.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = publicLocations.map(location => {
    const fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`;
    const encodedAddress = encodeURIComponent(fullAddress);

    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    const appleMapsLink = `https://maps.apple.com/?q=${encodedAddress}`;

    const batteryTypes =
      location.acceptedBatteryTypes.length > 0
        ? `<p><strong>Battery types:</strong> ${location.acceptedBatteryTypes.join(", ")}</p>`
        : "";

    const isVerified = location.verificationStatus.trim().toLowerCase() === "verified";
    const verificationMessage =
      location.safetyInstructions ||
      location.restrictions ||
      "We have not confirmed this information directly with the business. Call before visiting.";

    const logoFile = location.logoFile.trim();
    const logoMarkup = logoFile
      ? `<span class="location-logo-badge" aria-hidden="true">
          <span class="location-logo-center">
            <img src="images/logos/${encodeURIComponent(logoFile)}" alt="">
          </span>
        </span>`
      : "";

    return `
      <div class="location-card" id="${getLocationId(location)}">


        <div class="location-heading">
          ${logoMarkup}
          <h3>${location.locationName}</h3>
        </div>
        <p>${location.locationType}</p>
        <p>${fullAddress}</p>

       ${
         location.materialsAccepted.length > 0
           ? `<p><strong>Materials accepted:</strong> ${location.materialsAccepted.join(", ")}</p>`
           : ""
    }
        ${batteryTypes}

        ${location.hours ? `<p><strong>Hours:</strong> ${location.hours}</p>` : ""}
        ${location.cost ? `<p><strong>Cost:</strong> ${location.cost}</p>` : ""}

        ${!isVerified ? `<p class="warning">${verificationMessage}</p>` : ""}

        <div class="card-footer">
  <div class="card-actions">
    <a href="${googleMapsLink}" target="_blank">Google Maps</a>
    <a href="${appleMapsLink}" target="_blank">Apple Maps</a>
    ${location.phone ? `<a href="tel:${location.phone}">Call</a>` : ""}
    ${location.website ? `<a href="${location.website}" target="_blank">Website</a>` : ""}
  </div>

  <span class="badge ${location.verificationStatus.toLowerCase().replaceAll(" ", "-")}">
    ${location.verificationStatus}
  </span>
</div>
      </div>
    `;
  }).join("");
}

Papa.parse(`${SHEET_URL}&cacheBust=${Date.now()}`, {
  download: true,
  header: true,
  complete: function(results) {
    allLocations = results.data.map(row => {
      return {
        locationName: row.locationName || "",
        locationType: row.locationType || "",
        address: row.address || "",
        city: row.city || "",
        state: row.state || "",
        zipCode: row.zipCode || "",
        phone: row.phone || "",
        website: row.website || "",
        materialsAccepted: row.materialsAccepted ? row.materialsAccepted.split(",").map(item => item.trim()) : [],
        acceptsBatteries: row.acceptsBatteries || "Unknown",
        acceptedBatteryTypes: row.acceptedBatteryTypes ? row.acceptedBatteryTypes.split(",").map(item => item.trim()) : [],
        acceptsLithiumIon: row.acceptsLithiumIon || "Unknown",
        acceptsElectronics: row.acceptsElectronics || "Unknown",
        acceptedElectronics: row.acceptedElectronics ? row.acceptedElectronics.split(",").map(item => item.trim()) : [],
        restrictions: row.restrictions || "",
        hours: row.hours || "",
        cost: row.cost || "",
        safetyInstructions: row.safetyInstructions || "",
        callBeforeDropoff: row.callBeforeDropoff || "",
        verificationStatus: row.verificationStatus || "Pending",
        logoFile: row.logoFile || "",
        notes: row.notes || "",
        publicListing: row.publicListing || "No",
        latitude: parseCoordinate(row.latitude),
        longitude: parseCoordinate(row.longitude)
      };
    });

    renderLocations(allLocations);
  },
  error: function() {
    allLocations = LOCAL_LOCATIONS;
    renderLocations(allLocations);
  }
});

// Browsers commonly block cross-origin spreadsheet requests on file:// pages.
// Show the bundled directory immediately in that case.
if (window.location.protocol === "file:") {
  allLocations = LOCAL_LOCATIONS;
  renderLocations(allLocations);
}

function applyFilters() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();

  const selectedMaterials = Array.from(document.querySelectorAll(".material-filter:checked"))
    .map(input => input.value);
  const verifiedChecked = document.getElementById("filter-verified").checked;
  const callFirstChecked = document.getElementById("filter-call-first").checked;

  const filteredLocations = allLocations.filter(location => {
    const matchesSearch =
      location.locationName.toLowerCase().includes(searchTerm) ||
      location.city.toLowerCase().includes(searchTerm) ||
      location.materialsAccepted.join(" ").toLowerCase().includes(searchTerm) ||
      location.acceptedBatteryTypes.join(" ").toLowerCase().includes(searchTerm) ||
      location.acceptedElectronics.join(" ").toLowerCase().includes(searchTerm) ||
      location.acceptsBatteries.toLowerCase().includes(searchTerm) ||
      location.acceptsLithiumIon.toLowerCase().includes(searchTerm) ||
      location.acceptsElectronics.toLowerCase().includes(searchTerm) ||
      (searchTerm === "battery" && location.acceptsBatteries === "Yes") ||
      (searchTerm === "batteries" && location.acceptsBatteries === "Yes");

    const matchesSelectedMaterials =
      selectedMaterials.length === 0 ||
      selectedMaterials.some(category => matchesMaterialCategory(location, category));
    const matchesVerified = !verifiedChecked || location.verificationStatus === "Verified";

    const matchesCallFirst =
      !callFirstChecked ||
      location.callBeforeDropoff === "Yes" ||
      location.callBeforeDropoff === "Recommended" ||
      location.callBeforeDropoff === "Required";

    return matchesSearch && matchesSelectedMaterials && matchesVerified && matchesCallFirst;
  });

  renderLocations(filteredLocations);
}

document.getElementById("search-input").addEventListener("input", applyFilters);
document.querySelectorAll(".material-filter").forEach(input => {
  input.addEventListener("change", applyFilters);
});
document.getElementById("filter-verified").addEventListener("change", applyFilters);
document.getElementById("filter-call-first").addEventListener("change", applyFilters);
document.getElementById("list-view-button").addEventListener("click", () => setDirectoryView("list"));
document.getElementById("map-view-button").addEventListener("click", () => setDirectoryView("map"));
document.getElementById("locations-map").addEventListener("click", event => {
  const listingLink = event.target.closest(".map-popup-link");

  if (!listingLink) {
    return;
  }

  event.preventDefault();
  const listingId = listingLink.dataset.listingId;
  setDirectoryView("list");
  window.requestAnimationFrame(() => {
    document.getElementById(listingId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const siteNavigationLinks = [...document.querySelectorAll(".site-nav a")];
const sectionNavigationHashes = new Set(["#prepare", "#safety", "#about"]);

function normalizeNavigationPath(pathname) {
  return pathname.replace(/index\.html$/, "");
}

function updateActiveNavigation() {
  const currentHash = sectionNavigationHashes.has(window.location.hash)
    ? window.location.hash
    : "#directory";

  siteNavigationLinks.forEach(link => {
    const linkUrl = new URL(link.href, window.location.href);
    const isActive =
      normalizeNavigationPath(linkUrl.pathname) === normalizeNavigationPath(window.location.pathname) &&
      linkUrl.hash === currentHash;

    link.classList.toggle("nav-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", currentHash === "#directory" ? "page" : "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

siteNavigationLinks.forEach(link => {
  link.addEventListener("click", () => {
    window.requestAnimationFrame(updateActiveNavigation);
  });
});

window.addEventListener("hashchange", updateActiveNavigation);
updateActiveNavigation();

window.addEventListener("scroll", () => {
  const header = document.querySelector("header");

  if (window.scrollY > 40) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});
