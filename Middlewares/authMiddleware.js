const { verifyToken } = require("../Utils/token");

function getTokenFromHeader(req) {
  const header = req.headers["authorization"] || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

// Attaches req.user if a valid token (registered user OR guest) is present.
// Does NOT reject the request if no token, or an invalid token, is present -
// use this on public routes so guests (and anonymous visitors) can pass through.
function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = verifyToken(token);
  } catch (error) {
    req.user = null;
  }

  next();
}

// Requires a valid token (registered user OR guest) to be present.
// Rejects with 401 if missing/invalid.
function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

// Requires a valid token AND that the caller is one of the given registered roles.
// Guests are always rejected (403) since they have no role in `roles`.
function requireRole(...roles) {
  return function (req, res, next) {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          message: "You do not have permission to access this resource."
        });
      }

      next();
    });
  };
}

// Convenience middleware for routes restricted to any registered (non-guest) user,
// e.g. order history, profile management.
function blockGuests(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.isGuest || req.user.role === "guest") {
      return res.status(403).json({
        message: "Guests cannot access this resource. Please sign in."
      });
    }

    next();
  });
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  blockGuests
};
