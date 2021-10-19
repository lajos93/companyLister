const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const express = require("express");
const routes = express.Router();

routes.get("/", (req, res, next) => {
  const fileName = "result.json";
  const isData = fs.existsSync(fileName);

  if (isData) {
    const rawData = fs.readFileSync(fileName);
    const parsedData = JSON.parse(rawData);
    res.json(parsedData);
  } else {
    mainSiteLink =
      "https://www.szakkatalogus.hu/telepules/Gy%C5%91r%C3%BAjbar%C3%A1t?lap=0";

    axios
      .get(mainSiteLink, { responseType: "arraybuffer" })
      .then(function (response) {
        //get page links
        let pagination = [];
        extractPageLinks(response, pagination);

        //define section links array
        let pageLinks = [];

        //get section URLS
        extractURLs(response, pageLinks);

        //run through the remaining pages
        for (let p = 0; p < pagination.length; p++) {
          axios
            .get(pagination[p], { responseType: "arraybuffer" })
            .then((paginationResp) => {
              //get section values
              extractURLs(paginationResp, pageLinks);

              if (pagination.length - 1 == p) {
                extractSubDocDataHandle(pageLinks).then((finalRes) => {
                  writeFile(fileName, finalRes);
                  res.json(finalRes);
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

const loadResponse = (response) => {
  return cheerio.load(response.data.toString("latin1"));
};

//Data extraction

const extractPageLinks = (response, pagination) => {
  const $ = loadResponse(response);

  $(".lapozas a").each(function () {
    let paginationLinks = $(this).attr("href").replace(/http/g, "https");
    pagination.push(paginationLinks);
  });
};

const extractURLs = (response, pageLinks) => {
  const $ = loadResponse(response);

  $(".box .ct a").each(function () {
    let pageLink = $(this).attr("href");

    let pageLinkEscaped = encodeURI(pageLink)
      .replace(/%C3%BB/g, "%C5%B1")
      .replace(/%C3%B5/g, "%C5%91");
    pageLinks.push(`https://www.szakkatalogus.hu${pageLinkEscaped}`);
  });
};

const extractSubDocData = (currentURL, response, currentCompanyOBJ) => {
  const $ = loadResponse(response);

  let name = $("h1").text();
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

const extractSubDocDataHandle = (pageLinks) => {
  let companyData = { data: [], dataLength: 0 };
  return new Promise((resolve, reject) => {
    for (let i = 0; i < pageLinks.length; i++) {
      axios
        .get(pageLinks[i], { responseType: "arraybuffer" })
        .then((resp) => {
          extractSubDocData(pageLinks[i], resp, companyData);

          //Reached the last item => display results
          if (companyData.data.length == pageLinks.length) {
            sortResults(companyData, pageLinks.length);

            console.log(companyData);
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

module.exports = routes;
