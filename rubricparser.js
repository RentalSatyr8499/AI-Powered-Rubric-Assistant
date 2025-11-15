const form = document.getElementById('uploadForm');
const zipInput = document.getElementById('zipInput');
const csvInput = document.getElementById('csvInput');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const tableContainer = document.getElementById('tableContainer');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');

function fileExtMatches(file, ext) {
    return file && file.name && file.name.toLowerCase().endsWith(ext);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const result = [];
    
    if (lines.length === 0) return result;
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        result.push(row);
    }
    
    return { headers, rows: result };
}

function displayTable(csvData) {
    const { headers, rows } = csvData;
    
    // Clear existing table
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    
    // Create data rows
    rows.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header];
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    // Show table container
    tableContainer.classList.add('show');
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = zipInput.files[0];
    const csv = csvInput.files[0];

    if (!zip || !csv) {
        alert('Please choose both a .zip and a .csv file.');
        return;
    }
    if (!fileExtMatches(zip, '.zip')) {
        alert('Selected ZIP file is not a .zip file.');
        return;
    }
    if (!fileExtMatches(csv, '.csv')) {
        alert('Selected CSV file is not a .csv file.');
        return;
    }

    // Read and parse CSV file
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csvData = parseCSV(event.target.result);
            displayTable(csvData);
            console.log('ZIP file:', zip);
            console.log('CSV file:', csv);
            console.log('CSV Data:', csvData);
        } catch (error) {
            alert('Error parsing CSV file: ' + error.message);
            console.error(error);
        }
    };
    reader.onerror = () => {
        alert('Error reading CSV file.');
    };
    reader.readAsText(csv);
});

resetBtn.addEventListener('click', () => {
    form.reset();
    tableContainer.classList.remove('show');
});