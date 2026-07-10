const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQocNSCaHskZYIBqPuWhdCwWa24Rr8ylmmOfFJnAFTgcH7utx4CgJ7xxphu6JrOpywSFk3vgxC9lRAh/pub?gid=0&single=true&output=csv";
let allLocations = [];

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

        ${location.restrictions ? `<p><strong>Restrictions:</strong> ${location.restrictions}</p>` : ""}
        ${location.hours ? `<p><strong>Hours:</strong> ${location.hours}</p>` : ""}
        ${location.cost ? `<p><strong>Cost:</strong> ${location.cost}</p>` : ""}

        ${location.safetyInstructions ? `<p class="warning">${location.safetyInstructions}</p>` : ""}

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
  }
});

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
