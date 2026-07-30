// The cart key includes the logged-in user's id, so two accounts using the
// same browser never share a cart. Guests fall back to a shared guest key.
function getCartKey() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.user_id ? `hawkerhub_cart_${user.user_id}` : "hawkerhub_cart_guest";
}

// Storage keys
const ECO_KEY = "hawkerhub_eco_packaging";
const COUPON_KEY = "hawkerhub_coupon";
const CARD_DETAILS_KEY = "hawkerhub_card_details";
const ECO_FEE = 0.20;

const LAST_ORDER_NO_KEY = "hawkerhub_last_order_no";

// ============================================================================
// delivery fee calculation
// ----------------------------------------------------------------------------
// Rule: flat $3.00 for carts up to $10, then $0.30 for every additional FULL
// dollar above $10. "Full dollar" means cents are ignored (Math.floor).
// Example: $25 subtotal -> 3 + 0.30 * floor(25 - 10) = 3 + 4.50 = $7.50.
// ============================================================================
function calcDeliveryFee(subtotal, isDelivery) {
  if (!isDelivery) return 0;                       // Pickup has no delivery fee
  if (subtotal <= 10) return 3.00;                 // flat base fee up to $10
  const extraDollars = Math.floor(subtotal - 10);  // whole dollars above $10
  return 3.00 + (extraDollars * 0.30);             // base + 30c per extra dollar
}

// BED-231: small helper - is the patron currently on Delivery?
function isDeliverySelected() {
  return collectionMethod?.value === "Delivery";
}

// Helpers
function readCart() {
  try {
    return JSON.parse(localStorage.getItem(getCartKey())) || [];
  } catch {
    return [];
  }
}

function readEco() {
  return localStorage.getItem(ECO_KEY) === "true";
}

