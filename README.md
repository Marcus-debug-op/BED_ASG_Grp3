# HawkerHub Backend Development Project

HawkerHub is a web-based hawker centre management system developed for the Backend Development assignment. The system allows different users, such as patrons and vendors, to register, manage profiles, browse stalls, place orders, and manage vendor-related information.

The project uses a Node.js and Express backend with Microsoft SQL Server as the database. Frontend pages are stored inside the `public` folder and communicate with the backend using REST API routes.

---

## Project Objectives

The objective of HawkerHub is to provide a web-based platform that improves the way patrons and vendors interact within a hawker centre environment. The system aims to make hawker stall discovery, account management, and order handling more organised, efficient, and user-friendly.

Through this project, the team aims to:

- Allow patrons and vendors to register and manage their accounts securely
- Provide role-based access so each user type can only access relevant features
- Help patrons browse stalls, view menu items, and place orders more conveniently
- Help vendors manage their business information and receive customer orders
- Support profile management, including viewing and updating user details
- Store and manage application data using Microsoft SQL Server
- Build a structured backend using REST APIs and MVC architecture
- Improve backend reliability through input validation, authentication, and authorization
- Document backend APIs using Swagger for easier testing and understanding
- Verify key backend features using Jest and Supertest API testing

---

## Tech Stack

### Backend

- Node.js
- Express.js
- MSSQL package
- bcrypt password hashing
- JSON Web Token authentication
- Joi validation
- Multer for profile image uploads
- Passport.js
- Google OAuth 2.0

### Frontend

- HTML
- CSS
- JavaScript
- Fetch API
- LocalStorage

### Database

- Microsoft SQL Server
- SQL Server Management Studio

### Testing

- Jest
- Supertest

### API Documentation

- Swagger UI Express
- swagger-autogen

---

## Main Features

### 1. Patron Registration

Patrons can create an account using their full name, email, phone number, and password.

Validation includes:

- Full name is required
- Email must be valid
- Phone number must be a valid Singapore phone number
- Password must meet strength requirements
- Confirm password must match password

API route:

```txt
POST /api/auth/register/patron
```

---

### 2. Vendor Registration

Vendors can create an account and register their stall at the same time.

Vendor registration creates:

- A user record in the `Users` table
- A stall record in the `Stalls` table

Validation includes:

- Full name is required
- Email must be valid
- Phone number must be valid
- Password must meet requirements
- Confirm password must match password
- Stall name is required
- Cuisine type is required
- Stall description is required
- Unit number is required
- Hawker centre must be selected

API route:

```txt
POST /api/auth/register/vendor
```

---

### 3. Login and Authentication

The system uses JWT authentication for protected routes. After login, the frontend stores the token, role, and user information in LocalStorage.

Protected API routes require this header:

```txt
Authorization: Bearer <token>
```

Common authentication routes:

```txt
POST /api/auth/login/patron
POST /api/auth/login/vendor
GET /api/auth/me
```

Role-based authorization prevents users from accessing routes outside their role.

---

### 4. Google OAuth

The project includes Google OAuth 2.0 support using Passport.js.

Google OAuth routes:

```txt
GET /api/auth/google
GET /api/auth/google/callback
```

Google OAuth requires Google client details to be configured in the `.env` file.

---

### 5. Profile View and Edit

Logged-in users can view and update their profile details.

Users can view:

- Full name
- Email
- Phone number
- Profile image

Users can update:

- Full name
- Phone number

Email is not editable because it is used as a unique account identifier.

API routes:

```txt
GET /api/profile/my-profile
PUT /api/profile/my-profile
```

---

### 6. Profile Picture Upload

Users can upload a profile picture. The uploaded image is stored in the server upload folder, and the image path is saved in the database.

API route:

```txt
PUT /api/profile/profile-picture-upload
```

---

### 7. Vendor Profile Business Details

The vendor profile page includes a view-only business details section.

It displays:

- Total stalls owned
- Main hawker centre
- Stall name
- Cuisine type
- Unit number
- Active status

This section is for viewing purposes only. Full stall editing and management should be handled in the vendor stall management page.

API route:

```txt
GET /api/vendor/my-stalls
```

---

### 8. Vendor Order Management

Vendors can view customer orders made to their stalls and update the order status.

Vendors can:

- View orders from their stalls
- View order details
- Update order status

API routes:

```txt
GET /api/orders/vendor/my-orders
GET /api/orders/vendor/my-orders/:orderId
PUT /api/orders/vendor/my-orders/:orderId/status
```

---

### 9. Patron Order Features

Patrons can place orders and view order-related information.

Common order routes:

```txt
POST /api/orders
GET /api/orders/history
GET /api/orders/:id
GET /api/orders/:id/status
```

---

### 10. Other Features

The project also includes other backend features such as:

- Stall browsing
- Menu item management
- Feedback
- Complaints
- Promotions
- Vendor-related management features

---

## Project Folder Structure

