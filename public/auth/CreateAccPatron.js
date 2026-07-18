const form = document.getElementById("patronRegisterForm");
const messageDiv = document.getElementById("message");

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,50}$/.test(password);
}


function validatePatronForm(newPatron) {
  if (!newPatron.full_name) {
    return "Full name is required.";
  }

  if (!newPatron.email) {
    return "Email address is required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPatron.email)) {
    return "Please enter a valid email address.";
  }

  if (!newPatron.phone_number) {
    return "Phone number is required.";
  }

  if (!/^\d+$/.test(newPatron.phone_number)) {
    return "Phone number must contain numbers only.";
  }

  if (!/^[689]\d{7}$/.test(newPatron.phone_number)) {
    return "Phone number must be 8 digits and start with 6, 8, or 9.";
  }

  if (!newPatron.password) {
    return "Password is required.";
  }

  if (newPatron.password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(newPatron.password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(newPatron.password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(newPatron.password)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(newPatron.password)) {
    return "Password must include at least one special character.";
  }

  if (newPatron.password !== newPatron.confirm_password) {
    return "Password and confirm password do not match.";
  }

  return null;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const submitButton = form.querySelector(".submit-btn");
  submitButton.disabled = true; // stops the user from spamming "Create" button while backend request is running.

  const newPatron = {
    full_name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    confirm_password: document.getElementById("confirm_password").value,
    phone_number: document.getElementById("phone_number").value.trim(),
  }


  // const validationError = validatePatronForm(newPatron);

  // if (validationError) {
  //   messageDiv.textContent = validationError;
  //   messageDiv.style.color = "red";
  //   submitButton.disabled = false;
  //   return;
  // }
    


  try {

    const response = await fetch("/api/auth/register/patron", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newPatron)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.errors
      ? data.errors.join("\n")
      : data.message || "Unable to create account.";

      messageDiv.textContent = errorMessage;
      messageDiv.style.color = "red";
      return;
    }
    
    messageDiv.textContent = "Account created successfully.";
    messageDiv.style.color = "green";

    form.reset();

    setTimeout(() => {
      window.location.href = "/auth/SigninPatron.html";
    }, 1200);


  } catch (error) {
    console.error("Patron registration error:", error);
    messageDiv.textContent = "Unable to connect to the server.";
    messageDiv.style.color = "red";
  }

  finally {
  submitButton.disabled = false; // afterwards it re-enables once backend request finishes
}
});

