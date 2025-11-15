const form = document.getElementById('uploadForm');
const zipInput = document.getElementById('zipInput');

// Build the LLM prompt using the global rubric
function createLLMPrompt(className, submissionText) {
    const rubric = window.TAbot.rubric || "";

    const confidenceSpectrum = `
Confidence Spectrum - possible confidence scores
Very confident: The submission clearly fits one rubric category. Evidence is strong, unambiguous, and easily supported with direct quotes.
Pretty confident: The submission mostly fits one category, but there are minor inconsistencies or weaker evidence in places.
Somewhat unsure: The submission could reasonably fit multiple categories. Evidence supports more than one possible grade, making the choice debatable.
Unsure: The rubric definitions don't map cleanly to the submission. Deciding requires arbitrary judgment or assumptions beyond the rubric.
`.trim();

    const instructions = `
You are a teaching assistant for the class "${className}". The rubric for this assignment is:

${rubric}

${confidenceSpectrum}

For each rubric category above, generate a rubric grade. A rubric grade consists of:
- The grade with numeric score and short label
- An 80–120 word feedback comment including at least two pieces of evidence from the student submission (with at least one short verbatim quote)
- A confidence rating using the Confidence Spectrum
- An optional confidence comment if you are "Somewhat unsure" or "Unsure"

Output format (one line per category):
{Category name}: ({score}) {score label}; """{feedback}"""; {confidence score}; {confidence comment (if applicable)}

Example line:
Category 1: (5) good; """The submission demonstrates strong historical knowledge..."""; very confident
`.trim();

    const task = `
Your task: Using the rubric and instructions above, generate a rubric grade for each category for the following student submission:

"${submissionText}"
`.trim();

    return `${instructions}\n\n${task}`;
}

// Turn the LLM's graded text into a PDF jsPDF object
function createGradePDF(content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const lines = content.trim().split("\n").filter(l => l.trim().length > 0);

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

    const body = [
        gradesRow,
        feedbackRow
    ];

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

// === THIS IS NOW ASYNC AND USES callLLM ===
async function gradeIndividualAssignment(textContent) {
    const className = document.getElementById('className').value.trim() || "Unnamed Class";
    const llmPrompt = createLLMPrompt(className, textContent);

    // Call Hugging Face LLM
    const llmOutput = await window.callLLM(llmPrompt);

    // Build a PDF from LLM output
    return createGradePDF(llmOutput);
}

function displayGrades(filesWithGrades) {
    const tableBody = document.querySelector("#uploadedFilesTable tbody");
    tableBody.innerHTML = "";

    filesWithGrades.forEach(fileObj => {
        const tr = document.createElement("tr");

        const fileTd = document.createElement("td");
        fileTd.textContent = fileObj.filename;
        tr.appendChild(fileTd);

        const gradeTd = document.createElement("td");

        if (fileObj.grade && typeof fileObj.grade.save === "function") {
            const btn = document.createElement("button");
            btn.textContent = "Download PDF";
            btn.addEventListener("click", () => {
                const pdfName = fileObj.filename.replace(/\.[^/.]+$/, "") + "_grade.pdf";
                fileObj.grade.save(pdfName);
            });
            gradeTd.appendChild(btn);
        } else {
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
        await Promise.all(
            Object.keys(zip.files).map(async (relativePath) => {
                if (relativePath.toLowerCase().endsWith(".txt")) {
                    try {
                        const content = await zip.files[relativePath].async("string");
                        const gradeDoc = await gradeIndividualAssignment(content);
                        filesWithGrades.push({
                            filename: relativePath,
                            grade: gradeDoc
                        });
                    } catch (err) {
                        console.error("Error reading/grading file:", relativePath, err);
                    }
                }
            })
        );

        displayGrades(filesWithGrades);
    } catch (err) {
        console.error("Error processing ZIP file:", err);
        alert("Failed to process ZIP file: " + err.message);
    }
}
