const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "HawkerHub API",
    description: "API documentation for HawkerHub backend system"
  },
  host: "localhost:3000",
  schemes: ["http"],

  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Enter JWT token in this format: Bearer <token>"
    }
  }
};

const outputFile = "./swagger-output.json";

const endpointsFiles = [
  "./app.js"
];

swaggerAutogen(outputFile, endpointsFiles, doc);