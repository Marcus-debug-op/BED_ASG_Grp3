const hawkerCentreModel = require("../Models/hawkerCentreModel");

async function getAllHawkerCentres(req, res) {
  try {
    const hawkerCentres = await hawkerCentreModel.getAllHawkerCentres();

    res.status(200).json(hawkerCentres);
  } catch (error) {
    console.error("Get hawker centres error:", error);

    res.status(500).json({
      message: "Unable to retrieve hawker centres."
    });
  }
}

module.exports = {
  getAllHawkerCentres
};