import { createMemoryDb } from "../api/_lib/db.js";
import { createRouter } from "../api/_lib/router.js";
import { nodeToWebRequest, readNodeBody, sendNode } from "../api/_lib/http.js";

const PREFIXES = ["/api/auth", "/api/ledger", "/api/admin"];

export function ledgerPlugin(options = {}) {
  const db = options.db || createMemoryDb();
  const verify = options.verify;
  const route = createRouter({ db, verify });

  async function handle(req, res) {
    const url = req.url.split("?")[0];
    if (!PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))) return false;
    const body = await readNodeBody(req);
    const request = nodeToWebRequest(req, body);
    const result = await route(request);
    sendNode(res, result);
    return true;
  }

  return {
    name: "onetra-ledger",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (await handle(req, res)) return;
        } catch (error) {
          next(error);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (await handle(req, res)) return;
        } catch (error) {
          next(error);
          return;
        }
        next();
      });
    },
  };
}
