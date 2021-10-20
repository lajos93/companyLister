const axios = require("axios");

const express = require("express");
const routes = express.Router();

routes.get("/", (req, res) => {
  const url = "https://www.szakkatalogus.hu/adat/BABI-K%C5%90_BT-714810";

  axios
    .get(url, { responseType: "arraybuffer" })
    .then(function (response) {
      //get page links
      console.log(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
});

module.exports = routes;
