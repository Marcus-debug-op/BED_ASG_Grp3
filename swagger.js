const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "HawkerHub API",
    version: "1.0.0",
    description: "API documentation for the HawkerHub backend system. Endpoints are grouped according to user role and functionality."
  },

  host: "localhost:3000",
  basePath: "/",
  schemes: ["http"],
  consumes: ["application/json"],
  produces: ["application/json"],

  tags: [
    {
      name: "Auth",
      description: "Registration, login, OTP, Google authentication and password reset"
    },
    {
      name: "Profile",
      description: "View and update the logged-in user's profile"
    },
    {
      name: "Account",
      description: "User account management"
    },

    {
      name: "Public - Hawker Centres",
      description: "Public hawker centre information"
    },
    {
      name: "Public - Stalls",
      description: "Public stall, menu and review information"
    },

    {
      name: "Patron - Orders",
      description: "Patron checkout, order history and order tracking"
    },
    {
      name: "Patron - Addresses",
      description: "Patron saved delivery address management"
    },
    {
      name: "Patron - Feedback",
      description: "Patron feedback and review management"
    },
    {
      name: "Patron - Complaints",
      description: "Patron complaint submission"
    },
    {
      name: "Patron - Likes",
      description: "Patron menu-item likes"
    },
    {
      name: "Patron - Promotions",
      description: "Promotions available to patrons"
    },

    {
      name: "Vendor - Dashboard",
      description: "Vendor dashboard metrics"
    },
    {
      name: "Vendor - Stalls",
      description: "Vendor stall information and images"
    },
    {
      name: "Vendor - Menu",
      description: "Vendor menu-item management"
    },
    {
      name: "Vendor - Orders",
      description: "Vendor order processing and status updates"
    },
    {
      name: "Vendor - Feedback",
      description: "Feedback received by vendor stalls"
    },
    {
      name: "Vendor - Promotions",
      description: "Vendor promotion-code management"
    },
    {
      name: "Vendor - Complaints",
      description: "Complaints received by vendor stalls"
    },
    {
      name: "Vendor - Rental Agreements",
      description: "Vendor rental-agreement acknowledgement"
    },

    {
      name: "Operator - Dashboard",
      description: "Operator dashboard metrics"
    },
    {
      name: "Operator - Stalls",
      description: "Operator stall-record management"
    },
    {
      name: "Operator - Rental Agreements",
      description: "Operator rental-agreement management"
    },

    {
      name: "Staff - Complaint Management",
      description: "Officer and operator complaint handling"
    },

    {
      name: "NEA - Inspections",
      description: "NEA inspection scheduling and results"
    },
 
  ],

  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Enter the JWT token in this format: Bearer <token>"
    }
  }
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);