function formatMoney(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function readCardDetails() {
  try {
    return JSON.parse(localStorage.getItem(CARD_DETAILS_KEY));
  } catch {
    return null;
  }
}

function saveCardDetails(details) {
  localStorage.setItem(CARD_DETAILS_KEY, JSON.stringify(details));
}

// Validation Helpers
function normalizePhone(raw) {
  const digits = digitsOnly(raw);
  if (digits.startsWith("65") && digits.length === 10) return digits.slice(2);
  return digits;
}

function isValidSGPhone(raw) {
  const p = normalizePhone(raw);
  return /^[689]\d{7}$/.test(p);
}

function isValidSGPostal(raw) {
  return /^\d{6}$/.test(digitsOnly(raw));
}

function isValidCardNumber(num) {
  const d = digitsOnly(num);
  return d.length === 16;
}

function isValidExpiry(mmYY) {
  const v = String(mmYY || "").trim();
  const m = v.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  const curYY = now.getFullYear() % 100;
  const curMM = now.getMonth() + 1;
  if (yy < curYY) return false;
  if (yy === curYY && mm < curMM) return false;
  return true;
}

function isValidCvv(cvv) {
  const d = digitsOnly(cvv);
  return d.length === 3;
}

// Form elements
const collectionMethod = document.getElementById("collectionMethod");
const deliveryAddressField = document.getElementById("deliveryAddressField");
const postalCodeField = document.getElementById("postalCodeField");
const deliveryAddress = document.getElementById("deliveryAddress");
const postalCode = document.getElementById("postalCode");
const fullNameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phoneNumber");
// BED-223: saved address elements
const savedAddressSection = document.getElementById("savedAddressSection");
const savedAddressList = document.getElementById("savedAddressList");
const saveAddressTick = document.getElementById("saveAddressTick");

// Remembers which saved address the patron clicked, so we know whether a
// later edit should UPDATE that one or CREATE a new one.
let selectedAddressId = null;

// BED-223: address modal elements
const addrDeleteOverlay = document.getElementById("addrDeleteOverlay");
const addrDeleteText = document.getElementById("addrDeleteText");
const addrUpdateOverlay = document.getElementById("addrUpdateOverlay");
const addrUpdateAddress = document.getElementById("addrUpdateAddress");
const addrUpdatePostal = document.getElementById("addrUpdatePostal");
const addrUpdateError = document.getElementById("addrUpdateError");

// Which address the currently open modal is working on.
let addrPendingId = null;

// Live phone validation
const phoneMsg = document.getElementById("phoneMsg");

function validatePhoneLive() {
  const raw = String(phoneInput.value || "");
  const digits = raw.replace(/\D/g, "");

  phoneInput.classList.remove("input-valid", "input-invalid");
  if (phoneMsg) {
    phoneMsg.textContent = "";
    phoneMsg.className = "field-msg";
  }

  // don't show an error until they start typing
  if (raw.trim() === "") return;

  let error = "";
  if (/[a-zA-Z]/.test(raw)) {
    error = "Numbers only, no letters.";
  } else if (!/^[689]/.test(digits)) {
    error = "Must start with 6, 8 or 9.";
  } else if (digits.length !== 8) {
    error = "Phone number must be 8 digits.";
  }

  if (error) {
    phoneInput.classList.add("input-invalid");
    if (phoneMsg) {
      phoneMsg.textContent = error;
      phoneMsg.className = "field-msg err";
    }
  } else {
    phoneInput.classList.add("input-valid");
    if (phoneMsg) {
      phoneMsg.textContent = "Looks good!";
      phoneMsg.className = "field-msg ok";
    }
  }
}

phoneInput?.addEventListener("input", validatePhoneLive);

// Live full name validation
const fullNameMsg = document.getElementById("fullNameMsg");

function validateNameLive() {
  const raw = String(fullNameInput.value || "");

  fullNameInput.classList.remove("input-valid", "input-invalid");
  if (fullNameMsg) {
    fullNameMsg.textContent = "";
    fullNameMsg.className = "field-msg";
  }

  if (raw === "") return;

  let error = "";
  if (raw.trim() === "") {
    error = "Full name must be filled.";
  } else if (/\d/.test(raw)) {
    error = "Name must not contain numbers.";
  }

  if (error) {
    fullNameInput.classList.add("input-invalid");
    if (fullNameMsg) {
      fullNameMsg.textContent = error;
      fullNameMsg.className = "field-msg err";
    }
  } else {
    fullNameInput.classList.add("input-valid");
    if (fullNameMsg) {
      fullNameMsg.textContent = "Looks good!";
      fullNameMsg.className = "field-msg ok";
    }
  }
}

fullNameInput?.addEventListener("input", validateNameLive);

// Live delivery details validation
const addressMsg = document.getElementById("addressMsg");
const postalMsg = document.getElementById("postalMsg");

function clearFieldState(input, msgEl) {
  input.classList.remove("input-valid", "input-invalid");
  if (msgEl) {
    msgEl.textContent = "";
    msgEl.className = "field-msg";
  }
}

function validateAddressLive() {
  const raw = String(deliveryAddress.value || "");
  clearFieldState(deliveryAddress, addressMsg);

  if (raw === "") return;

  let error = "";
  if (raw.trim() === "") {
    error = "Delivery address must be filled.";
  }

  if (error) {
    deliveryAddress.classList.add("input-invalid");
    if (addressMsg) {
      addressMsg.textContent = error;
      addressMsg.className = "field-msg err";
    }
  } else {
    deliveryAddress.classList.add("input-valid");
    if (addressMsg) {
      addressMsg.textContent = "Looks good!";
      addressMsg.className = "field-msg ok";
    }
  }
}

function validatePostalLive() {
  const raw = String(postalCode.value || "");
  clearFieldState(postalCode, postalMsg);

  if (raw.trim() === "") return;

  let error = "";
  if (/[a-zA-Z]/.test(raw)) {
    error = "Numbers only, no letters.";
  } else if (raw.replace(/\D/g, "").length !== 6) {
    error = "Postal code must be 6 digits.";
  }

  if (error) {
    postalCode.classList.add("input-invalid");
    if (postalMsg) {
      postalMsg.textContent = error;
      postalMsg.className = "field-msg err";
    }
  } else {
    postalCode.classList.add("input-valid");
    if (postalMsg) {
      postalMsg.textContent = "Looks good!";
      postalMsg.className = "field-msg ok";
    }
  }
}

deliveryAddress?.addEventListener("input", validateAddressLive);
postalCode?.addEventListener("input", validatePostalLive);

// BED-223: escape text before putting it in HTML, so an address containing
// characters like < or & can't break the page or inject markup.
function escapeAddr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// BED-223: fetch this patron's saved addresses and draw them as bars.
async function loadSavedAddresses() {
  if (!savedAddressList) return;

  try {
    const token = localStorage.getItem("token");
    if (!token) return;                     // not logged in -> nothing to load

    const res = await fetch("/api/addresses", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const data = await res.json();
    const addresses = data.addresses || [];

    // No saved addresses yet -> show nothing (the tick is still available).
    if (addresses.length === 0) {
      savedAddressList.innerHTML = "";
      return;
    }

    // One bar per saved address, each with update and delete buttons.
    savedAddressList.innerHTML = addresses.map((a) => `
      <div class="saved-address-bar" data-id="${a.address_id}">
        <div class="saved-address-text">
          ${escapeAddr(a.address)}<br>
          <small>${escapeAddr(a.postal_code)}${a.contact_name ? " &middot; " + escapeAddr(a.contact_name) : ""}</small>
        </div>
        <div class="saved-address-actions">
          <button type="button" class="addr-update-btn" data-id="${a.address_id}">Update</button>
          <button type="button" class="addr-delete-btn" data-id="${a.address_id}">Delete</button>
        </div>
      </div>
    `).join("");

    // Clicking the bar itself fills the delivery fields with that address.
    savedAddressList.querySelectorAll(".saved-address-bar").forEach((bar) => {
      bar.addEventListener("click", (e) => {
        // Ignore clicks that landed on the Update/Delete buttons.
        if (e.target.closest(".saved-address-actions")) return;

        const id = Number(bar.getAttribute("data-id"));
        const picked = addresses.find((a) => a.address_id === id);
        if (!picked) return;

        fillDeliveryFields(picked);
      });
    });
    
    // BED-223: Delete button -> open the confirm box (nothing is deleted yet).
    savedAddressList.querySelectorAll(".addr-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const picked = addresses.find((a) => a.address_id === id);
        if (!picked) return;

        addrPendingId = id;
        if (addrDeleteText) addrDeleteText.textContent = `${picked.address}, ${picked.postal_code}`;
        if (addrDeleteOverlay) addrDeleteOverlay.style.display = "flex";
      });
    });

    // BED-223: Update button -> open the edit box pre-filled with current values.
    savedAddressList.querySelectorAll(".addr-update-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-id"));
        const picked = addresses.find((a) => a.address_id === id);
        if (!picked) return;

        addrPendingId = id;
        if (addrUpdateAddress) addrUpdateAddress.value = picked.address || "";
        if (addrUpdatePostal) addrUpdatePostal.value = picked.postal_code || "";
        if (addrUpdateError) addrUpdateError.style.display = "none";
        if (addrUpdateOverlay) addrUpdateOverlay.style.display = "flex";
      });
    });

  } catch (err) {
    console.error("Could not load saved addresses:", err);
  }
}

