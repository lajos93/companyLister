const express = require("express");
const mongoose = require("mongoose");
const db = require("./db/db");
const error = require("./shared/error");

const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const data = require("./routes/data");
app.use("/search/", data);

/* //error handling
app.use((req, res, next) => {
  next(error.notFound());
});

app.use((err, req, res, next) => {
  const resp = error.response(err);
  res.status(resp.error.status).json(resp);
}); */

const port = 3001;

mongoose
  .connect(db)
  .then((result) => {
    console.log(`App listening at http://localhost:${port}`);
    app.listen(port);
  })
  .catch((error) => {
    console.log(error);
  });
