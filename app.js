const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Test API route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working" });
});







const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});