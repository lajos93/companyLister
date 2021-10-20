const express = require("express");
const app = express();
const data = require("./routes/data");
const test = require("./routes/test");

app.use(express.json());
app.use("/search/", data);
app.use("/test/", test);
const port = 3001;
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
