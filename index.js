if (!process.env.FUNCTION_TARGET) {
  process.env.FUNCTION_TARGET = "api";
}

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { app } = require("./server/index");

exports.api = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true
  },
  (req, res) => {
    logger.info("Request recibida", { path: req.path, method: req.method });
    return app(req, res);
  }
);
