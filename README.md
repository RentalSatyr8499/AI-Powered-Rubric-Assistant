# UnsureTA 🤖📚

## Overview
UnsureTA is an AI‑powered rubric assistant built for the **Claude for Good 2025 Hackathon** at UVA.  
It helps instructors and teaching assistants grade student submissions more efficiently while keeping **human oversight** front and center.

Our demo is live on Netlify: [UnsureTA on Netlify](https://6918fb2d1a32570008908e94--unsureta.netlify.app/)
If that link doesn't work, the front-end demo is also viewable on Github pages: [UnsureTA UI Demo](https://github.com/K8L0/AI-Powered-Rubric-Assistant)

---

## Usage
Upload a `.zip` of student submissions (plain text files) and a `.csv` file containing a rubric with categories and grading levels. In turn, UnsureTA will generate the following:
  - **PDF files** with rubric grades and comments for each student.
  - One **Grading Score Report** PDF for the teacher that:
    - Shows confidence scores for each rubric category.
    - Highlights the lowest confidence scores (where human review is most needed).
    - Includes verbatim quotes from student submissions that justify rubric category assignments.

---

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS  
- **PDF Generation:** [jsPDF](https://github.com/parallax/jsPDF) + AutoTable plugin  
- **Hosting & Functions:** [Netlify](https://www.netlify.com/)  
- **LLM API:** Hugging Face Inference API  
- **Model:** Chat GPT‑5 (for rubric grading and feedback generation)

---

## 👩‍🏫 Human Involvement
UnsureTA is designed to **augment, not replace** human graders:
- Confidence scores guide instructors to focus on uncertain cases.
- The Grading Score Report surfaces low‑confidence judgments and provides context.
- Real student quotes are included to justify rubric category assignments.

---
## What we'd implement next
- Separate LLM for confidence scoring: Improve trustworthiness by decoupling grading from confidence estimation.
- Teacher‑provided exemplars: Allow teachers to upload sample graded submissions to guide the LLM with human examples.
- Custom rubric comments: Allow teachers to add rubric‑specific notes that the LLM incorporates into grading.


## 🚀 Getting Started
1. Clone the repo.
2. Run locally with Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify dev
