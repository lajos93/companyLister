const express = require("express");
const routes = express.Router();

const tools = require("./../shared/tools");
const httpService = require("../shared/httpService");
const Company = require("../models/company");

routes.get("/:location", (req, res, next) => {
  const request = req.params.location;
  const capitalizedReq = tools.capitalizeReq(request);

  Company.find({ name: capitalizedReq }, function (err, result) {
    if (result.length > 0) {
      res.json(result);
    }
    if (result.length === 0) {
      httpService
        .fetchData(capitalizedReq)
        .then((result) => res.json(result))
        .catch((error) => {
          next(error);
        });
    }
    if (err) {
      next(err);
    }
  });
});

module.exports = routes;
