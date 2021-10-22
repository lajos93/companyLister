const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const loadResponse = (response) => {
  return cheerio.load(response.data.toString("latin1"));
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

const extractSubDocData = (currentURL, response, currentCompanyOBJ) => {
  const $ = loadResponse(response);

  let name = $("h1").first().text();
  let url = null;

  $(".l").filter(function () {
    let el = $(this).next();
    let textValue = el.text();
    let hasUrl = textValue.includes(".hu");

    if (hasUrl) url = `https://${textValue}`;
  });

  currentCompanyOBJ.data.push({
    name: name,
    siteURL: url,
    siteDataURL: currentURL,
  });
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

const processSubDocData = (pageLinks) => {
  let companyData = { data: [], dataLength: 0 };
  const limitResults = pageLinks.length; //default: pageLinks.length
  return new Promise((resolve, reject) => {
    for (let i = 0; i < limitResults; i++) {
      axios
        .get(pageLinks[i], { responseType: "arraybuffer" })
        .then((resp) => {
          console.log(i);
          extractSubDocData(pageLinks[i], resp, companyData);

          //Reached the last item => display results
          if (companyData.data.length == limitResults) {
            sortResults(companyData, limitResults);

            console.log("Done");
            resolve(companyData);
          }
        })
        .catch((error) => {
          reject(error);
        });
    }
  });
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
};
