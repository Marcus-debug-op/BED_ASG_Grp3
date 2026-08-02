# HawkerHub Backend Development Project

HawkerHub is a web-based hawker centre management system developed for the Backend Development assignment. The system allows different users, such as patrons and vendors, to register, manage profiles, browse stalls, place orders, and manage vendor-related information.

The project uses a Node.js and Express backend with Microsoft SQL Server as the database. Frontend pages are stored inside the `public` folder and communicate with the backend using REST API routes.

---

## Team Feature Ownership

| Member | Features |
|---|---|
| Marcus Ng| Patron/Vendor registration, Shared Profile Management and Profile-Image Upload, Vendor Business Details, Vendor Order Management and History, Account Deactivation, NEA Inspection Management and Hygiene-Grade Updates |
| Ryan Ng | Patron & Vendor Login Authentication, Operator & NEA Officer Login Authentication, Google Sign-In, Guest Login, JWT Session Management, Role-Based Access Control, Protected Page Access, Forgot Password Reset, Vendor Sales Dashboard, Monthly Sales Filter, Vendor Daily Order Filter & Search |
| Damien Tan | Vendor Promotion Code Management, Complaint Management, Role-Based Complaint Management, Vendor Item Management, Two-Factor OTP Staff Login with Badge ID Verification |
| Ben Goh| Stall Listing & Browsing, Feedback & Ratings, Menu Item Likes, Operator Rental Agreement management, Vendor Rental Agreement Acknowledgement, Stall Profile Picture, Complaint Image Upload, Feedback Photo Upload, Dietary Preference Filter |
| Ryan Tan | Order creation and checkout integration, order status, order history (API + page), order details with line items, saved delivery addresses (CRUD), eco-friendly packaging option, checkout input validation, add-to-cart cart notifications, and checkout receipt |

---

## Project Objectives

HawkerHub is a backend-driven hawker centre management system that supports patrons, vendors, hawker centre operators, NEA officers, and guests. The project extends a frontend application with REST APIs, Microsoft SQL Server persistence, authentication, role-based access control, validation, image uploads, automated testing, and Swagger documentation.

The project aims to:

- Provide secure account registration, authentication, profile management, and password recovery.
- Allow patrons and guests to browse hawker centres, stalls, menus, ratings, and dietary options.
- Allow patrons to place orders, use promotions, manage addresses, submit feedback and complaints, and review order history.
- Allow vendors to manage stalls, menus, promotions, orders, business information, feedback, complaints, dashboards, and rental agreements.
- Allow operators to manage stalls, rental agreements, dashboards, and service-related complaints.
- Allow NEA officers to manage hygiene inspections, hygiene grades, analytics, and hygiene-related complaints.
- Apply a structured MVC-style backend using routes, middleware, controllers, models, and parameterised SQL queries.
- Document and test the backend using Swagger, Jest, Supertest, and jsdom-based frontend tests.

---

## Main System Features

### Public and guest features

- Browse active hawker centres and stalls.
- Search stalls and filter by cuisine or dietary preference.
- View stall menus, review summaries, ratings, and menu-item like counts.
- Create a restricted guest session for public browsing.

### Patron features

- Register and sign in using email and password.
- Sign in or register using Google OAuth 2.0.
- View and update profile details and upload a profile picture.
- Browse stalls, like menu items, and submit, edit, or delete feedback.
- Submit complaints with an optional image.
- Add items to a cart, complete checkout, apply promotion codes, and request eco-friendly packaging.
- View order status, order details, receipts, and order history.
- Create, retrieve, update, and delete saved delivery addresses.
- Request a password reset and set a new password using a generated reset token.
- Deactivate an account using soft-deletion logic so historical records remain stored.

### Vendor features

- Register a vendor account together with linked stall information.
- View shared profile details and linked vendor business information.
- Upload or replace a stall profile picture.
- View dashboard metrics and filter sales information.
- Create, update, delete, and change the availability of menu items.
- View current orders, search or filter them, open order details, and update order status.
- View completed order history and eco-friendly packaging selections.
- Create and manage promotion codes for owned stalls.
- View feedback and complaints associated with owned stalls.
- View and acknowledge rental agreements.

### Operator features

- Sign in using email, password, badge verification, and OTP verification.
- View operator dashboard metrics.
- Create, view, update, and deactivate stall records.
- Create, update, and remove rental agreements.
- Review and update service-related complaints.

### NEA officer features

- Sign in using email, password, badge verification, and OTP verification.
- Schedule, view, reschedule, cancel, and complete stall inspections.
- Record inspection scores, results, remarks, and hygiene grades.
- Update a stall's latest hygiene grade after a completed inspection.
- View inspection and hygiene analytics.
- Review and update hygiene-related complaints.

---

## System Architecture

The application follows a layered MVC-style request flow:

