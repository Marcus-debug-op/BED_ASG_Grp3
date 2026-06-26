const form = document.getElementById("patronRegisterForm");
const messageDiv = document.getElementById("message");

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

