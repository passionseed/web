import { duplicateKey, parseKind, parsePipelinePaste, splitCsvLine, splitDuplicates } from "../pipeline-paste";

describe("parsePipelinePaste", () => {
  it("reads tab-separated rows with a header in any order", () => {
    const text = "Name\tKind\tOrganisation\tWhy fit\tReach\nAcme Fund\tsponsor\tAcme\tGreen budget\tacme.example\n";
    const r = parsePipelinePaste(text, "partner");
    expect(r.hadHeader).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      {
        line: 2,
        input: expect.objectContaining({
          kind: "sponsor",
          name: "Acme Fund",
          organisation: "Acme",
          why_fit: "Green budget",
          reach: "acme.example",
          stage: "to_contact",
        }),
      },
    ]);
  });

  it("reads positional rows without a header, kind column first", () => {
    const r = parsePipelinePaste("speaker\tDr A\tUni X\tWater research\tfacebook.com/x", "sponsor");
    expect(r.hadHeader).toBe(false);
    expect(r.rows[0].input).toMatchObject({ kind: "speaker", name: "Dr A", organisation: "Uni X", why_fit: "Water research" });
  });

  it("uses the active tab when the kind is empty", () => {
    const r = parsePipelinePaste("\tLeft empty\tOrg\nsponsor\tGiven\tOrg 3", "partner");
    expect(r.rows.map((x) => [x.input.kind, x.input.name, x.input.organisation])).toEqual([
      ["partner", "Left empty", "Org"],
      ["sponsor", "Given", "Org 3"],
    ]);
  });

  it("uses the active tab when the whole paste has no kind column", () => {
    const r = parsePipelinePaste("No kind column\tOrg 2\tbecause\tig.com/x\nSecond\tOrg 3", "partner");
    expect(r.rows.map((x) => [x.input.kind, x.input.name, x.input.organisation])).toEqual([
      ["partner", "No kind column", "Org 2"],
      ["partner", "Second", "Org 3"],
    ]);
    expect(r.rows[0].input.reach).toBe("ig.com/x");
  });

  it("reports an unknown kind without a header instead of shifting the columns", () => {
    const r = parsePipelinePaste("vendor\tAcme\tAcme Co\tgood fit\thttps://acme.example", "sponsor");
    expect(r.rows).toEqual([]);
    expect(r.errors).toEqual([{ line: 1, message: expect.stringMatching(/"vendor" is not a kind/) }]);
  });

  it("reads every row of one paste the same way", () => {
    const r = parsePipelinePaste("sponsor\tA\tOrg A\nspeeker\tB\tOrg B\nspeaker\tC\tOrg C", "partner");
    expect(r.rows.map((x) => [x.input.kind, x.input.name])).toEqual([
      ["sponsor", "A"],
      ["speaker", "C"],
    ]);
    expect(r.errors.map((e) => e.line)).toEqual([2]);
  });

  it("keeps a quoted cell with a line break in one row (spreadsheet copy)", () => {
    const tsv = 'sponsor\tAcme\tAcme Co\t"Green budget\nand a ""youth"" fund"\tacme.example\nsponsor\tNext\tOrg';
    const r = parsePipelinePaste(tsv, "partner");
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.line)).toEqual([1, 3]);
    expect(r.rows[0].input).toMatchObject({ why_fit: 'Green budget\nand a "youth" fund', reach: "acme.example" });

    const csv = 'name,why_fit\r\n"Multi","line one\r\nline two"\r\nPlain,x';
    const c = parsePipelinePaste(csv, "speaker");
    expect(c.rows.map((x) => [x.line, x.input.name, x.input.why_fit])).toEqual([
      [2, "Multi", "line one\nline two"],
      [4, "Plain", "x"],
    ]);
  });

  it("keeps a lone quote as text", () => {
    const r = parsePipelinePaste('"Quoted start\tOrg\nNext\tOrg 2', "sponsor");
    expect(r.rows.map((x) => x.input.name)).toEqual(['"Quoted start', "Next"]);
  });

  it("reads comma-separated rows with quoted commas", () => {
    const r = parsePipelinePaste('kind,name,organisation\nPartners,"Green, Co",Green Co Ltd\n', "sponsor");
    expect(r.rows[0].input).toMatchObject({ kind: "partner", name: "Green, Co", organisation: "Green Co Ltd" });
  });

  it("skips blank lines and reports bad rows with their line numbers", () => {
    const r = parsePipelinePaste("kind,name,reach\n\nsponsor,,x\nvendor,Bad Kind,x\nsponsor,Good,good.example", "sponsor");
    expect(r.rows.map((x) => x.input.name)).toEqual(["Good"]);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4]);
    expect(r.errors[1].message).toMatch(/not a kind/);
  });

  it("blanks a phone number in any column and warns about it", () => {
    const r = parsePipelinePaste(
      "kind,name,organisation,why_fit,reach\nsponsor,Acme,Acme Co,call 081 234 5678,081-234-5678\nsponsor,Clean,Org,fit,acme.example",
      "sponsor",
    );
    expect(r.errors).toEqual([]);
    expect(r.rows[0].input).toMatchObject({ name: "Acme", organisation: "Acme Co", why_fit: null, reach: null });
    expect(r.rows[1].input.reach).toBe("acme.example");
    expect(r.warnings).toEqual([{ line: 2, message: expect.stringMatching(/2 phone numbers were removed/) }]);
  });

  it("drops a row whose only name was a phone number", () => {
    const r = parsePipelinePaste("sponsor\t0812345678\tOrg", "sponsor");
    expect(r.rows).toEqual([]);
    expect(r.errors[0].message).toMatch(/Name is required/);
    expect(r.warnings[0].message).toMatch(/A phone number was removed/);
  });

  it("reads Thai headers and Thai kinds", () => {
    const text =
      "ประเภท\tชื่อ\tองค์กร\tเหตุผล\tช่องทาง\n" +
      "สปอนเซอร์\tคุณเอ\tบริษัทเอ\tงบ CSR\tfacebook.com/a\n" +
      "ผู้สนับสนุน\tB\tOrg B\t\t\n" +
      "พาร์ทเนอร์\tC\t\t\t\n" +
      "พันธมิตร\tD\t\t\t\n" +
      "วิทยากร\tE\t\t\t\n" +
      "ผู้พูด\tF\t\t\t\n" +
      "speaker\tG\t\t\t";
    const r = parsePipelinePaste(text, "partner");
    expect(r.hadHeader).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => [x.input.kind, x.input.name])).toEqual([
      ["sponsor", "คุณเอ"],
      ["sponsor", "B"],
      ["partner", "C"],
      ["partner", "D"],
      ["speaker", "E"],
      ["speaker", "F"],
      ["speaker", "G"],
    ]);
    expect(r.rows[0].input).toMatchObject({ organisation: "บริษัทเอ", why_fit: "งบ CSR", reach: "facebook.com/a" });
  });

  it("reads the other Thai header words", () => {
    for (const [org, why, reach] of [
      ["บริษัท", "ทำไม", "ลิงก์"],
      ["หน่วยงาน", "เหตุผล", "ติดต่อ"],
    ]) {
      const r = parsePipelinePaste(`ชื่อ,${org},${why},${reach}\nA,Org,fit,x.example`, "sponsor");
      expect(r.rows[0].input).toMatchObject({ name: "A", organisation: "Org", why_fit: "fit", reach: "x.example" });
    }
  });

  it("finds a Thai header with no name column and uses the organisation as the name", () => {
    const r = parsePipelinePaste("บริษัท\tเหตุผล\tช่องทาง\nบริษัทเอ\tงบ CSR\tfacebook.com/a", "sponsor");
    expect(r.hadHeader).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].input).toMatchObject({ name: "บริษัทเอ", organisation: null, why_fit: "งบ CSR", reach: "facebook.com/a" });
  });

  it("reads longer Thai name headers and mixed ones like Name / ชื่อ", () => {
    for (const head of ["ชื่อสปอนเซอร์", "ชื่อวิทยากร", "Name / ชื่อ", "ชื่อ (Name)"]) {
      const r = parsePipelinePaste(`${head},องค์กร\nA,Org`, "sponsor");
      expect(r.hadHeader).toBe(true);
      expect(r.rows.map((x) => x.input)).toEqual([expect.objectContaining({ name: "A", organisation: "Org" })]);
    }
    const company = parsePipelinePaste("ชื่อบริษัท,เหตุผล\nAcme,fit", "sponsor");
    expect(company.rows[0].input).toMatchObject({ name: "Acme", why_fit: "fit" });
  });

  it("keeps a public page whose id is a long number", () => {
    const r = parsePipelinePaste("ชื่อ\tช่องทาง\nA\thttps://www.facebook.com/profile.php?id=100064123456789", "sponsor");
    expect(r.warnings).toEqual([]);
    expect(r.rows[0].input.reach).toBe("https://www.facebook.com/profile.php?id=100064123456789");
  });

  it("returns nothing for empty text", () => {
    expect(parsePipelinePaste("  \n \n", "sponsor")).toEqual({ rows: [], errors: [], warnings: [], hadHeader: false });
  });

  it("handles Windows line endings", () => {
    expect(parsePipelinePaste("A\tB\r\nC\tD\r\n", "speaker").rows.map((r) => r.input.name)).toEqual(["A", "C"]);
  });
});

