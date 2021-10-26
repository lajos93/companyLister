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
  let keyWords = [];

  $(".l").filter(function () {
    let elLabel = $(this);
    let elData = elLabel.next();

    let labelValue = elLabel.text();
    let textValue = elData.text();

    let haskeyWords = labelValue.includes("Kulcsszavak");
    let hasUrl = labelValue.includes("Honlap");

    if (haskeyWords) keyWords = textValue.split(/[ ,]+/);
    if (hasUrl) url = `https://${textValue}`;
  });

  currentCompanyOBJ = {
    name: name,
    siteURL: url,
    keyWords: keyWords,
    siteDataURL: siteDataURL,
  };

  return currentCompanyOBJ;
};

//Data extraction

const sortResults = (obj, dataLenght) => {
  obj.length = dataLenght;
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

const writeFile = (fileName, data) => {
  fs.writeFile(fileName, JSON.stringify(data), function (err) {
    if (err) {
      console.log(err);
    }
  });
};

//Aesthetics

const convertSecToRemTime = (sec) => {
  let hours = Math.floor(sec / 3600); // get hours
  let minutes = Math.floor((sec - hours * 3600) / 60); // get minutes
  let seconds = sec - hours * 3600 - minutes * 60; //  get seconds
  // add 0 if value < 10; Example: 2 => 02
  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds; // Return is HH : MM : SS
};

module.exports = {
  loadResponse: loadResponse,
  loadURL: loadURL,
  sliceArrayIntoSubArrays: sliceArrayIntoSubArrays,
  extractPageLinks: extractPageLinks,
  extractURLs: extractURLs,
  extractSubDocData: extractSubDocData,
  sortResults: sortResults,
  writeFile: writeFile,
  capitalizeReq: capitalizeReq,
  isData: isData,
  setFilename: setFilename,
  readData: readData,
  foundItemsAmount: foundItemsAmount,
  sendRequestsInIntervals: sendRequestsInIntervals,
  handleData: handleData,
  handleSubDocData: handleSubDocData,
  convertSecToRemTime: convertSecToRemTime,
};
