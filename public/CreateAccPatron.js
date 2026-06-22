const form = document.querySelector("#patronRegisterForm");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  const confirmPassword = document.querySelector("#confirm_password").value;
  const phoneNumber = document.querySelector("#phone_number").value.trim();

  try {
    const response = await fetch("/api/auth/register/patron", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        email: email,
        password: password,
        confirm_password: confirmPassword,
        phone_number: phoneNumber
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to create patron account.");
      console.log(data.errors);
      return;
    }

    alert("Patron account created successfully.");
    window.location.href = "SigninPatron.html";
  } catch (error) {
    console.error("Registration error:", error);
    alert("Unable to connect to the server. Please try again.");
  }
});

