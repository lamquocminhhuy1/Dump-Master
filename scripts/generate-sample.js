import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data
const data = [
    {
        question: 'What is the capital of France?',
        optionA: 'London',
        optionB: 'Berlin',
        optionC: 'Paris',
        optionD: 'Madrid',
        correctAnswer: 'C'
    },
    {
        question: 'Which planet is known as the Red Planet?',
        optionA: 'Venus',
        optionB: 'Mars',
        optionC: 'Jupiter',
        optionD: 'Saturn',
        correctAnswer: 'B'
    },
    {
        question: 'What is 2 + 2?',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctAnswer: 'B'
    },
    {
        question: 'Who painted the Mona Lisa?',
        optionA: 'Van Gogh',
        optionB: 'Picasso',
        optionC: 'Da Vinci',
        optionD: 'Monet',
        correctAnswer: 'C'
    },
    {
        question: 'What is the largest ocean on Earth?',
        optionA: 'Atlantic',
        optionB: 'Indian',
        optionC: 'Arctic',
        optionD: 'Pacific',
        correctAnswer: 'D'
    }
];

// Create a new workbook
const wb = XLSX.utils.book_new();

// Convert data to worksheet
const ws = XLSX.utils.json_to_sheet(data);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(wb, ws, 'Sample Dumps');

// Write to file
const outputPath = path.join(__dirname, '..', 'public', 'sample_dumps.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('Excel file created successfully at:', outputPath);
