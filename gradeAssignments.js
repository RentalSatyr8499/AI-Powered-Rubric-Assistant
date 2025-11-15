// gradeAssignments.js
// Requires JSZip (include in your HTML: <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>)

const form = document.getElementById('uploadForm');
const zipInput = document.getElementById('zipInput');

function createPrompt(className, submissionText) {
    var rubric = window.TAbot.rubric;
    var categories = getRubricCategories(csvData);

    var part1 = rubric + "\n\n";
    var part2 = "Confidence Spectrum - possible confidence scores\nVery confident: The submission clearly fits one rubric category. Evidence is strong, unambiguous, and easily supported with direct quotes.\nPretty confident: The submission mostly fits one category, but there are minor inconsistencies or weaker evidence in places.\nSomewhat unsure: The submission could reasonably fit multiple categories. Evidence supports more than one possible grade, making the choice debatable.\nUnsure: The rubric definitions don't map cleanly to the submission. Deciding requires arbitrary judgment or assumptions beyond the rubric.";
    var part3 = String.format("You are a teaching assistant for the class %s. For each rubric category above, please generate a rubric grade. A rubric grade consists of the following: the grade, the feedback, and the confidence score. It will follow this format: {Category name}: ({score}) {score label}; \"\"\"\{feedback\}\"\"\"; {confidence score}; {confidence comment (if applicable)}. For example:\n\nCategory 1: (5) good; \"\"\"The submission demonstrates strong historical knowledge and clear analysis. For instance, the student notes that 'Lorem Ipsum is not simply random text' and correctly identifies its origin in Cicero’s 'de Finibus Bonorum et Malorum.' These details show accurate recall and contextualization.\"\"\"; very confident\nCategory 3: (1) bad; \"\"\"The submission does not adequately address the ethical implications of the text. Although the student references 'a treatise on the theory of ethics,' they fail to analyze its significance or connect it to the assignment's focus. The discussion remains superficial.\"\"\"; somewhat unsure; The rubric definition of “bad” is broad, and parts of the essay could arguably fit “ok.”\n\nNotes: The {feedback} field is a 80-120 word comment including at least two examples of evidence from the student submission supporting why you chose the grade that you did. Incorporate at least one verbatim quote of the student's. The {confidence score} field uses the Confidence Spectrum above to assess how confident you are that the student deserves the score. If you choose a score of “Somewhat unsure” or “Unsure”, explain why in the {confidence score comment} field.", className);
    var part4 = String.format("Your task: generate a rubric grade for each of the categories in the rubric for this assignment - %s - for the student submission below.\n\nStudent submission:\n\"%s\"", categories, submissionText);
    
    return part1 + part2 + part3 + part4;
}

function gradeAssignment(textContent) {
    const className = document.getElementById('className').value.trim();
    var llmPrompt = createPrompt(className, textContent);
    
    // Call LLM API here with llmPrompt and handle the response

    var dummyGrade = "Category 1: (5) good; \"\"\"The submission demonstrates strong historical knowledge and clear analysis. For instance, the student notes that 'Lorem Ipsum is not simply random text' and correctly identifies its origin in Cicero’s 'de Finibus Bonorum et Malorum.' These details show accurate recall and contextualization.\"\"\"; very confident";
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
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

        // Iterate through files in the zip
        zip.forEach(async (relativePath, file) => {
            if (relativePath.toLowerCase().endsWith(".txt")) {
                const content = await file.async("string");
                gradeAssignment(content);
            }
        });
    } catch (err) {
        console.error("Error processing ZIP file:", err);
        alert("Failed to process ZIP file: " + err.message);
    }
});
