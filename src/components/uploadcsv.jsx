import React from "react";
import Papa from "papaparse";

// These are the required CSV headers
const REQUIRED_HEADERS = [
  "x",
  "y",
  "material",
  "type",
  "density_g_cm3",
  "hardness_mohs",
  "game_value",
  "blast_hole",
];

export default function UploadCSV({ setHasError }) {
  // Function to handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // ❌ If not a CSV file → show error UI
    if (!file.name.endsWith(".csv")) {
      console.error("❌ Wrong file format. Only CSV allowed.");
      setHasError(true);
      return;
    }

    // Parse CSV with PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields;

        // Check headers
        const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          console.error("❌ Missing required headers:", missing);
          setHasError(true);
          return;
        }

        // Check rows for missing values
        const invalidRows = results.data.filter(
          (row) =>
            !row.x ||
            !row.y ||
            !row.material ||
            !row.type ||
            !row.density_g_cm3 ||
            !row.hardness_mohs ||
            !row.game_value ||
            !row.blast_hole
        );

        if (invalidRows.length > 0) {
          console.error("❌ Some rows are invalid or incomplete:", invalidRows);
          setHasError(true);
          return;
        }

        // ✅ CSV is valid
        console.log("✅ Valid CSV parsed:", results.data);
        setHasError(false); // Stay in normal layout
      },
      error: (err) => {
        console.error("❌ Error parsing CSV:", err);
        setHasError(true);
      },
    });
  };

  return (
    <div className="upload-container">
      <h3>Upload Blast Scenario CSV</h3>
      <p>Need a sample? <a href="/blast_scenario_sample.csv" download>📥 Download Sample CSV</a></p>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
    </div>
  );
}