// BED-223: copy a saved address into the checkout fields, then re-run the
// live validation so each field shows its green state.
function fillDeliveryFields(a) {
  if (deliveryAddress) deliveryAddress.value = a.address || "";
  if (postalCode) postalCode.value = a.postal_code || "";
  if (a.contact_name && fullNameInput) fullNameInput.value = a.contact_name;
  if (a.contact_phone && phoneInput) phoneInput.value = a.contact_phone;

  // Remember which one was picked (used later for update vs create).
  selectedAddressId = a.address_id;

  // Re-run validation so the filled fields turn green.
  validateAddressLive?.();
  validatePostalLive?.();
  validateNameLive?.();
  validatePhoneLive?.();
}

// BED-223: close both modals and forget which address was pending.
function closeAddrModals() {
  if (addrDeleteOverlay) addrDeleteOverlay.style.display = "none";
  if (addrUpdateOverlay) addrUpdateOverlay.style.display = "none";
  addrPendingId = null;
}

// Cancel buttons: close without changing anything.
document.getElementById("addrDeleteCancelBtn")?.addEventListener("click", closeAddrModals);
document.getElementById("addrUpdateCancelBtn")?.addEventListener("click", closeAddrModals);

// BED-223: DELETE - only runs when the patron confirms.
document.getElementById("addrDeleteConfirmBtn")?.addEventListener("click", async () => {
  if (!addrPendingId) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/addresses/${addrPendingId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);

    closeAddrModals();
    await loadSavedAddresses();   // redraw the bars without the deleted one
  } catch (e) {
    console.error("Could not delete address:", e);
    alert("Could not delete that address. Please try again.");
  }
});

