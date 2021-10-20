const axios = require("axios");

const express = require("express");
const routes = express.Router();

routes.get("/", (req, res) => {
  const url =
    "https://www.szakkatalogus.hu/adat/STADLER_%C3%9CVEGCSISZOL%C3%93_%C3%89S_GRAV%C3%8DROZ%C3%93_M%C3%9BHELY-716961";
  const url2 =
    "https://www.szakkatalogus.hu/adat/STADLER_%C3%9CVEGCSISZOL%C3%93_%C3%89S_GRAV%C3%8DROZ%C3%93_M%C5%B0HELY-716961";

  axios
    .get(url2, { responseType: "arraybuffer" })
    .then(function (response) {
      //get page links
      console.log(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
});

module.exports = routes;
