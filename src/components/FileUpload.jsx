import React from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ onFileUpload }) => {
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileUpload(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            onFileUpload(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div
            className="file-upload-container"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div className="upload-icon">
                <Upload size={48} />
            </div>
            <h2>Upload Dumps File</h2>
            <p>Drag & drop your Excel file here, or click to browse</p>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                id="file-input"
                className="hidden-input"
            />
            <label htmlFor="file-input" className="upload-button">
                Select File
            </label>
            <p className="format-hint">Supported formats: .xlsx, .xls</p>
        </div>
    );
};

export default FileUpload;
