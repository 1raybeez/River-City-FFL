const AUCTION_PAGE_URL =
  "https://www.fantasynerds.com/nfl/auction?budget=200&format=std&teams=12";
const AUCTION_TEST_API_URL =
  "https://api.fantasynerds.com/v1/nfl/auction?apikey=TEST&teams=12&budget=200&format=std";

type FantasyNerdsAuctionRow = {
  value: string;
  player: string;
  position: string;
  team: string;
  min: string;
  max: string;
};

function stripTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseStaticAuctionRows(html: string) {
  const text = stripTags(html);
  const tableStart = text.indexOf("VALUE PLAYER POS TEAM MIN MAX");

  if (tableStart === -1) return [];

  const tableText = text.slice(tableStart);
  const rowPattern =
    /\$(\d+)\s+([A-Za-z.'’\-\s]+?)\s+(QB|RB|WR|TE|K|DEF|DST)\s+([A-Z]{2,3})\s+\$(\d+)\s+\$(\d+)/g;
  const rows: FantasyNerdsAuctionRow[] = [];

  for (const match of tableText.matchAll(rowPattern)) {
    rows.push({
      value: `$${match[1]}`,
      player: match[2].trim(),
      position: match[3],
      team: match[4],
      min: `$${match[5]}`,
      max: `$${match[6]}`,
    });
  }

  return rows;
}

function readJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getObjectKeys(value: unknown) {
  const record = readJsonRecord(value);
  return record ? Object.keys(record) : [];
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "river-city-ffl-auction-inspection/1.0 (+read-only public data check)",
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "unknown",
    text: await response.text(),
  };
}

async function inspectStaticPage() {
  const result = await fetchText(AUCTION_PAGE_URL);
  const rows = result.ok ? parseStaticAuctionRows(result.text) : [];

  return {
    ...result,
    rows,
  };
}

async function inspectTestApi() {
  const result = await fetchText(AUCTION_TEST_API_URL);
  let parsedJson: unknown = null;

  try {
    parsedJson = JSON.parse(result.text);
  } catch {
    parsedJson = null;
  }

  const parsedRecord = readJsonRecord(parsedJson);
  const firstArrayValue = parsedRecord
    ? Object.values(parsedRecord).find((value): value is unknown[] =>
        Array.isArray(value)
      )
    : Array.isArray(parsedJson)
      ? parsedJson
      : null;
  const sampleRows = firstArrayValue?.slice(0, 5) ?? [];

  return {
    ...result,
    topLevelKeys: getObjectKeys(parsedJson),
    sampleRowKeys: sampleRows[0] ? getObjectKeys(sampleRows[0]) : [],
    sampleRows,
  };
}

function printStaticFindings(result: Awaited<ReturnType<typeof inspectStaticPage>>) {
  console.log("Static public page");
  console.log(`- URL: ${AUCTION_PAGE_URL}`);
  console.log(`- HTTP status: ${result.status}`);
  console.log(`- Content-Type: ${result.contentType}`);
  console.log(
    `- Static rows visible: ${result.rows.length > 0 ? "yes" : "no"} (${result.rows.length} parsed)`
  );
  console.log("- Fields available: value, player, position, team, min, max");
  console.log("- Sample rows:");
  result.rows.slice(0, 5).forEach((row) => {
    console.log(
      `  ${row.value} | ${row.player} | ${row.position} | ${row.team} | min ${row.min} | max ${row.max}`
    );
  });
  console.log("");
}

function printApiFindings(result: Awaited<ReturnType<typeof inspectTestApi>>) {
  console.log("Documented TEST API");
  console.log(`- URL: ${AUCTION_TEST_API_URL}`);
  console.log(`- HTTP status: ${result.status}`);
  console.log(`- Content-Type: ${result.contentType}`);
  console.log(
    `- JSON parsed: ${result.topLevelKeys.length > 0 || result.sampleRows.length > 0 ? "yes" : "no"}`
  );
  console.log(
    `- Top-level keys: ${
      result.topLevelKeys.length > 0 ? result.topLevelKeys.join(", ") : "none"
    }`
  );
  console.log(
    `- Sample row keys: ${
      result.sampleRowKeys.length > 0 ? result.sampleRowKeys.join(", ") : "none"
    }`
  );
  console.log("- Sample rows:");
  result.sampleRows.slice(0, 3).forEach((row) => {
    console.log(`  ${JSON.stringify(row)}`);
  });
  console.log("");
}

async function main() {
  console.log("FantasyNerds auction source inspection");
  console.log("No credentials, paid APIs, protected pages, or scraping bypasses.");
  console.log("");

  const [staticPageResult, testApiResult] = await Promise.all([
    inspectStaticPage(),
    inspectTestApi(),
  ]);

  printStaticFindings(staticPageResult);
  printApiFindings(testApiResult);

  console.log("Availability");
  console.log(
    "- Public HTML: accessible for a limited visible auction table on the free page."
  );
  console.log(
    "- Public endpoint: documented auction API exists, but production data requires an API key/package; TEST is sample-only."
  );
  console.log(
    "- Access boundary: no protected or paid content should be fetched without explicit permission and a reviewed API plan."
  );
  console.log("");
  console.log("Recommendation");
  console.log(
    "- Use manual CSV first. Treat FantasyNerds free HTML as inspection/reference only unless terms permit automated personal use."
  );
  console.log(
    "- For an adapter, prefer the official FantasyNerds API with a reviewed paid key and environment-managed secret, not page scraping."
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "FantasyNerds inspection failed."
  );
  process.exitCode = 1;
});
