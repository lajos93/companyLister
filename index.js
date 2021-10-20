const express = require("express");
const app = express();
const data = require("./routes/data");

app.use(express.json());
app.use("/search/", data);
const port = 3001;
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
