const express = require("express");
const operatorStallController = require("../Controllers/operatorStallController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateCreateStall, validateUpdateStall } = require("../Middlewares/operatorStallValidation");

const router = express.Router();

router.post("/", requireRole("operator"), validateCreateStall, operatorStallController.createStall
  /*
    #swagger.tags = ['Operator Stalls']
    #swagger.description = 'BED-28: Operator creates a new stall record.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        vendor_id: 1,
        stall_name: 'Marcus Beancurd House',
        hawker_centre_id: 1,
        cuisine_type: 'Chinese',
        description: 'Silky homemade beancurd.',
        unit_number: '#01-88',
        operating_hours: '9am - 9pm',
        price_range: '$',
        phone_number: '91234567',
        image_url: 'https://example.com/stall.jpg'
      }
    }
    #swagger.responses[201] = { description: 'Stall created' }
    #swagger.responses[400] = { description: 'Validation failed / invalid vendor or hawker centre' }
    #swagger.responses[401] = { description: 'Not authenticated' }
    #swagger.responses[403] = { description: 'Not an operator' }
  */
);

router.get("/", requireRole("operator"), operatorStallController.getStalls
  /*
    #swagger.tags = ['Operator Stalls']
    #swagger.description = 'BED-28: Operator views all stall records (active and inactive).'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.get("/vendors", requireRole("operator"), operatorStallController.getVendors
  /*
    #swagger.tags = ['Operator Stalls']
    #swagger.description = 'BED-28: List of vendors for the stall assignment dropdown.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.get("/:stallId", requireRole("operator"), operatorStallController.getStallById
  /*
    #swagger.tags = ['Operator Stalls']
    #swagger.description = 'BED-28: Operator views a single stall record by id.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[404] = { description: 'Stall not found' }
  */
);

router.put("/:stallId", requireRole("operator"), validateUpdateStall, operatorStallController.updateStall
  /*
    #swagger.tags = ['Operator Stalls']
    #swagger.description = 'BED-28: Operator updates an existing stall record.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Stall updated' }
    #swagger.responses[404] = { description: 'Stall not found' }
  */
);

router.delete("/:stallId", requireRole("operator"), operatorStallController.deactivateStall
  /*
    #swagger.tags = ['Operator Stalls']
    #swagger.description = 'BED-28: Operator deactivates a stall (soft delete - sets is_active = 0, does not remove the record).'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[404] = { description: 'Stall not found' }
  */
);

module.exports = router;