```text
Frontend HTML / CSS / JavaScript
              ↓ Fetch API
Express route definitions
              ↓
Authentication, role, validation, and upload middleware
              ↓
Controllers
              ↓
Models with parameterised SQL queries
              ↓
Microsoft SQL Server
```

Protected API requests use a JSON Web Token:

```http
Authorization: Bearer <token>
```

The backend identifies the authenticated user from the verified token. Role middleware restricts patron, vendor, operator, and NEA officer endpoints to the correct account type.

---

## Technology Stack

### Backend and security

- Node.js
- Express.js
- `mssql` for Microsoft SQL Server access
- `bcrypt` for password hashing
- `jsonwebtoken` for JWT authentication
- `joi` for request validation
- `multer` for profile, stall, feedback, and complaint image uploads
- `passport` and `passport-google-oauth20` for Google OAuth 2.0
- `dotenv` for environment-variable configuration
- `nodemailer` for password-reset email support

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API
- LocalStorage

### Database and development tools

- Microsoft SQL Server
- SQL Server Management Studio
- Visual Studio Code
- Git and GitHub

### Testing and API documentation

- Jest
- Supertest
- `jest-environment-jsdom`
- Swagger UI Express
- `swagger-autogen`
- Nodemon for development

---

## Project Folder Structure

```text
BED_ASG_Grp3/
├── Controllers/                 # Request and response logic
├── Models/                      # SQL queries and database operations
├── Routes/                      # REST API endpoint definitions
├── Middlewares/                 # Authentication, roles, validation, and uploads
├── Utils/                       # JWT, OTP, email, and password-reset utilities
├── config/                      # Passport and Google OAuth configuration
├── database/
│   ├── init.sql                 # Creates the database and final table structure
│   ├── seed.sql                 # Inserts demonstration and testing data
│   ├── migration/               # Historical schema migration scripts
│   └── seed_updates/            # Historical seed update scripts
├── public/
│   ├── auth/                    # Registration, login, and password-reset pages
│   ├── profile/                 # Patron and vendor profile pages
│   ├── patron/                  # Browsing, cart, checkout, feedback, and orders
│   ├── vendor/                  # Dashboard, menu, orders, promotions, and rental status
│   ├── operator/                # Operator dashboard and management pages
│   ├── officer/                 # NEA inspection and complaint pages
│   ├── credits/                 # Credits page and stylesheet
│   ├── shared/                  # Shared navigation and access-control scripts
│   ├── img/                     # Static images and icons
│   ├── uploads/                 # Uploaded images generated while using the system
│   └── index.html
├── tests/
│   ├── api/                     # Jest and Supertest API/integration tests
│   ├── controllers/             # Controller unit tests with mocked models
│   ├── front-end/               # Frontend Jest/jsdom tests
│   ├── testHelpers.js           # Shared backend test helpers
│   └── frontendTestHelpers.js   # Shared frontend test helpers
├── app.js                       # Express application and route mounting
├── dbConfig.js                  # SQL Server connection configuration
├── swagger.js                   # Swagger generation configuration
├── swagger-output.json          # Generated Swagger specification
├── package.json
├── package-lock.json
└── README.md
```

The final clean setup uses `database/init.sql` followed by `database/seed.sql`. The files inside `database/migration/` and `database/seed_updates/` are retained as development history and are not required after the final scripts have been consolidated.

---

## Prerequisites

Install the following before running the project:

- A recent Node.js LTS release with npm
- Microsoft SQL Server
- SQL Server Management Studio or another SQL client
- Git, when cloning the repository instead of using the submitted ZIP

---

## Installation and Setup

### 1. Obtain the project

Clone the repository:

```bash
git clone https://github.com/Marcus-debug-op/BED_ASG_Grp3.git
cd BED_ASG_Grp3
```

Alternatively, extract the submitted ZIP and open the `BED_ASG_Grp3` folder in Visual Studio Code.

### 2. Install dependencies

```bash
npm install
```

Do not copy or commit `node_modules/`. It is recreated from `package.json` and `package-lock.json`.

### 3. Create the environment file

Create a `.env` file in the project root:

```env
PORT=3000

DB_USER=your_sql_login
DB_PASSWORD=your_sql_password
DB_SERVER=localhost
DB_DATABASE=HawkerDB__Official
DB_PORT=1433

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=2h
GUEST_JWT_EXPIRES_IN=6h

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

FRONTEND_APP_URL=http://localhost:3000/index.html
FRONTEND_LOGIN_URL=http://localhost:3000/auth/SigninPatron.html
FRONTEND_RESET_URL=http://localhost:3000/auth/ResetPassword.html
```

Google credentials are required only when demonstrating Google sign-in. Never commit real credentials, tokens, or passwords to GitHub.

### 4. Set up the database

