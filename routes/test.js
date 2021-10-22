const axios = require("axios");

const express = require("express");
const routes = express.Router();

routes.get("/", (req, res) => {
  const url =
    "https://www.szakkatalogus.hu/adat/B%C3%B6rcs%C3%B6k_Zolt%C3%A1n_ev-715428";
  const url2 =
    "https://www.szakkatalogus.hu/adat/B%C3%B6rcs%C3%B6k_Zolt%C3%A1n_ev-715428";

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
