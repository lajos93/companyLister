const axios = require("axios");
const tools = require("./tools");

const Company = require("../models/company");

//data.js

const fetchData = (request) => {
  mainSiteLink = `https://www.szakkatalogus.hu/telepules/${encodeURI(
    request
  )}?lap=0`;

  return new Promise((resolve, reject) => {
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
          request
        );

        let pageLinks = [];

        //if results are less than one page, fetch the data starting in tools.sendRequestsInIntervals()....
        if (pagination.length < 1) {
          pagination = [tools.loadURL(response)];
        } else {
          //else load the first page's data then continue fetching the rest
          pageLinks = tools.extractURLs(response);
        }

        const chunkSize = 4;

        let paginationSlices = [];
        paginationSlices = tools.sliceArrayIntoSubArrays(pagination, chunkSize);

        let companyData = { data: [], length: 0 };

        //intervals between each iteration in sec, set a number that grows in proportion to the amount of requests sent
        //this amount can be divided by 10 to have it run faster in the beginning
        let timeInterval = Math.floor(foundItemsAmount / 120);

        let i = 0;
        let p = 0;

        console.log(
          "approx time required:",
          tools.convertSecToRemTime(
            Math.floor((foundItemsAmount / (chunkSize * 10)) * timeInterval)
          )
        );

        //get all links by mimicking user behaviour ( only send requests within a given timeinterval )
        tools
          .sendRequestsInIntervals(paginationSlices, timeInterval / 10)
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

                    const company = new Company({
                      name: request,
                      data: companyData.data,
                      length: companyData.length,
                    });

                    company.save().then((result) => {
                      resolve(result);
                    });
                  }
                });
            }
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  fetchData: fetchData,
};