Open `database/init.sql` in SQL Server Management Studio and execute the complete script once. It already creates and selects:

```text
HawkerDB__Official
```

After it finishes, execute:

```text
database/seed.sql
```

The seed script inserts demonstration data and accounts required by the application and several automated tests.

> Do not manually create `HawkerDB__Official` before running `init.sql`, because `init.sql` already contains `CREATE DATABASE HawkerDB__Official`. Do not rerun the complete initialisation script against an existing database unless the database has intentionally been removed or reset.

### 5. Generate the Swagger specification

```bash
node swagger.js
```

This regenerates `swagger-output.json` from the current application routes and Swagger annotations.

### 6. Start the application

```bash
npm start
```

The terminal should display:

```text
Server running at http://localhost:3000
```

Open the application through Express:

```text
http://localhost:3000
```

Do not use the VS Code Live Server port for the complete application. The frontend depends on API routes and static files served by Express.

---

## Main URLs

| Resource | URL |
|---|---|
| Main application | `http://localhost:3000` |
| Patron sign-in | `http://localhost:3000/auth/SigninPatron.html` |
| Vendor sign-in | `http://localhost:3000/auth/SignInVendor.html` |
| Operator sign-in | `http://localhost:3000/operator/SignInOperator.html` |
| NEA officer sign-in | `http://localhost:3000/officer/SignInOfficer.html` |
| Swagger API documentation | `http://localhost:3000/api-docs` |
| Credits page | `http://localhost:3000/credits/credit.html` |

Seeded demonstration accounts and their roles are defined in `database/seed.sql`.

### Officer and operator OTP demonstration

Officer and operator login requires email, password, badge ID, and a second OTP verification step. In non-production mode, the generated OTP is printed in the server terminal and may also be returned as `devOtp` for demonstration.

### Password-reset demonstration

The current development email service prints the password-reset link in the server terminal. After requesting a reset, copy the displayed link into the browser.

---

## Swagger API Documentation

Regenerate Swagger whenever route definitions or annotations change:

```bash
node swagger.js
npm start
```

Open:

```text
http://localhost:3000/api-docs
```

For protected endpoints:

1. Log in through the relevant authentication endpoint.
2. Copy the returned JWT.
3. Select **Authorize** in Swagger.
4. Enter:

```text
Bearer <token>
```

5. Use **Try it out** on the required endpoint.

---

## Running Automated Tests

Run all Jest tests:

```bash
npm test
```

Run the complete suite serially when shared SQL data or connection limits cause interference:

```bash
npm test -- --runInBand
```

Examples of individual test suites:

```bash
npx jest tests/api/register.test.js --runInBand
npx jest tests/api/profile.test.js --runInBand
npx jest tests/api/vendorOrders.test.js --runInBand
npx jest tests/controllers/accountController.test.js --runInBand
npx jest tests/controllers/inspectionController.test.js --runInBand
```

The test suite includes:

- API and integration tests using Jest and Supertest
- Controller unit tests using mocked model functions
- Frontend tests using Jest and jsdom
- Shared helpers that obtain or generate authentication tokens for test users

Some API tests connect to the local SQL database and may insert test records. Dynamic values such as `Date.now()` are used where possible to reduce duplicate email, promotion-code, or stall-unit conflicts.

---

## Common Problems

### SQL Server connection fails

Check that:

- SQL Server is running.
- `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`, and `DB_PORT` are correct.
- TCP/IP is enabled when required by the local SQL Server configuration.
- The configured SQL login has access to `HawkerDB__Official`.

### Database already exists

`database/init.sql` creates `HawkerDB__Official`. Do not run it repeatedly against the same database unless the existing database has intentionally been removed or reset.

### `401 Unauthorized`

The endpoint requires a valid JWT:

```http
Authorization: Bearer <token>
```

### `403 Forbidden`

The user is authenticated but does not have the role or ownership required by the endpoint.

### Swagger does not show recent routes or tags

Regenerate the specification and restart Express:

```bash
node swagger.js
npm start
```

Then hard-refresh the browser.

### Duplicate-key errors during testing

An email, promotion code, user-menu like, or stall unit number may already exist. Use unique test data or reset only the affected test records after confirming that it is safe to do so.

---

## Credits and Third-Party Resources

Team contributions, libraries, tools, images, icons, fonts, logos, AI tools, and design references are acknowledged on the Credits page:

```text
http://localhost:3000/credits/credit.html
```

---

## Repository and Security Notes

Do not commit or submit real secrets or generated dependencies:

```text
node_modules/
.env
coverage/
*.log
```

The final repository should include source code, SQL scripts, test files, Swagger files, `package.json`, `package-lock.json`, the Credits page, and this README.

This application was created for educational and non-commercial use. Third-party assets and trademarks remain the property of their respective owners.
