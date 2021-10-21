const axios = require("axios");

const express = require("express");
const routes = express.Router();

const tools = require("./../tools/tools");

routes.get("/", (req, res) => {
  const status = 404;
  res.status(status).json({ error: "No search parameters", CODE: status });
});

routes.get("/:location", (req, res) => {
  const request = req.params.location;
  const capitalizedReq = tools.capitalizeReq(request);

  const fileName = tools.setFilename(capitalizedReq);
  const isData = tools.isData(fileName);

  if (isData) {
    const parsedData = tools.readData(fileName);
    res.json(parsedData);
  } else {
    mainSiteLink = `https://www.szakkatalogus.hu/telepules/${encodeURI(
      capitalizedReq
    )}?lap=0`;

    axios
      .get(mainSiteLink, { responseType: "arraybuffer" })
      .then(function (response) {
        //get page links
        let pagination = [];
        pagination = tools.extractPageLinks(response);

        //define section links array
        let pageLinks = [];
        pageLinks = tools.extractURLs(response);

        //index array to check on the last item in the async for loop
        let indexes = [];

        //run through the remaining pages
        for (let p = 0; p < pagination.length; p++) {
          axios
            .get(pagination[p], { responseType: "arraybuffer" })
            .then((paginationResp) => {
              //get section values

              let updatedPageLinks = tools.extractURLs(paginationResp);
              pageLinks = [...pageLinks, ...updatedPageLinks];

              indexes.push(p);

              if (indexes.length == pagination.length) {
                tools
                  .processSubDocData(pageLinks)
                  .then((finalRes) => {
                    tools.writeFile(fileName, finalRes);
                    res.json(finalRes);
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              }
            })
            .catch((error) => {
              console.log(error);
            });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

module.exports = routes;
