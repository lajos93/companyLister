const axios = require("axios");
const tools = require("./tools");

const Company = require("../models/company");
const { toArray, mergeMap } = require("rxjs/operators");

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
        let h = 0;

        console.log(
          "approx time required:",
          tools.convertSecToRemTime(
            Math.floor((foundItemsAmount / (chunkSize * 10)) * timeInterval)
          )
        );

        tools
          .sendRequestsInIntervals(
            paginationSlices,
            pagination.length,
            timeInterval / 10
          )
          .pipe(
            toArray(),
            mergeMap((res) => {
              res.map((item) => {
                const itemData = item;
                pageLinks = tools.handleData(itemData, pageLinks);
              });

              let pagesSlices = [];
              pagesSlices = tools.sliceArrayIntoSubArrays(
                pageLinks,
                chunkSize * 10
              );

              console.log(`pagination is done, now extracting data`);
              // console.log("va;", pagination);

              let trackItems = [];

              return tools
                .sendRequestsInIntervals(
                  pagesSlices,
                  pageLinks.length,
                  timeInterval,
                  false
                )
                .pipe(
                  mergeMap((res) => {
                    const itemData = res;

                    return tools.handleSubDocData(
                      itemData,
                      pageLinks.length,
                      trackItems
                    );
                  })
                );
            }),
            toArray()
          )
          .subscribe({
            next(companyDataItemsArray) {
              companyDataLength = companyDataItemsArray.length;
              companyData = tools.sortResults(companyDataItemsArray);

              const company = new Company({
                name: request,
                data: companyData,
                length: companyDataLength,
              });

              company.save().then((result) => {
                resolve(result);
              });
            },
            error(err) {
              console.error("something wrong occurred: " + err);
            },
            complete() {
              console.log("done");
            },
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
