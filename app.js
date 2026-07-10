const express = require("express");
const path = require("path");

// Routes
const registerRoute = require("./Routes/registerRoute");
const authRoute = require("./Routes/authRoute");
const hawkerCentreRoute = require("./Routes/hawkerCentreRoute");
const vendorStallRoute = require("./Routes/vendorStallRoute");
const menuItemRoute = require("./Routes/menuItemRoute");
const stallRoute = require("./Routes/stallRoute");
const orderRoute = require("./Routes/orderRoute"); 
const profileRoute = require("./Routes/profileRoute");
const feedbackRoute = require("./Routes/feedbackRoute");

const app = express();

app.use(express.json());

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", registerRoute); // Register 
app.use("/api/auth", authRoute);// Login & Authenticate
app.use("/api/hawkercentres", hawkerCentreRoute); // Retrieve Hawker centres
app.use("/api/vendor", vendorStallRoute); // Available stalls you own as a vendor
app.use("/api/vendor/menu", menuItemRoute); // Vendor menu item management (CRUD + availability)
app.use("/api/stalls", stallRoute); // // Public stall listing + menu display (BED-61, BED-62)
app.use("/api/orders", orderRoute); // Order creation + status
app.use("/api/profile", profileRoute); // Profile page(Patron only for now)
app.use("/api", feedbackRoute); // Feedback submit + vendor read (BED-2)

// Test API route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working" });
});




const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});