```txt
BED_ASG_Grp3/
├── Controllers/
├── Models/
├── Routes/
├── Middlewares/
├── Utils/
├── config/
├── database/
│   ├── init.sql
│   └── seed.sql
├── public/
├── tests/
│   ├── register.test.js
│   ├── profile.test.js
│   ├── vendorProfileBusinessDetails.test.js
│   ├── vendorOrders.test.js
│   └── testHelpers.js
├── app.js
├── dbConfig.js
├── package.json
├── swagger.js
├── swagger-output.json
└── README.md
```

---

## Installation

Install all required dependencies:

```bash
npm install
```

Do not manually commit or upload `node_modules`. Dependencies should be installed using `package.json`.

---

## Environment Variables

Create a `.env` file in the project root.

Example:

```env
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_SERVER=localhost
DB_DATABASE=HawkerDB
DB_PORT=1433
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=2h
GUEST_JWT_EXPIRES_IN=6h
PORT=3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
FRONTEND_APP_URL=/index.html
FRONTEND_LOGIN_URL=/SigninPatron.html
```

Do not commit `.env` to GitHub.

---

## Database Setup

### Step 1: Create the database

Open SQL Server Management Studio and run:

```sql
CREATE DATABASE HawkerDB;
```

### Step 2: Run the init script

Run:

```txt
database/init.sql
```

This creates the database tables.

### Step 3: Run the seed script

Run:

```txt
database/seed.sql
```

This inserts sample data for testing and demo purposes.

---

## Running the Project

Start the server:

```bash
node app.js
```

or:

```bash
npm start
```

Then open:

```txt
http://localhost:3000
```

Important: do not use Live Server on port 5500 for testing the full project. The frontend should be opened through the Express server so that API routes work correctly.

---

## Swagger API Documentation

Generate Swagger documentation:

```bash
node swagger.js
```

Start the server:

```bash
node app.js
```

Open Swagger UI:

```txt
http://localhost:3000/api-docs
```

---

## Running Jest Tests

Run all tests:

```bash
npm test
```

Run selected test files:

```bash
npx jest tests/register.test.js tests/profile.test.js tests/vendorProfileBusinessDetails.test.js tests/vendorOrders.test.js
```

---

## Jest Test Files

### `register.test.js`

Tests patron and vendor registration.

It checks:

- Invalid phone numbers are rejected
- Weak passwords are rejected
- Password mismatch is rejected
- Missing vendor stall name is rejected
- Missing hawker centre is rejected
- Valid patron registration succeeds
- Valid vendor registration succeeds

### `profile.test.js`

Tests profile view and edit APIs.

It checks:

- Logged-in patron can view profile
- User without token cannot view profile
- Invalid phone number update is rejected
- Valid profile update succeeds

### `vendorProfileBusinessDetails.test.js`

Tests the API used by the Vendor Profile Business Details section.

It checks:

- Vendor can view own stall business details
- User without token cannot access the route
- Patron cannot access vendor-only business details

### `vendorOrders.test.js`

Tests vendor order management.

It checks:

- Vendor can view customer orders from their stalls
- User without token cannot access vendor order routes
- Patron cannot access vendor order routes
- Invalid order status is rejected
- Valid order status update succeeds

### `testHelpers.js`

Contains helper functions used by protected-route tests.

It helps to:

- Generate patron JWT tokens
- Generate vendor JWT tokens
- Find or create a test menu item for order testing

This allows tests to focus on protected APIs without depending directly on the login page.

---

## Important Testing Notes

Some Jest tests create real data in the SQL database.

Examples:

- Successful patron registration creates a test patron
- Successful vendor registration creates a test vendor and stall
- Vendor order tests may create a test order
- Vendor order tests may create a test menu item if no available menu item exists

To avoid duplicate key errors, test data uses dynamic values such as:

```js
const uniqueValue = Date.now();
```

---

## Optional Test Data Cleanup

After testing, test data can be removed manually in SQL Server.

```sql
DELETE FROM Stalls
WHERE stall_name LIKE 'Jest Test Stall%';

DELETE FROM Users
WHERE full_name LIKE 'Jest Test%';
```

Only run cleanup scripts if you are sure you want to remove Jest test records.

---

## Common Errors

### Cannot insert duplicate key

Cause: a test tried to insert a duplicate email or duplicate stall unit number.

Fix: use unique values such as `Date.now()`.

### 401 Unauthorized

Cause: no JWT token was provided.

Fix: send `Authorization: Bearer <token>`.

### 403 Forbidden

Cause: the logged-in user role is not allowed to access the route.

Example: a patron trying to access a vendor-only route.

---

## GitHub Notes

Do not commit:

```txt
node_modules/
.env
```

Commit:

```txt
package.json
package-lock.json
database scripts
source code
test files
README.md
```

If another team member pulls the project, they should run:

```bash
npm install
```

before starting the server.

---

## Team Feature Ownership

| Member | Features |

| Marcus Ng| Registration, profile view/edit, vendor profile business details, vendor order management |
| Ryan Ng | Login and authentication flow |
| Damien Tan| To be updated |
| Ben Goh| To be updated |
| Ryan Tan | To be updated |

Update the member names and features based on the final group allocation.