// BED-223: UPDATE - validate, then save the edited address.
document.getElementById("addrUpdateSaveBtn")?.addEventListener("click", async () => {
  if (!addrPendingId) return;

  const newAddress = String(addrUpdateAddress?.value || "").trim();
  const newPostal = String(addrUpdatePostal?.value || "").trim();

  // Same rules as the checkout fields, checked before we call the API.
  if (!newAddress) return showAddrUpdateError("Delivery address must be filled.");
  if (!/^\d{6}$/.test(newPostal)) return showAddrUpdateError("Postal code must be 6 digits.");

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/addresses/${addrPendingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ address: newAddress, postal_code: newPostal })
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`);

    closeAddrModals();
    await loadSavedAddresses();   // redraw the bars with the new details
  } catch (e) {
    console.error("Could not update address:", e);
    showAddrUpdateError("Could not save changes. Please try again.");
  }
});

// BED-223: show a validation/error message inside the update box.
function showAddrUpdateError(msg) {
  if (!addrUpdateError) return;
  addrUpdateError.textContent = msg;
  addrUpdateError.style.display = "block";
}

function applyDeliveryUI(recalc = false) {
  const isDelivery = collectionMethod?.value === "Delivery";
  if (deliveryAddressField) deliveryAddressField.style.display = isDelivery ? "block" : "none";
  if (postalCodeField) postalCodeField.style.display = isDelivery ? "block" : "none";
  // BED-223: the saved address block belongs to delivery only.
  if (savedAddressSection) savedAddressSection.style.display = isDelivery ? "block" : "none";

  if (!isDelivery) {
    if (deliveryAddress) clearFieldState(deliveryAddress, addressMsg);
    if (postalCode) clearFieldState(postalCode, postalMsg);
  }
   // BED-231: recalc only when triggered by a real change event. On the initial
  // setup call it's skipped, because the promo state it reads isn't declared yet.
  if (recalc) updateCheckoutSummary();
}

collectionMethod?.addEventListener("change", () => applyDeliveryUI(true));
applyDeliveryUI(false);

// Form Validation
function validateCheckoutForm() {
  const name = String(fullNameInput?.value || "").trim();
  const phoneRaw = String(phoneInput?.value || "").trim();
  const method = String(collectionMethod?.value || "Pickup").trim();

  const errors = [];

  if (!name) errors.push("Please enter your full name.");
  else if (/\d/.test(name)) errors.push("Your name must not contain numbers.");
  if (!phoneRaw) errors.push("Please enter your phone number.");
  else if (!isValidSGPhone(phoneRaw)) errors.push("Please enter a valid Singapore phone number (e.g. 91234567).");

  if (method === "Delivery") {
    const addr = String(deliveryAddress?.value || "").trim();
    const postal = String(postalCode?.value || "").trim();

    if (!addr) errors.push("Please enter your delivery address.");
    if (!postal) errors.push("Please enter your postal code.");
    else if (!isValidSGPostal(postal)) errors.push("Please enter a valid 6-digit postal code.");
  }

  if (errors.length) {
    alert(errors.join("\n"));
    return { ok: false };
  }

  return { ok: true, fullName: name, phone: normalizePhone(phoneRaw), method };
}

const paymentOptions = document.querySelectorAll(".pay-option");
let lastPayValue = document.querySelector('input[name="pay"]:checked')?.value || "card";

function updateRedBorder() {
  paymentOptions.forEach((option) => {
    const radio = option.querySelector("input[type='radio']");
    if (radio && radio.checked) option.classList.add("is-selected");
    else option.classList.remove("is-selected");
  });
}

const paymentRadios = document.querySelectorAll('input[name="pay"]');
paymentRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (!radio.checked) return;
    updateRedBorder();

    if (e && e.isTrusted) {
      if (radio.value === "card") openCardModal();
      else if (radio.value === "paynow") openPayNowModal();
      else lastPayValue = radio.value;
    }
  });
});

paymentOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const radio = option.querySelector("input[type='radio']");
    if (radio) {
      radio.checked = true;
      updateRedBorder();

      if (radio.value === "card") openCardModal();
      else if (radio.value === "paynow") openPayNowModal();
      else lastPayValue = radio.value;
    }
  });
});

updateRedBorder();

// Modals
const cardOverlay = document.getElementById("cardModalOverlay");
const paynowOverlay = document.getElementById("paynowModalOverlay");
const cardMsg = document.getElementById("cardModalError");
const cardName = document.getElementById("cardName");
const cardNumber = document.getElementById("cardNumber");
const cardExpiry = document.getElementById("cardExpiry");
const cardCvv = document.getElementById("cardCvv");
// Live card validation
const cardNameMsg = document.getElementById("cardNameMsg");
const cardNumberMsg = document.getElementById("cardNumberMsg");
const cardExpiryMsg = document.getElementById("cardExpiryMsg");
const cardCvvMsg = document.getElementById("cardCvvMsg");

// keeps what was typed so it comes back when switching payment away and back
const cardDraft = { name: "", number: "", expiry: "", cvv: "" };

function setFieldState(input, msgEl, error) {
  input.classList.remove("input-valid", "input-invalid");
  if (msgEl) {
    msgEl.textContent = "";
    msgEl.className = "field-msg";
  }

  if (String(input.value || "").trim() === "") return;

  if (error) {
    input.classList.add("input-invalid");
    if (msgEl) {
      msgEl.textContent = error;
      msgEl.className = "field-msg err";
    }
  } else {
    input.classList.add("input-valid");
    if (msgEl) {
      msgEl.textContent = "Looks good!";
      msgEl.className = "field-msg ok";
    }
  }
}

function formatCardNumber(value) {
  const d = value.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
  return d;
}

function checkCardName() {
  const raw = String(cardName.value || "");
  let error = "";
  if (raw.trim() && !/^[A-Za-z\s'-]+$/.test(raw)) {
    error = "Name must contain letters only.";
  }
  setFieldState(cardName, cardNameMsg, error);
  cardDraft.name = cardName.value;
}

function checkCardNumber() {
  cardNumber.value = formatCardNumber(cardNumber.value);
  const d = cardNumber.value.replace(/\D/g, "");
  let error = "";
  if (d.length !== 16) {
    error = "Card number must be 16 digits.";
  }
  setFieldState(cardNumber, cardNumberMsg, error);
  cardDraft.number = cardNumber.value;
}

function checkCardExpiry() {
  cardExpiry.value = formatExpiry(cardExpiry.value);
  const v = cardExpiry.value;
  let error = "";
  if (v.length > 0 && v.length < 5) {
    error = "Expiry date must be in MM/YY format.";
  } else if (v.length === 5) {
    const mm = Number(v.slice(0, 2));
    if (mm < 1 || mm > 12) error = "Month must be between 01 and 12.";
  }
  setFieldState(cardExpiry, cardExpiryMsg, error);
  cardDraft.expiry = cardExpiry.value;
}

function checkCardCvv() {
  cardCvv.value = cardCvv.value.replace(/\D/g, "").slice(0, 3);
  let error = "";
  if (cardCvv.value.length !== 3) {
    error = "Security code must be 3 digits.";
  }
  setFieldState(cardCvv, cardCvvMsg, error);
  cardDraft.cvv = cardCvv.value;
}

cardName?.addEventListener("input", checkCardName);
cardNumber?.addEventListener("input", checkCardNumber);
cardExpiry?.addEventListener("input", checkCardExpiry);
cardCvv?.addEventListener("input", checkCardCvv);

function showCardError(msg) {
  if (!cardMsg) return;
  cardMsg.style.display = "block";
  cardMsg.textContent = msg;
  cardMsg.style.color = "#ff6b6b";
}

function openCardModal() {
  if (cardOverlay) {
    if (cardMsg) cardMsg.style.display = "none";
    cardOverlay.style.display = "flex";
    const saved = readCardDetails();
    if (cardName) cardName.value = cardDraft.name || saved?.name || "";
    if (cardNumber) cardNumber.value = cardDraft.number || "";
    if (cardExpiry) cardExpiry.value = cardDraft.expiry || saved?.expiry || "";
    if (cardCvv) cardCvv.value = cardDraft.cvv || "";
  }
}

function openPayNowModal() {
  if (paynowOverlay) {
    paynowOverlay.style.display = "flex";
    document.getElementById("paynowQrWrap").style.display = "flex";
    document.getElementById("paynowSuccessMsg").style.display = "none";
  }
}

function closeModals() {
  if (cardOverlay) cardOverlay.style.display = "none";
  if (paynowOverlay) paynowOverlay.style.display = "none";
}

function handleRevert() {
  const current = document.querySelector('input[name="pay"]:checked')?.value;
  const saved = readCardDetails();
  if ((current === "card" && !saved) || current === "paynow") {
    const prevRadio = document.querySelector(`input[name="pay"][value="${lastPayValue}"]`);
    if (prevRadio) {
      prevRadio.checked = true;
      updateRedBorder();
    }
  }
}

document.getElementById("cardCancelBtn")?.addEventListener("click", () => {
  closeModals();
  handleRevert();
});

if (cardOverlay)
  cardOverlay.addEventListener("click", (e) => {
    if (e.target === cardOverlay) {
      closeModals();
      handleRevert();
    }
  });

if (paynowOverlay)
  paynowOverlay.addEventListener("click", (e) => {
    if (e.target === paynowOverlay) {
      closeModals();
      handleRevert();
    }
  });

document.getElementById("cardAddBtn")?.addEventListener("click", () => {
  const name = String(cardName?.value || "").trim();
  const number = String(cardNumber?.value || "").trim();
  const expiry = String(cardExpiry?.value || "").trim();
  const cvv = String(cardCvv?.value || "").trim();

  if (!name) return showCardError("Please enter name on card.");
  if (!isValidCardNumber(number)) return showCardError("Invalid card number.");
  if (!isValidExpiry(expiry)) return showCardError("Invalid expiry date (MM/YY) or expired.");
  if (!isValidCvv(cvv)) return showCardError("Invalid CVV.");

  saveCardDetails({
    name,
    numberMasked: `**** **** **** ${digitsOnly(number).slice(-4)}`,
    expiry,
    savedAt: new Date().toISOString()
  });

  lastPayValue = "card";
  closeModals();
});

document.getElementById("paynowCloseBtn")?.addEventListener("click", () => {
  document.getElementById("paynowQrWrap").style.display = "none";
  document.getElementById("paynowSuccessMsg").style.display = "block";
  lastPayValue = "paynow";
  setTimeout(closeModals, 1000);
});

// ---------------------------------------------------------------------
// Promo code (SQL-backed) — per BED-22/BED-47, the backend is the only
// place that validates a code and calculates a discount, so the frontend
// never invents a number. BED-92: clicking "Apply" now calls a preview
// endpoint (POST /api/orders/preview-promo) that runs those same checks
// against the real cart and returns the exact discount, WITHOUT creating
// an order or recording a redemption — so the discount shows immediately
// on the checkout page instead of only after the order is submitted. The
// final, authoritative validation still happens again at submit time.
// ---------------------------------------------------------------------
const promoInput = document.getElementById("promoCodeInput");
const promoMsg = document.getElementById("promoMsg");
const applyPromoBtn = document.getElementById("applyPromoBtn");

// Holds the result of the last successful preview, so the summary can keep
// showing it without re-fetching on every render. Cleared whenever the code
// text changes, so a stale discount can never be shown for a different code.
let appliedPromo = null; // { code, stallId, subtotal, discountAmount, discountedTotal }

function readPromoCode() {
  return (localStorage.getItem(COUPON_KEY) || "").trim().toUpperCase();
}

function setPromoMessage(text, isError) {
  if (!promoMsg) return;
  promoMsg.textContent = text;
  promoMsg.style.color = isError ? "crimson" : "green";
}

// Restore any previously entered code into the input on page load. The
// discount itself isn't restored (it wasn't persisted), so it'll show again
// as soon as updateCheckoutSummary() runs the preview below.
if (promoInput) {
  promoInput.value = readPromoCode();
}

// Typing a new code invalidates whatever discount is currently shown —
// they have to click Apply again to preview the new code.
promoInput?.addEventListener("input", () => {
  if (appliedPromo && appliedPromo.code !== promoInput.value.trim().toUpperCase()) {
    appliedPromo = null;
    updateCheckoutSummary();
  }
});

applyPromoBtn?.addEventListener("click", async () => {
  const code = String(promoInput?.value || "").trim().toUpperCase();

  if (!code) {
    localStorage.removeItem(COUPON_KEY);
    appliedPromo = null;
    setPromoMessage("", false);
    updateCheckoutSummary();
    return;
  }

  localStorage.setItem(COUPON_KEY, code);
  await applyPromoCode(code);
});

// Calls the preview endpoint for whichever stall(s) are in the cart, and
// stops at the first stall the code is actually valid for (a promo code
// only ever belongs to one stall — see checkout submit logic below).
async function applyPromoCode(code) {
  const cart = readCart();
  if (!cart.length) {
    setPromoMessage("Your cart is empty.", true);
    return;
  }

  const itemsByStall = {};
  for (const item of cart) {
    const sid = Number(item.stallId);
    if (!itemsByStall[sid]) itemsByStall[sid] = [];
    itemsByStall[sid].push(item);
  }

  applyPromoBtn.disabled = true;
  applyPromoBtn.textContent = "Applying...";
  setPromoMessage("Checking code...", false);

  const token = localStorage.getItem("token");
  let lastError = null;
  let matched = null;

  try {
    for (const stallId in itemsByStall) {
      const response = await fetch("/api/orders/preview-promo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          stall_id: Number(stallId),
          items: itemsByStall[stallId].map(i => ({ menu_item_id: Number(i.id), quantity: i.qty })),
          promo_code: code
        })
      });

      const body = await response.json().catch(() => ({}));

      if (response.ok && body.valid) {
        matched = {
          code,
          stallId: Number(stallId),
          subtotal: body.subtotal,
          discountAmount: body.discount_amount,
          discountedTotal: body.discounted_total
        };
        break;
      }

      // NOT_FOUND just means this code isn't for this particular stall —
      // keep trying the cart's other stalls before giving up.
      lastError = body.message || "That promo code couldn't be applied.";
    }
  } catch (e) {
    console.error(e);
    lastError = "Couldn't reach the server. Please try again.";
  }

  applyPromoBtn.disabled = false;
  applyPromoBtn.textContent = "Apply";

  if (matched) {
    appliedPromo = matched;
    setPromoMessage(`"${code}" applied: -${formatMoney(matched.discountAmount)}`, false);
  } else {
    appliedPromo = null;
    setPromoMessage(lastError || "This promo code isn't valid for any stall in your cart.", true);
  }

  updateCheckoutSummary();
}

function updateCheckoutSummary() {
  const cart = readCart();
  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
  const ecoFee = readEco() ? ECO_FEE : 0;

  const currentCode = readPromoCode();
  // Only trust the cached discount if it still matches the code currently
  // in the box and the cart total it was calculated against — if either
  // changed, the number is stale and shouldn't be shown as applied.
  const discountValid = appliedPromo && appliedPromo.code === currentCode && appliedPromo.subtotal === subtotal;
  const discountAmount = discountValid ? appliedPromo.discountAmount : 0;

  // Work out the delivery fee (0 unless Delivery is selected) and
  // add it into the total, alongside the eco fee and any promo discount.
  const deliveryFee = calcDeliveryFee(subtotal, isDeliverySelected());
  const total = Math.max(0, subtotal + ecoFee + deliveryFee - discountAmount);

  document.getElementById("checkoutSubtotal").textContent = formatMoney(subtotal);
  document.getElementById("checkoutTotal").textContent = formatMoney(total);

  const ecoRow = document.getElementById("checkoutEcoRow");
  if (ecoRow) {
    ecoRow.style.display = ecoFee > 0 ? "flex" : "none";
    document.getElementById("checkoutEcoFee").textContent = `+${formatMoney(ecoFee)}`;
  }

  // Show the delivery fee row when there's a fee, hide it otherwise.
  // This row sits below eco packaging and above the promo box in the HTML.
  const deliveryRow = document.getElementById("checkoutDeliveryRow");
  if (deliveryRow) {
    deliveryRow.style.display = deliveryFee > 0 ? "flex" : "none";
    document.getElementById("checkoutDeliveryFee").textContent = `+${formatMoney(deliveryFee)}`;
  }

  // Show the fee explanation note only when there's a delivery fee.
  const deliveryFeeNote = document.getElementById("deliveryFeeNote");
  if (deliveryFeeNote) {
    deliveryFeeNote.style.display = deliveryFee > 0 ? "block" : "none";
  }

  const discRow = document.getElementById("discountRow");
  if (discRow) {
    discRow.style.display = discountValid ? "flex" : "none";
    if (discountValid) {
      document.getElementById("discountAmount").textContent = `-${formatMoney(discountAmount)}`;
    }
  }

  // BED-231: include deliveryFee so the submit handler can read it back.
  return { cart, subtotal, ecoFee, deliveryFee, discountAmount, promoCode: currentCode, total };
}

updateCheckoutSummary();
// BED-223: load the patron's saved addresses on page load.
loadSavedAddresses();

// Submit checkout — saves the order to the SQL backend
const submitBtn = document.querySelector(".cta");

submitBtn?.addEventListener("click", async () => {
  // Recalculate totals and grab the current cart.
  const info = updateCheckoutSummary();

  // Guard: don't proceed if the cart is empty.
  if (!info.cart.length) return alert("Cart is empty");

  // Guard: validate the contact/collection form (name, phone, delivery fields).
  const form = validateCheckoutForm();
  if (!form.ok) return;

  // Guard: if paying by card, make sure card details were saved first.
  const pay = document.querySelector('input[name="pay"]:checked')?.value || "card";
  if (pay === "card") {
    const saved = readCardDetails();
    if (!saved) {
      alert("Please add your card details.");
      openCardModal();
      return;
    }
  }

  // Show a processing state and disable the button so it can't be double-clicked.
  submitBtn.textContent = "Processing...";
  submitBtn.disabled = true;

  try {
    // Read the logged-in patron's token (SignInPatron.js saved it under "token").
    const token = localStorage.getItem("token");

    // Group cart items by their stall, e.g. { 2: [laksa items], 1: [beancurd items] }.
    // This is what lets one checkout split into one order per stall.
    const itemsByStall = {};
    for (const item of info.cart) {
      const sid = Number(item.stallId);          // stall id as a number
      if (!itemsByStall[sid]) itemsByStall[sid] = [];
      itemsByStall[sid].push(item);
    }

    // A promo code belongs to exactly one stall (Promotions.stall_id), so it
    // can only ever be redeemable against that one stall's order. If the cart
    // spans multiple stalls, we still try the code on each order; a stall the
    // code doesn't belong to just resends without it rather than failing the
    // whole checkout.
    let promoCode = info.promoCode || null;
    let promoApplied = false;
    let promoMessageToShow = null;

    // ========================================================================
    // One checkout id for the WHOLE checkout.
    // Generated once here, then stamped onto every stall order below, so all
    // the orders from this checkout can be grouped into one receipt later.
    // Format: HH- + current timestamp + a small random number for uniqueness.
    // ========================================================================
    const checkoutId = `HH-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

    // Read the checkout details once - they're the same for every
    // stall order in this checkout (except the fee, handled below).
    const collectionMethodVal = isDeliverySelected() ? "Delivery" : "Pickup";
    const paymentMethodVal = document.querySelector('input[name="pay"]:checked')?.value || "cash";
    const deliveryAddressVal = isDeliverySelected() ? (deliveryAddress?.value.trim() || null) : null;
    const postalCodeVal = isDeliverySelected() ? (postalCode?.value.trim() || null) : null;

    // The delivery fee is for the WHOLE cart, so we only attach it to
    // the FIRST order. Otherwise a 2-stall checkout would be charged twice.
    const fullDeliveryFee = calcDeliveryFee(info.subtotal, isDeliverySelected());
    let deliveryFeeAssigned = false;   // becomes true once one order takes the fee

    // BED-130: eco is charged once for the whole checkout, so only the first
    // order carries it (same idea as the delivery fee).
    const ecoChosen = readEco();  // true if the eco toggle is on
    let ecoAssigned = false;

    // Create ONE order per stall by POSTing each group to the order API.
    // Each POST is single-stall, so it passes the backend's stall validation.
    const createdOrders = [];
    for (const stallId in itemsByStall) {
      // BED-231: build the POST body for one stall's order.
      const buildPayload = (withPromo) => {
        // Put the full delivery fee on the first order only; the rest get 0
        // (for delivery) or null (for pickup, since there's no delivery at all).
        const thisDeliveryCharge = (!deliveryFeeAssigned && fullDeliveryFee > 0)
          ? fullDeliveryFee
          : (isDeliverySelected() ? 0 : null);

        return {
          // ----- existing fields -----
          stall_id: Number(stallId),
          items: itemsByStall[stallId].map(i => ({
            menu_item_id: Number(i.id),
            quantity: i.qty
          })),
          ...(withPromo && promoCode ? { promo_code: promoCode } : {}),

          // ----- BED-231: checkout details (same across stalls, except fee) -----
          checkout_id: checkoutId,
          collection_method: collectionMethodVal,
          payment_method: paymentMethodVal,
          delivery_address: deliveryAddressVal,
          postal_code: postalCodeVal,
          delivery_charge: thisDeliveryCharge,
          // BED-130: send the eco choice. Only on the first order (like the
          // delivery fee) so a multi-stall checkout isn't charged eco twice.
          eco_friendly_packaging: (!deliveryFeeAssigned && readEco()) ? true : false
        };
      };

      // Send one stall's order to the API.
      // withPromo decides whether to include the promo code in the body.
      // Returns the raw fetch response so the caller can check response.ok.
      const postOrder = (withPromo) => {
        return fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(buildPayload(withPromo))
        });
      };

      // First attempt: include the promo code if the patron entered one and
      // it hasn't already been successfully applied to an earlier stall order.
      const attemptWithPromo = Boolean(promoCode) && !promoApplied;
      let response = await postOrder(attemptWithPromo);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));

        // NOT_FOUND just means this code isn't for this stall — retry that
        // one order without it instead of failing the whole checkout.
        if (attemptWithPromo && errBody.reason === "NOT_FOUND") {
          response = await postOrder(false);
        } else if (attemptWithPromo) {
          // Any other reason (inactive, expired, min spend, already used,
          // limit reached) is a genuine problem with the code itself.
          throw new Error(errBody.message || "That promo code couldn't be applied.");
        }
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `Order failed for stall ${stallId} (${response.status})`);
      }

      const created = await response.json();
      createdOrders.push(created);


      // Once one order has taken the delivery fee, mark it assigned so
      // the remaining stall orders in this checkout are charged 0.
      if (!deliveryFeeAssigned && fullDeliveryFee > 0) deliveryFeeAssigned = true;

      if (!ecoAssigned && ecoChosen) ecoAssigned = true;

      if (attemptWithPromo && created.promotion) {
        promoApplied = true;
        promoMessageToShow = `Promo applied: -${formatMoney(created.promotion.discount_amount)}`;
      }
    }

    if (promoCode && !promoApplied) {
      // Code was entered but didn't match any stall in this cart.
      setPromoMessage("This promo code isn't valid for any stall in your cart.", true);
    } else if (promoMessageToShow) {
      setPromoMessage(promoMessageToShow, false);
    }

    // BED-223: if the patron ticked "save this address", store it for reuse.
    if (isDeliverySelected() && saveAddressTick?.checked) {
      try {
        await fetch("/api/addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            address: deliveryAddressVal,
            postal_code: postalCodeVal,
            contact_name: form.fullName,
            contact_phone: form.phone
          })
        });
      } catch (e) {
        // Saving the address is a convenience, not part of the order, so a
        // failure here must never block a successful checkout.
        console.error("Could not save address:", e);
      }
    }

    // Save the most recent order id so the success page can display it.
    const lastOrder = createdOrders[createdOrders.length - 1];
    localStorage.setItem(LAST_ORDER_NO_KEY, String(lastOrder.order.order_id));

    // BED-93: save the checkout id too, so the success page can fetch every
    // order in this checkout and show them as one combined receipt.
    localStorage.setItem("last_checkout_id", checkoutId);

    // All stall orders saved -> clear the local cart, eco toggle and card details.
    localStorage.removeItem(getCartKey());
    localStorage.removeItem(ECO_KEY);
    localStorage.removeItem(COUPON_KEY);
    localStorage.removeItem(CARD_DETAILS_KEY);

    // Send the customer to the success / awaiting-payment page.
    window.location.href = "PaymentSuccesss.html";

  } catch (e) {
    // Any failure (network, auth, invalid item, invalid promo): show it and
    // re-enable the button so the patron can fix the code/details and retry.
    console.error(e);
    alert("Error processing order: " + e.message);
    submitBtn.textContent = "Submit";
    submitBtn.disabled = false;
  }
});