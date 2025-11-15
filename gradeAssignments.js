const form = document.getElementById('uploadForm');
const zipInput = document.getElementById('zipInput');
const csvInput = document.getElementById('csvInput');
const tableContainer = document.getElementById('tableContainer');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');

function createLLMPrompt(className, submissionText) {
    var rubric = window.TAbot.rubric;
    var categories = window.TAbot.categories.join(", ");

    var part1 = rubric + "\n\n";
    var part2 = "Confidence Spectrum - possible confidence scores\nVery confident: The submission clearly fits one rubric category. Evidence is strong, unambiguous, and easily supported with direct quotes.\nPretty confident: The submission mostly fits one category, but there are minor inconsistencies or weaker evidence in places.\nSomewhat unsure: The submission could reasonably fit multiple categories. Evidence supports more than one possible grade, making the choice debatable.\nUnsure: The rubric definitions don't map cleanly to the submission. Deciding requires arbitrary judgment or assumptions beyond the rubric.";
    var part3 = "You are a teaching assistant for the class " + className + ". For each rubric category above, please generate a rubric grade. A rubric grade consists of the following: the grade, the feedback, and the confidence score. It will follow this format: {Category name}: ({score}) {score label}; \"\"\"\{feedback\}\"\"\"; {confidence score}; {confidence comment (if applicable)}. For example:\n\nCategory 1: (5) good; \"\"\"The submission demonstrates strong historical knowledge and clear analysis. For instance, the student notes that 'Lorem Ipsum is not simply random text' and correctly identifies its origin in Cicero’s 'de Finibus Bonorum et Malorum.' These details show accurate recall and contextualization.\"\"\"; very confident\nCategory 3: (1) bad; \"\"\"The submission does not adequately address the ethical implications of the text. Although the student references 'a treatise on the theory of ethics,' they fail to analyze its significance or connect it to the assignment's focus. The discussion remains superficial.\"\"\"; somewhat unsure; The rubric definition of “bad” is broad, and parts of the essay could arguably fit “ok.”\n\nNotes: The {feedback} field is a 80-120 word comment including at least two examples of evidence from the student submission supporting why you chose the grade that you did. Incorporate at least one verbatim quote of the student's. The {confidence score} field uses the Confidence Spectrum above to assess how confident you are that the student deserves the score. If you choose a score of “Somewhat unsure” or “Unsure”, explain why in the {confidence score comment} field."
    var part4 = "Your task: generate a rubric grade for each of the categories in the rubric for this assignment - " + categories + " - for the student submission below.\n\nStudent submission:\n\"%s\"" + submissionText + "\"";
    
    return part1 + part2 + part3 + part4;
}

function createGradePDF(content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Split into lines (each line = one rubric category entry)
    const lines = content.trim().split("\n");

    // Arrays for table headers and rows
    const headers = [];
    const gradesRow = [];
    const feedbackRow = [];

    lines.forEach(line => {
        // Example line format:
        // Category1: (5) good; """Feedback text..."""; ignore; optional; 0.87; "comment text"
        const parts = line.split(";").map(p => p.trim());

        // First part contains category and grade
        const categoryAndGrade = parts[0];
        const feedback = parts[1] ? parts[1].replace(/"""/g, "") : "";

        // Extract category name before colon
        const categoryName = categoryAndGrade.split(":")[0].trim();
        const grade = categoryAndGrade.split(":")[1]?.trim() || "";

        headers.push(categoryName);
        gradesRow.push(grade);
        feedbackRow.push(feedback);

        // --- New logic for confidence + comment ---
        const confidence = parts[parts.length - 2] || "";
        const comment = parts[parts.length - 1] || "";

        // Build an object for this rubric category
        const scoreObj = {
            category: categoryName,
            grade,
            feedback,
            confidence,
            comment
        };

        // Push into the current submission’s confidence scores
        // (one array per submission)
        if (!window.TAbot.confidenceScores[window.TAbot.confidenceScores.length - 1]) {
            window.TAbot.confidenceScores.push([]);
        }
        window.TAbot.confidenceScores[window.TAbot.confidenceScores.length - 1].push(scoreObj);
    });

    // Build table data: 3 rows (Grade, Feedback, placeholders ignored)
    const body = [
        gradesRow,
        feedbackRow
    ];

    // Use autoTable for pretty formatting
    doc.setFontSize(14);
    doc.text("Assignment Grades", 14, 20);

    doc.autoTable({
        startY: 30,
        head: [headers],
        body: body,
        styles: { halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fillColor: [240, 240, 240] },
        alternateRowStyles: { fillColor: [255, 255, 255] }
    });

    return doc;
}

async function gradeSubmission(textContent) {
  const className = document.getElementById('className').value.trim();
  const llmPrompt = createLLMPrompt(className, textContent);

  try {
    // Call your Netlify function (not Hugging Face directly)
    const response = await fetch("/.netlify/functions/callLLM", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: llmPrompt })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP Error: ${response.status}`);
    }

    const LLMresponse = data.text || "";

    // Generate PDF from the model output
    const pdfDoc = createGradePDF(LLMresponse);
    return pdfDoc;
  } catch (error) {
    console.error("Failed (gradeSubmission):", error.message);
    alert("Error: " + error.message);
    return null;
  }
}



function displayGrades(filesWithGrades) {
    const tableBody = document.querySelector("#uploadedFilesTable tbody");
    tableBody.innerHTML = ""; // clear any existing rows

    filesWithGrades.forEach(fileObj => {
        const tr = document.createElement("tr");

        // Filename column
        const fileTd = document.createElement("td");
        fileTd.textContent = fileObj.filename;
        tr.appendChild(fileTd);

        // Grade column
        const gradeTd = document.createElement("td");

        if (fileObj.grade && typeof fileObj.grade.save === "function") {
            // If grade is a jsPDF object, show a download button
            const btn = document.createElement("button");
            btn.textContent = "Download PDF";
            btn.addEventListener("click", () => {
                // Use the filename to make the PDF name unique
                const pdfName = fileObj.filename.replace(/\.[^/.]+$/, "") + "_grade.pdf";
                fileObj.grade.save(pdfName);
            });
            gradeTd.appendChild(btn);
        } else {
            // Otherwise show placeholder text
            gradeTd.textContent = "Pending";
        }

        tr.appendChild(gradeTd);

        tableBody.appendChild(tr);
    });
}

async function gradeAssignments() {
    const zipFile = zipInput.files[0];
    if (!zipFile) {
        alert("Please upload a .zip file of student submissions.");
        return;
    }
    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
        alert("Selected file is not a .zip.");
        return;
    }

    try {
        const zipData = await zipFile.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);

        const filesWithGrades = [];

        // Iterate through files in the zip
        await Promise.all(Object.keys(zip.files).map(async (relativePath) => {
            if (relativePath.toLowerCase().endsWith(".txt")) {
                try {
                    const content = await zip.files[relativePath].async("string");

                    // gradeSubmissions returns a Promise, so await it
                    const gradeResult = await gradeSubmission(content);

                    filesWithGrades.push({
                        filename: relativePath,
                        grade: gradeResult   // now this is the resolved value
                    });
                } catch (err) {
                    console.error("Error reading file:", relativePath, err);
                }
            }
        }));

        // Display results
        displayGrades(filesWithGrades);

    } catch (err) {
        console.error("Error processing ZIP file:", err);
        alert("Failed to process ZIP file: " + err.message);
    }
}
