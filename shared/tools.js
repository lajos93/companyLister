const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { Observable } = require("rxjs");

const loadResponse = (response) => {
  return cheerio.load(response.data.toString("latin1"));
};

const loadURL = (response) => {
  return response.config.url;
};

//Format input data
const capitalizeReq = (request) => {
  return request.charAt(0).toUpperCase() + request.slice(1);
};

//Check if data already exists
const isData = (fileName) => {
  return fs.existsSync(fileName);
};

//Set filename
const setFilename = (capitalizedReq) => {
  return `./results/${capitalizedReq}.json`;
};

//read data
const readData = (fileName) => {
  return JSON.parse(fs.readFileSync(fileName));
};

//check items amount

const foundItemsAmount = (response) => {
  const $ = loadResponse(response);

  let itemsNode = $(".box").first()[0].previousSibling.nodeValue;
  const amount = parseInt(itemsNode.replace(/[^\d.-]/g, ""));

  return amount;
};

//Data extraction

//
const sliceArrayIntoSubArrays = (arr, chunkSize) => {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
};

const extractPageLinks = (response, foundItemsAmount, capitalizedReq) => {
  const $ = loadResponse(response);

  let pagination = [];

  $(".lapozas a").each(function () {
    let paginationLinks = $(this).attr("href").replace(/http/g, "https");
    pagination.push(paginationLinks);
  });

  let pagesToSearch = Math.floor(foundItemsAmount / 40);

  if (pagesToSearch > pagination.length) {
    for (let pag = pagination.length + 1; pag <= pagesToSearch; pag++) {
      let linkURL = `https://www.szakkatalogus.hu/telepules/${encodeURI(
        capitalizedReq
      )}?lap=${pag}`;
      pagination.push(linkURL);
    }
  }

  return pagination;
};

const extractURLs = (response) => {
  const $ = loadResponse(response);

  let pages = [];

  $(".box .ct a").each(function () {
    let pageLink = $(this).attr("href");

    let pageLinkEscaped = encodeURI(pageLink)
      .replace(/%C3%BB/g, "%C5%B1")
      .replace(/%C3%B5/g, "%C5%91")
      .replace(/%C3%95/g, "%C5%90")
      .replace(/%C3%9B/g, "%C5%B0");

    pages.push(`https://www.szakkatalogus.hu${pageLinkEscaped}`);
  });
  return pages;
};

const extractSubDocData = (response) => {
  const $ = loadResponse(response);
  const siteDataURL = loadURL(response);

  let currentCompanyOBJ = {};

  let name = $("h1").first().text();
  let url = null;

  $(".l").filter(function () {
    let el = $(this).next();
    let textValue = el.text();
    let hasUrl = textValue.includes(".hu");

    if (hasUrl) url = `https://${textValue}`;
  });

  currentCompanyOBJ = {
    name: name,
    siteURL: url,
    siteDataURL: siteDataURL,
  };

  return currentCompanyOBJ;
};

//Data extraction

const sortResults = (obj, dataLenght) => {
  obj.dataLength = dataLenght;
  obj.data.sort((a, b) => {
    return a.name > b.name ? 1 : -1;
  });
  obj.data.sort((a, b) => {
    if (a.siteURL === null) {
      return 1;
    } else if (b.siteURL === null) {
      return -1;
    }
  });

  return obj;
};

const processSubDocData = (pageLinks, timeInterval) => {
  let companyData = { data: [], dataLength: 0 };
  const pagelinksLength = pageLinks.length; //default: pageLinks.length

  return new Promise((resolve, reject) => {
    (function (i) {
      setTimeout(function () {
        for (let i = 0; i < pagelinksLength; i++) {
          axios
            .get(pageLinks[i], { responseType: "arraybuffer" })
            .then((resp) => {
              console.log(i);
              extractSubDocData(pageLinks[i], resp, companyData);

              //Reached the last item => display results
              if (companyData.data.length == pagelinksLength) {
                sortResults(companyData, pagelinksLength);

                console.log("Done");
                resolve(companyData);
              }
            })
            .catch((error) => {
              reject(error);
            });
        }
      }, timeInterval * 1000 * i);
    })(i);
  });
};

