import { readFileSync, writeFileSync } from "node:fs";

const source = "/home/ubuntu/webdev-static-assets/ss-global-tech-logo-reference.png";
const output = "/home/ubuntu/multi-company-erp-dashboard/client/src/lib/pdfLogo.ts";
const base64 = readFileSync(source).toString("base64");
writeFileSync(output, `export const officialLogoData = "data:image/png;base64,${base64}";\n`);
console.log(`Embedded official logo: ${base64.length} base64 characters`);
