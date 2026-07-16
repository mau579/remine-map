const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQocNSCaHskZYIBqPuWhdCwWa24Rr8ylmmOfFJnAFTgcH7utx4CgJ7xxphu6JrOpywSFk3vgxC9lRAh/pub?gid=0&single=true&output=csv";
let allLocations = [];

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
    callBeforeDropoff: "Recommended", verificationStatus: "Pending", publicListing: "Yes"
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
    verificationStatus: "Pending", publicListing: "Yes"
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
    verificationStatus: "Pending", publicListing: "Yes"
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
    verificationStatus: "Pending", publicListing: "Yes"
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
    verificationStatus: "Pending", publicListing: "Yes"
  }
];

function renderLocations(locations) {
  const list = document.getElementById("locations-list");

  const publicLocations = locations.filter(location => {
    return location.publicListing === "Yes";
  });

  if (publicLocations.length === 0) {
    list.innerHTML = `
      <div class="location-card">
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

    return `
      <div class="location-card">


        <h3>${location.locationName}</h3>
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
        notes: row.notes || "",
        publicListing: row.publicListing || "No"
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

  const batteriesChecked = document.getElementById("filter-batteries").checked;
  const lithiumChecked = document.getElementById("filter-lithium").checked;
  const electronicsChecked = document.getElementById("filter-electronics").checked;
  const verifiedChecked = document.getElementById("filter-verified").checked;
  const callFirstChecked = document.getElementById("filter-call-first").checked;

  const filteredLocations = allLocations.filter(location => {
    const matchesSearch =
      location.locationName.toLowerCase().includes(searchTerm) ||
      location.city.toLowerCase().includes(searchTerm) ||
      location.materialsAccepted.join(" ").toLowerCase().includes(searchTerm) ||
      location.acceptedBatteryTypes.join(" ").toLowerCase().includes(searchTerm) ||
      location.acceptsBatteries.toLowerCase().includes(searchTerm) ||
      location.acceptsLithiumIon.toLowerCase().includes(searchTerm) ||
      location.acceptsElectronics.toLowerCase().includes(searchTerm) ||
      (searchTerm === "battery" && location.acceptsBatteries === "Yes") ||
      (searchTerm === "batteries" && location.acceptsBatteries === "Yes");

    const matchesBatteries = !batteriesChecked || location.acceptsBatteries === "Yes";
    const matchesLithium = !lithiumChecked || location.acceptsLithiumIon === "Yes";
    const matchesElectronics = !electronicsChecked || location.acceptsElectronics === "Yes";
    const matchesVerified = !verifiedChecked || location.verificationStatus === "Verified";

    const matchesCallFirst =
      !callFirstChecked ||
      location.callBeforeDropoff === "Yes" ||
      location.callBeforeDropoff === "Recommended" ||
      location.callBeforeDropoff === "Required";

    return matchesSearch && matchesBatteries && matchesLithium && matchesElectronics && matchesVerified && matchesCallFirst;
  });

  renderLocations(filteredLocations);
}

document.getElementById("search-input").addEventListener("input", applyFilters);
document.getElementById("filter-batteries").addEventListener("change", applyFilters);
document.getElementById("filter-lithium").addEventListener("change", applyFilters);
document.getElementById("filter-electronics").addEventListener("change", applyFilters);
document.getElementById("filter-verified").addEventListener("change", applyFilters);
document.getElementById("filter-call-first").addEventListener("change", applyFilters);

window.addEventListener("scroll", () => {
  const header = document.querySelector("header");

  if (window.scrollY > 40) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});
