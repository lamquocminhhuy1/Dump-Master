import * as XLSX from 'xlsx';

// Helper function to get a value from row with case-insensitive matching
const getValue = (row, possibleKeys) => {
    for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
        // Case-insensitive matching
        const lowerKey = key.toLowerCase();
        for (const rowKey in row) {
            if (rowKey.toLowerCase() === lowerKey) {
                return row[rowKey];
            }
        }
    }
    return null;
};

export const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Assume the first sheet is the one we want
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    reject(new Error("The Excel file appears to be empty or has no data rows."));
                    return;
                }

                // Transform and validate - support multiple formats
                const questions = jsonData.map((row, index) => {
                    // Try multiple format variations
                    // Format 1: question, optionA, optionB, optionC, optionD, correctAnswer (sample file format)
                    // Format 2: Question, A, B, C, D, Answer (old format)
                    // Format 3: Handle nested options object from exports
                    
                    let question = getValue(row, ['question', 'Question']);
                    let optionA = getValue(row, ['optionA', 'OptionA', 'A', 'a']);
                    let optionB = getValue(row, ['optionB', 'OptionB', 'B', 'b']);
                    let optionC = getValue(row, ['optionC', 'OptionC', 'C', 'c']);
                    let optionD = getValue(row, ['optionD', 'OptionD', 'D', 'd']);
                    let correctAnswer = getValue(row, ['correctAnswer', 'CorrectAnswer', 'correctanswer', 'Answer', 'answer']);

                    // If options is a nested object (from exports), extract it
                    if (row.options && typeof row.options === 'object' && !Array.isArray(row.options)) {
                        optionA = row.options.A || optionA;
                        optionB = row.options.B || optionB;
                        optionC = row.options.C || optionC;
                        optionD = row.options.D || optionD;
                    }

                    // Validate required fields
                    if (!question) {
                        console.warn(`Skipping row ${index + 2}: Missing question text`);
                        return null;
                    }

                    if (!correctAnswer) {
                        console.warn(`Skipping row ${index + 2}: Missing correct answer`);
                        return null;
                    }

                    // Normalize correctAnswer to uppercase letter (A, B, C, or D)
                    const normalizedAnswer = correctAnswer.toString().trim().toUpperCase();
                    if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer)) {
                        console.warn(`Skipping row ${index + 2}: Invalid correct answer "${correctAnswer}". Must be A, B, C, or D.`);
                        return null;
                    }

                    return {
                        id: index,
                        question: question.toString().trim(),
                        options: {
                            A: (optionA || '').toString().trim(),
                            B: (optionB || '').toString().trim(),
                            C: (optionC || '').toString().trim(),
                            D: (optionD || '').toString().trim()
                        },
                        correctAnswer: normalizedAnswer
                    };
                }).filter(q => q !== null);

                if (questions.length === 0) {
                    reject(new Error("No valid questions found in the Excel file. Please check the format. Expected columns: question, optionA, optionB, optionC, optionD, correctAnswer (or Question, A, B, C, D, Answer)"));
                } else {
                    resolve(questions);
                }

            } catch (error) {
                console.error('Excel parsing error:', error);
                reject(new Error(`Failed to parse Excel file: ${error.message}`));
            }
        };

        reader.onerror = (error) => reject(new Error(`Failed to read file: ${error.message || 'Unknown error'}`));
        reader.readAsArrayBuffer(file);
    });
};
