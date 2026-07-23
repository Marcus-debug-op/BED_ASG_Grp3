require("dotenv").config();

const express = require("express");
const path = require("path");
const passport = require("./config/passport");

//Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

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
const complaintRoute = require("./Routes/complaintRoute");
const vendorComplaintRoute = require("./Routes/vendorComplaintRoute");
const menuItemLikeRoute = require("./Routes/menuItemLikeRoute");
const promotionRoute = require("./Routes/promotionRoute");
const vendorDashboardRoute = require("./Routes/vendorDashboardRoute");
const inspectionRoute = require("./Routes/inspectionRoute");
const accountRoute = require("./Routes/accountRoute");
const operatorDashboardRoute = require("./Routes/operatorDashboardRoute");
const { prototype } = require("module");

const app = express();

app.use(express.json());
app.use(passport.initialize());

// Swagger 
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


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
app.use("/api/account", accountRoute);//  Patron account deactivation only
app.use("/api", feedbackRoute); // Feedback submit + vendor read (BED-2)
app.use("/api/complaints", complaintRoute); // Officer-only complaint review and resolution
app.use("/api/vendor/complaints", vendorComplaintRoute); // Vendor: view + acknowledge complaints against their own stalls
app.use("/api/vendor/promotions", promotionRoute); // Vendor: manage their own stall's promotion codes
app.use("/api/vendor/dashboard", vendorDashboardRoute); // Vendor: dashboard summary metrics
app.use("/api/inspections", inspectionRoute);// Officer: scehdule inspections
app.use("/api/menu-items", menuItemLikeRoute); // Menu item likes (BED-26)
app.use("/api/operator/dashboard", operatorDashboardRoute);

// Test API route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working" });
});




const PORT = process.env.PORT || 3000;


/* When you run node app.js, then the server starts normally
When Jest imports app.js, then the server does not start twice */

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
