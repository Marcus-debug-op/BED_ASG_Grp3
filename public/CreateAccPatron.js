const form = document.getElementById("patronRegisterForm");
const messageDiv = document.getElementById("message");

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,50}$/.test(password);
}


function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
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


  const passwordError = validatePassword(newPatron.password);
  
  if (passwordError) {
    messageDiv.textContent = passwordError;
    messageDiv.style.color = "red";
    submitButton.disabled = false;
    return;
  }

  if (newPatron.password !== newPatron.confirm_password) {
    messageDiv.textContent = "Password and confirm password do not match.";
    messageDiv.style.color = "red";
    submitButton.disabled = false;
    return;
  }
  


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
      window.location.href = "SigninPatron.html";
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

