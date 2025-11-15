const form = document.getElementById('uploadForm');
const zipInput = document.getElementById('zipInput');


function createLLMPrompt(className, submissionText) {
    var rubric = window.TAbot.rubric;
    var categories = getRubricCategories(csvData);

    var part1 = rubric + "\n\n";
    var part2 = "Confidence Spectrum - possible confidence scores\nVery confident: The submission clearly fits one rubric category. Evidence is strong, unambiguous, and easily supported with direct quotes.\nPretty confident: The submission mostly fits one category, but there are minor inconsistencies or weaker evidence in places.\nSomewhat unsure: The submission could reasonably fit multiple categories. Evidence supports more than one possible grade, making the choice debatable.\nUnsure: The rubric definitions don't map cleanly to the submission. Deciding requires arbitrary judgment or assumptions beyond the rubric.";
    var part3 = String.format("You are a teaching assistant for the class %s. For each rubric category above, please generate a rubric grade. A rubric grade consists of the following: the grade, the feedback, and the confidence score. It will follow this format: {Category name}: ({score}) {score label}; \"\"\"\{feedback\}\"\"\"; {confidence score}; {confidence comment (if applicable)}. For example:\n\nCategory 1: (5) good; \"\"\"The submission demonstrates strong historical knowledge and clear analysis. For instance, the student notes that 'Lorem Ipsum is not simply random text' and correctly identifies its origin in Cicero’s 'de Finibus Bonorum et Malorum.' These details show accurate recall and contextualization.\"\"\"; very confident\nCategory 3: (1) bad; \"\"\"The submission does not adequately address the ethical implications of the text. Although the student references 'a treatise on the theory of ethics,' they fail to analyze its significance or connect it to the assignment's focus. The discussion remains superficial.\"\"\"; somewhat unsure; The rubric definition of “bad” is broad, and parts of the essay could arguably fit “ok.”\n\nNotes: The {feedback} field is a 80-120 word comment including at least two examples of evidence from the student submission supporting why you chose the grade that you did. Incorporate at least one verbatim quote of the student's. The {confidence score} field uses the Confidence Spectrum above to assess how confident you are that the student deserves the score. If you choose a score of “Somewhat unsure” or “Unsure”, explain why in the {confidence score comment} field.", className);
    var part4 = String.format("Your task: generate a rubric grade for each of the categories in the rubric for this assignment - %s - for the student submission below.\n\nStudent submission:\n\"%s\"", categories, submissionText);
    
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
        // Category1: (5) good; """Feedback text..."""; ignore; optional
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

function gradeIndividualAssignment(textContent) {
    // Step 1: create LLM Prompt
    const className = document.getElementById('className').value.trim();
    var llmPrompt = createLLMPrompt(className, textContent);
    
    // Step 2: Call LLM API here with llmPrompt and handle the response
    var dummyGrade = "Category 1: (5) good; \"\"\"The submission demonstrates strong historical knowledge and clear analysis. For instance, the student notes that 'Lorem Ipsum is not simply random text' and correctly identifies its origin in Cicero’s 'de Finibus Bonorum et Malorum.' These details show accurate recall and contextualization.\"\"\"; very confident\nCategory 1: (5) good; \"\"\"The submission demonstrates strong historical knowledge and clear analysis. For instance, the student notes that 'Lorem Ipsum is not simply random text' and correctly identifies its origin in Cicero’s 'de Finibus Bonorum et Malorum.' These details show accurate recall and contextualization.\"\"\"; very confident";


    // Step 3: create file based on response of LLM API
    return createGradePDF(dummyGrade);
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
                    filesWithGrades.push({
                        filename: relativePath,
                        grade: gradeIndividualAssignment(content) // your grading function
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
