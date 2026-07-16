# HawkerHub Backend Development Project

HawkerHub is a web-based hawker centre management system developed for the Backend Development assignment. The system allows different user roles, such as patrons and vendors, to register, manage profiles, browse stalls, place orders, and manage vendor-related information.

The project uses a Node.js and Express backend with Microsoft SQL Server as the database. The frontend pages are placed inside the `public` folder and communicate with the backend through REST API routes.

---

## Project Objectives

The main objective of this project is to convert and enhance an existing frontend-based application into a backend-driven web application using:

- Node.js
- Express.js
- Microsoft SQL Server
- REST API architecture
- MVC structure
- JWT authentication
- Input validation
- Jest testing
- Swagger API documentation

---

## Tech Stack

### Backend

- Node.js
- Express.js
- MSSQL package
- JWT authentication
- bcrypt password hashing
- Joi validation
- Multer for profile image upload

### Database

- Microsoft SQL Server
- SQL Server Management Studio

### Authentication

- JWT authentication
- bcrypt password hashing
- Passport.js
- Google OAuth 2.0
- Role-based authorization


### Testing

- Jest
- Supertest

### API Documentation

- Swagger UI
- swagger-autogen

### Frontend

- HTML
- CSS
- JavaScript
- LocalStorage for storing login token and user information

---

## Project Folder Structure

```txt
BED_ASG_Grp3/
│
├── Controllers/
│   ├── registerController.js
│   ├── profileController.js
│   ├── vendorStallController.js
│   └── orderController.js
│
├── Models/
│   ├── registerModel.js
│   ├── profileModel.js
│   ├── vendorStallModel.js
│   └── orderModel.js
│
├── Routes/
│   ├── registerRoute.js
│   ├── profileRoute.js
│   ├── vendorStallRoute.js
│   └── orderRoute.js
│
├── Middlewares/
│   ├── authMiddleware.js
│   ├── patronValidation.js
│   ├── vendorValidation.js
│   ├── profileValidation.js
│   └── uploadProfileImage.js
│
├── Utils/
│   └── token.js
│
├── database/
│   ├── init.sql
│   ├── seed.sql
│   ├── migrations/
│   └── seed_updates/
│
├── public/
│   ├── index.html
│   ├── CreateAccountPatron.html
│   ├── CreateAccountVendor.html
│   ├── PatronProfile.html
│   ├── VendorProfile.html
│   ├── EditProfile.html
│   ├── EditVendorProfile.html
│   ├── VendorOrder.html
│   └── other frontend files
│
├── tests/
│   ├── register.test.js
│   ├── profile.test.js
│   ├── vendorProfileBusinessDetails.test.js
│   ├── vendorOrders.test.js
│   └── testHelpers.js
│
├── app.js
├── dbConfig.js
├── package.json
├── swagger.js
├── swagger-output.json
└── README.md