const getAllLinksUserBehavMimicked = (
  paginationSubArrays,
  timeInterval,
  allPaginationLinks,
  pageLinks
) => {
  //temp array to keep track of the already looped links (asynch request in a for loop)
  let indexes = [];

  return new Promise((resolve, reject) => {
    for (var i = 0; i < paginationSubArrays.length; i++) {
      (function (i) {
        setTimeout(function () {
          for (let p = 0; p < paginationSubArrays[i].length; p++) {
            axios
              .get(paginationSubArrays[i][p], {
                responseType: "arraybuffer",
              })
              .then((paginationResp) => {
                //get section values

                let updatedPageLinks = extractURLs(paginationResp);
                pageLinks = [...pageLinks, ...updatedPageLinks];

                indexes.push(p);

                //get remaining pages
                let remainingPages = allPaginationLinks - indexes.length;
                console.log(remainingPages);

                const lastIteration = indexes.length == allPaginationLinks;

                //last iteration of the "paginated pages" = all the pageLinks are extracted
                if (lastIteration) {
                  resolve(pageLinks);
                }
              })
              .catch((error) => {
                reject(error);
              });
          }
        }, timeInterval * 1000 * i);
      })(i);
    }
  });
};

const sendRequestsInIntervals = (dataChunks, timeInterval) => {
  return new Observable((observer) => {
    for (var i = 0; i < dataChunks.length; i++) {
      (function (i) {
        setTimeout(function () {
          for (let p = 0; p < dataChunks[i].length; p++) {
            getRequest(dataChunks[i][p])
              .then((result) => {
                observer.next(result);
              })
              .catch((error) => {
                observer.error(error);
              });
          }
        }, timeInterval * 1000 * i);
      })(i);
    }
  });
};

const getRequest = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        responseType: "arraybuffer",
      })
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const handleData = (response, pageLinks) => {
  //get section values

  let updatedPageLinks = extractURLs(response);
  pageLinks = [...pageLinks, ...updatedPageLinks];

  return pageLinks;
};

const handleSubDocData = (response, companyData) => {
  //get section values

  let updatedCompanyData = extractSubDocData(response);

  companyData.data = [...companyData.data, updatedCompanyData];

  return companyData.data;
};

const prepareDataForExtraction = (response, pageLinks, paginationLinks, i) => {
  //get section values

  let updatedPageLinks = extractURLs(response);
  pageLinks = [...pageLinks, ...updatedPageLinks];

  console.log(pageLinks.length, paginationLinks);

  //get remaining pages
  let remainingPages = paginationLinks - i;
  //console.log(remainingPages);

  const lastIteration = i == paginationLinks;

  //last iteration of the "paginated pages" = all the pageLinks are extracted
  if (lastIteration) {
    //console.log(pageLinks.length);
    return pageLinks;
  }
};

const writeFile = (fileName, data) => {
  fs.writeFile(fileName, JSON.stringify(data), function (err) {
    if (err) {
      console.log(err);
    }
  });
};

module.exports = {
  loadResponse: loadResponse,
  sliceArrayIntoSubArrays: sliceArrayIntoSubArrays,
  extractPageLinks: extractPageLinks,
  extractURLs: extractURLs,
  extractSubDocData: extractSubDocData,
  sortResults: sortResults,
  processSubDocData: processSubDocData,
  writeFile: writeFile,
  capitalizeReq: capitalizeReq,
  isData: isData,
  setFilename: setFilename,
  readData: readData,
  foundItemsAmount: foundItemsAmount,
  getAllLinksUserBehavMimicked: getAllLinksUserBehavMimicked,
  sendRequestsInIntervals: sendRequestsInIntervals,
  prepareDataForExtraction: prepareDataForExtraction,
  handleData: handleData,
  handleSubDocData: handleSubDocData,
};
