const axios = require("axios");

const express = require("express");
const routes = express.Router();

const tools = require("./../shared/tools");
const helpers = require("./../shared/helpers");
const { map } = require("rxjs");

routes.get("/", (req, res) => {
  const status = 404;
  const message = helpers.errorHelper(status);
  res.status(status).json({ error: message, CODE: status });
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
        let foundItemsAmount;
        foundItemsAmount = tools.foundItemsAmount(response);

        //get pagination links
        let pagination = [];
        pagination = tools.extractPageLinks(
          response,
          foundItemsAmount,
          capitalizedReq
        );
        const paginationLinks = pagination.length;

        const chunkSize = 4;

        let paginationSlices = [];
        paginationSlices = tools.sliceArrayIntoSubArrays(pagination, chunkSize);

        //limit paginationLinks to not go above 6x40(240) additional requests
        const paginationLimit = pagination;

        //define section links array
        let pageLinks = [];
        pageLinks = tools.extractURLs(response);

        let companyData = { data: [], length: 0 };

        //intervals between each iteration in sec
        let timeInterval = 3;

        let i = 0;
        let p = 0;

        //get all links by mimicking user behaviour ( only send a request within a given timeinterval )

        tools
          .sendRequestsInIntervals(paginationSlices, timeInterval)
          .subscribe((resp) => {
            i++;
            console.log("current pagination:", i + "/" + pagination.length);

            pageLinks = tools.handleData(resp, pageLinks);

            const lastIteration = pagination.length == i;
            if (lastIteration) {
              console.log(`pagination is searched, now extracting data`);

              let pagesSlices = [];
              pagesSlices = tools.sliceArrayIntoSubArrays(
                pageLinks,
                chunkSize * 10
              );

              tools
                .sendRequestsInIntervals(pagesSlices, timeInterval)
                .subscribe((resp) => {
                  p++;
                  console.log(
                    "remaining pages to search:",
                    pageLinks.length - p
                  );
                  companyData.data = tools.handleSubDocData(resp, companyData);

                  const lastIterationSubDoc = pageLinks.length == p;
                  if (lastIterationSubDoc) {
                    console.log("done");
                    companyData.length = p;

                    companyData = tools.sortResults(
                      companyData,
                      pageLinks.length
                    );
                    tools.writeFile(fileName, companyData);
                    res.json(companyData);
                  }
                });
            }
          });
      })
      .catch((error) => {
        const response = error.response;
        if (response) {
          const status = response.status;
          const message = helpers.errorHelper(status);
          if (status) {
            res.status(status).json({ error: message, CODE: status });
          }
        }
        console.log(error);
      });
  }
});

module.exports = routes;
