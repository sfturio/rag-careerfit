const path = require("path");
const express = require("express");
const { router } = require("./routes");
const { errorHandler } = require("./middlewares/error-handler");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(router);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(errorHandler);

module.exports = { app };
