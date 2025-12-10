const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Helper to parse .env.local manually since we don't have dotenv
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf8");
    const env = {};
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value;
      }
    });
    return env;
  } catch (e) {
    console.error("Error loading .env.local", e);
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  return data;
}

function parseCSVLine(line) {
  const values = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue.trim());
  return values;
}

async function importData() {
  const csvPath = path.resolve(
    process.cwd(),
    "Student Admission Plan Nov 2023.csv"
  );
  console.log(`Reading CSV from ${csvPath}...`);

  try {
    const content = fs.readFileSync(csvPath, "utf8");
    const records = parseCSV(content);

    console.log(`Parsed ${records.length} records.`);
    console.log("Sample record:", records[0]);

    // Map CSV columns to DB columns
    // CSV: "CURR_ID","CURR_NAME","CURR_NAME_EN","UNIV_NAME_TH","LEV_NAME_TH","TOTAL_PLAN"
    // DB: curriculum_id, curriculum_name_th, curriculum_name_en, university_name_th, level_name_th, total_plan

    const dbRecords = records.map((r) => ({
      curriculum_id: r["CURR_ID"],
      curriculum_name_th: r["CURR_NAME"],
      curriculum_name_en: r["CURR_NAME_EN"],
      university_name_th: r["UNIV_NAME_TH"],
      level_name_th: r["LEV_NAME_TH"],
      total_plan: parseInt(r["TOTAL_PLAN"]?.replace(/,/g, "") || "0", 10),
    }));

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < dbRecords.length; i += BATCH_SIZE) {
      const batch = dbRecords.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("thailand_admission_plans")
        .insert(batch);

      if (error) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      } else {
        console.log(
          `Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} records)`
        );
      }
    }

    console.log("Import completed!");
  } catch (e) {
    console.error("Import failed:", e);
  }
}

importData();
