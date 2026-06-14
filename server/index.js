import express from "express";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  accountsRouter,
  appsRouter,
  productsRouter,
  xcodeCloudRouter,
  pricingRouter,
  screenshotsRouter,
} from "./routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const unitServerDir = join(__dirname, "../../server");

const app = express();

app.use(express.json());

app.use("/api/accounts", accountsRouter);
app.use("/api/apps", appsRouter);
app.use("/api/apps", productsRouter);
app.use("/api/apps", pricingRouter);
app.use("/api/apps", xcodeCloudRouter);
app.use("/api/apps", screenshotsRouter);

if (existsSync(join(unitServerDir, "routes/sales.js"))) {
  const { default: salesRouter } = await import(
    join(unitServerDir, "routes/sales.js")
  );
  const { default: accountVendorRouter } = await import(
    join(unitServerDir, "routes/account-vendor.js")
  );
  app.use("/api/apps", salesRouter);
  app.use("/api/accounts", accountVendorRouter);
  console.log("Unit sales routes mounted");
}

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`ASC proxy server running on http://localhost:${PORT}`);
});