describe("helpers", () => {
  it("parseKind accepts plurals and case", () => {
    expect(parseKind(" Sponsors ")).toBe("sponsor");
    expect(parseKind("SPEAKER")).toBe("speaker");
    expect(parseKind("vendor")).toBeNull();
  });

  it("parseKind reads Thai kinds", () => {
    expect(parseKind("สปอนเซอร์")).toBe("sponsor");
    expect(parseKind(" วิทยากร ")).toBe("speaker");
    expect(parseKind("พันธมิตร")).toBe("partner");
  });

  it("splitCsvLine keeps escaped quotes", () => {
    expect(splitCsvLine('a,"b ""c"", d",e')).toEqual(["a", 'b "c", d', "e"]);
  });
});

describe("splitDuplicates", () => {
  const existing = [
    { name: "Acme", kind: "sponsor" as const },
    { name: "Dr A", kind: "speaker" as const },
  ];

  it("skips rows already on the board, by trimmed lower-case name and kind", () => {
    const rows = [
      { name: " ACME ", kind: "sponsor" as const },
      { name: "Acme", kind: "partner" as const },
      { name: "New Co", kind: "sponsor" as const },
    ];
    const { fresh, duplicates } = splitDuplicates(rows, existing);
    expect(fresh.map((r) => [r.name, r.kind])).toEqual([
      ["Acme", "partner"],
      ["New Co", "sponsor"],
    ]);
    expect(duplicates).toHaveLength(1);
  });

  it("skips repeats inside the paste itself, keeping the first", () => {
    const { fresh, duplicates } = splitDuplicates(
      [
        { name: "Same", kind: "sponsor" as const, n: 1 },
        { name: "same ", kind: "sponsor" as const, n: 2 },
      ],
      [],
    );
    expect(fresh.map((r) => r.n)).toEqual([1]);
    expect(duplicates.map((r) => r.n)).toEqual([2]);
  });

  it("matches on the same key everywhere", () => {
    expect(duplicateKey({ name: " A ", kind: "sponsor" })).toBe(duplicateKey({ name: "a", kind: "sponsor" }));
    expect(duplicateKey({ name: "a", kind: "partner" })).not.toBe(duplicateKey({ name: "a", kind: "sponsor" }));
  });
});
