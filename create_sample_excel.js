import * as XLSX from 'xlsx';
import fs from 'fs';

const data = [
    {
        Question: "What is the capital of France?",
        A: "London",
        B: "Berlin",
        C: "Paris",
        D: "Madrid",
        Answer: "C"
    },
    {
        Question: "Which language is used for React?",
        A: "Python",
        B: "Java",
        C: "C++",
        D: "JavaScript",
        Answer: "D"
    },
    {
        Question: "What does CSS stand for?",
        A: "Cascading Style Sheets",
        B: "Computer Style Sheets",
        C: "Creative Style Sheets",
        D: "Colorful Style Sheets",
        Answer: "A"
    }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Questions");

XLSX.writeFile(wb, "sample_dumps.xlsx");
console.log("sample_dumps.xlsx created successfully!");
