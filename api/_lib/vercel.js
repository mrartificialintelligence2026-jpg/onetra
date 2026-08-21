import { createRouter } from "./router.js";
import { nodeToWebRequest, readNodeBody, sendNode } from "./http.js";

const route = createRouter();

export default async function handler(req, res) {
  const body = await readNodeBody(req);
  const request = nodeToWebRequest(req, body);
  const result = await route(request);
  sendNode(res, result);
}
