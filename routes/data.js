const axios = require("axios");
const cheerio = require("cheerio");

const express = require("express");
const routes = express.Router();

routes.get("/", (req, res, next) => {
  // Make a request for a user with a given ID
  axios
    .get(
      "https://www.szakkatalogus.hu/telepules/Gy%C5%91r%C3%BAjbar%C3%A1t?lap=0",
      { responseType: "arraybuffer" }
    )
    .then(function (response) {
      let pageLinks = [];

      const responseFormatted = response.data.toString("latin1");
      const $ = cheerio.load(responseFormatted);

      $(".box .ct a").each(function () {
        let pageLink = $(this).attr("href");

        let pageLinkEscaped = encodeURI(pageLink)
          .replace(/%C3%BB/g, "%C5%B1")
          .replace(/%C3%B5/g, "%C5%91");
        pageLinks.push(`https://www.szakkatalogus.hu${pageLinkEscaped}`);
      });

      let companyData = { data: [], dataLength: 0 };

      for (let i = 0; i < pageLinks.length; i++) {
        axios
          .get(pageLinks[i], { responseType: "arraybuffer" })
          .then((resp) => {
            const jQuery = cheerio.load(resp.data.toString("latin1"));

            let name = jQuery("h1").text();
            let url = null;

            jQuery(".l").filter(function () {
              let el = jQuery(this).next();
              let textValue = el.text();
              let hasUrl = textValue.includes(".hu");

              if (hasUrl) url = `https://${textValue}`;
            });

            companyData.data.push({
              name: name,
              url: url,
            });

            if (companyData.data.length == pageLinks.length) {
              companyData.dataLength = pageLinks.length;
              res.json(companyData);
            }

            //if ((i = pageLinks.length)) console.log(companyData);
          })
          .catch((error) => {
            console.log(error);
          });
      }
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
});

module.exports = routes;
