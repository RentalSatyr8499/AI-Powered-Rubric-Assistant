const form = document.getElementById('uploadForm');
const zipInput = document.getElementById('zipInput');
const csvInput = document.getElementById('csvInput');
const tableContainer = document.getElementById('tableContainer');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');

const summaryContainer = document.getElementById('summaryContainer');
const summaryTable = document.getElementById('summaryTable');
const downloadSummaryBtn = document.getElementById('downloadSummaryBtn');

// Build the LLM prompt (currently not used with API, but wired for later)
function createLLMPrompt(className, submissionText) {
    const rubric = window.TAbot.rubric || "";
    const categories = (window.TAbot.categories || []).join(", ");

    const part1 = rubric + "\n\n";
    const part2 = "Confidence Spectrum - possible confidence scores\nVery confident: The submission clearly fits one rubric category. Evidence is strong, unambiguous, and easily supported with direct quotes.\nPretty confident: The submission mostly fits one category, but there are minor inconsistencies or weaker evidence in places.\nSomewhat unsure: The submission could reasonably fit multiple categories. Evidence supports more than one possible grade, making the choice debatable.\nUnsure: The rubric definitions don't map cleanly to the submission. Deciding requires arbitrary judgment or assumptions beyond the rubric.";
    const part3 = "You are a teaching assistant for the class " + className + ". For each rubric category above, please generate a rubric grade. A rubric grade consists of the following: the grade, the feedback, and the confidence score. It will follow this format: {Category name}: ({score}) {score label}; \"\"\"{feedback}\"\"\"; {confidence score}; {confidence comment (if applicable)}.\n\nNotes: The {feedback} field is a 80-120 word comment including at least two examples of evidence from the student submission supporting why you chose the grade that you did. Incorporate at least one verbatim quote of the student's. The {confidence score} field uses the Confidence Spectrum above to assess how confident you are that the student deserves the score. If you choose a score of “Somewhat unsure” or “Unsure”, explain why in the {confidence score comment} field.";
    const part4 = "Your task: generate a rubric grade for each of the categories in the rubric for this assignment - " + categories + " - for the student submission below.\n\nStudent submission:\n\"" + submissionText + "\"";
    
    return part1 + "\n\n" + part2 + "\n\n" + part3 + "\n\n" + part4;
}

// Create a per-student PDF from textual rubric grades
function createGradePDF(content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const lines = content.trim().split("\n");

    const headers = [];
    const gradesRow = [];
    const feedbackRow = [];

    lines.forEach(line => {
        const parts = line.split(";").map(p => p.trim());
        if (!parts[0]) return;

        const categoryAndGrade = parts[0];
        const feedback = parts[1] ? parts[1].replace(/"""/g, "") : "";

        const categoryName = categoryAndGrade.split(":")[0].trim();
        const grade = categoryAndGrade.split(":")[1]?.trim() || "";

        headers.push(categoryName);
        gradesRow.push(grade);
        feedbackRow.push(feedback);
    });

    const body = [gradesRow, feedbackRow];

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

// Grade ONE assignment and return both the PDF and an overall numeric score
function gradeIndividualAssignment(textContent, filename) {
    const className = document.getElementById('className').value.trim();
    const llmPrompt = createLLMPrompt(className, textContent);

    // TODO: call window.callLLM(llmPrompt) when you hook up the real LLM.
    // For now we use a dummy grade string + dummy overall score.
    const dummyGrade =
        "Content: (5) excellent; \"\"\"The submission demonstrates strong understanding...\"\"\"; very confident\n" +
        "Organization: (4) good; \"\"\"Ideas are mostly well structured...\"\"\"; pretty confident";
    
    const doc = createGradePDF(dummyGrade);

    // Dummy overall numeric score for the 2D array – replace with real parsing later.
    const overallScore = 95;

    return {
        pdfDoc: doc,
        score: overallScore
    };
}

// Show per-student download buttons (right pane)
function displayGrades(filesWithGrades) {
    const tableBody = document.querySelector("#uploadedFilesTable tbody");
    tableBody.innerHTML = "";

    filesWithGrades.forEach(fileObj => {
        const tr = document.createElement("tr");

        const fileTd = document.createElement("td");
        fileTd.textContent = fileObj.filename;
        tr.appendChild(fileTd);

        const gradeTd = document.createElement("td");

        if (fileObj.pdfDoc && typeof fileObj.pdfDoc.save === "function") {
            const btn = document.createElement("button");
            btn.textContent = "Download PDF";
            btn.addEventListener("click", () => {
                const pdfName = fileObj.filename.replace(/\.[^/.]+$/, "") + "_grade.pdf";
                fileObj.pdfDoc.save(pdfName);
            });
            gradeTd.appendChild(btn);
        } else {
            gradeTd.textContent = "Pending";
        }

        tr.appendChild(gradeTd);
        tableBody.appendChild(tr);
    });
}

// NEW: render 2D array (student, score) below Grade button + enable summary PDF
function displaySummaryTable(filesWithGrades) {
    const thead = summaryTable.querySelector("thead");
    const tbody = summaryTable.querySelector("tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Headers: Student, Score
    const headerRow = document.createElement("tr");
    ["Student", "Score"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Build 2D array for later PDF use
    const matrix = [];

    filesWithGrades.forEach(f => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = f.filename;
        row.appendChild(nameCell);

        const scoreCell = document.createElement("td");
        scoreCell.textContent = f.score;
        row.appendChild(scoreCell);

        tbody.appendChild(row);

        matrix.push([f.filename, String(f.score)]);
    });

    // Store matrix globally so we can use it when making the PDF
    window.TAbot.summaryMatrix = matrix;

    // Make the container + button visible
    summaryContainer.classList.add("show");
    downloadSummaryBtn.style.display = "inline-block";
}

// NEW: download the 2D array as a PDF using jsPDF + autoTable
function downloadSummaryPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const matrix = window.TAbot.summaryMatrix || [];

    doc.setFontSize(14);
    doc.text("Class Summary", 14, 20);

    doc.autoTable({
        startY: 30,
        head: [["Student", "Score"]],
        body: matrix,
        styles: { halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [3, 102, 214], textColor: 255, fontStyle: 'bold' }
    });

    doc.save("class_summary.pdf");
}

downloadSummaryBtn.addEventListener("click", downloadSummaryPDF);

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

        await Promise.all(
            Object.keys(zip.files).map(async (relativePath) => {
                if (relativePath.toLowerCase().endsWith(".txt")) {
                    try {
                        const content = await zip.files[relativePath].async("string");
                        const result = gradeIndividualAssignment(content, relativePath);

                        filesWithGrades.push({
                            filename: relativePath,
                            pdfDoc: result.pdfDoc,
                            score: result.score
                        });
                    } catch (err) {
                        console.error("Error reading file:", relativePath, err);
                    }
                }
            })
        );

        displayGrades(filesWithGrades);
        displaySummaryTable(filesWithGrades);  // <- 2D array under Grade button
    } catch (err) {
        console.error("Error processing ZIP file:", err);
        alert("Failed to process ZIP file: " + err.message);
    }
}
