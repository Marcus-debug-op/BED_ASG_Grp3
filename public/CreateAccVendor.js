const form = document.getElementById("vendorRegisterForm");
const messageDiv = document.getElementById("message");
const apiBaseUrl = "http://localhost:3000/api/auth/register";

async function loadHawkerCentres() {
  const select = document.getElementById("hawker_centre_id");

  try {
    const response = await fetch("/api/hawkercentres");

    if (!response.ok) {
      throw new Error("Unable to load hawker centres.");
    }

    const centres = await response.json();

    centres.forEach((centre) => {
      const option = document.createElement("option");

      option.value = centre.hawker_centre_id;
      option.textContent = centre.centre_name;

      select.appendChild(option);
    });
  } catch (error) {
    console.error("Load hawker centres error:", error);
  }
}

loadHawkerCentres();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

   const submitButton = form.querySelector(".submit-btn");
   submitButton.disabled = true; // stops the user from spamming "Create" button while backend request is running.

  const newVendor = {
    full_name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone_number: document.getElementById("phone_number").value.trim(),
    password: document.getElementById("password").value,
    confirm_password: document.getElementById("confirm_password").value,
    stall_name: document.getElementById("stall_name").value.trim(),
    cuisine_type: document.getElementById("cuisine_type").value.trim(),
    description: document.getElementById("description").value.trim(),
    unit_number: document.getElementById("unit_number").value.trim(),
    hawker_centre_id: document.getElementById("hawker_centre_id").value,
  };
  
  try {
    const response = await fetch(`${apiBaseUrl}/vendor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newVendor)
    });

    const data = await response.json();
    if (!response.ok) {
      const errorMessage = data.errors
        ? data.errors.join("\n")
        : data.message || "Unable to create vendor account.";

      messageDiv.textContent = errorMessage;
      messageDiv.style.color = "red";

      console.log(data);
      return;
    }

    messageDiv.textContent = "Vendor account and stall created successfully.";
    messageDiv.style.color = "green";

    form.reset();

    setTimeout(() => {
      window.location.href = "SignInVendor.html";
    }, 1200);

  } catch (error) {
    console.error("Vendor registration error:", error);
    messageDiv.textContent = "Unable to connect to the server.";
    messageDiv.style.color = "red";

  } finally {
    submitButton.disabled = false; // afterwards it re-enables once backend request finishes
  }
});