
import { useState, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { bulkInsert, fetchTableData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, AlertOctagon, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export type CsvUploadProps = {
  tableName: string;
  onSuccess: () => void;
  onClose?: () => void;
};

const CsvUpload = ({ tableName, onSuccess, onClose }: CsvUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStudentColumns = () => [
    'first_name', 'last_name', 'gender', 'dob', 'student_id', 'enrollment_year', 
    'status', 'student_email', 'program_id', 'program_2_id', 'number_of_sessions', 
    'timings', 'days_of_week', 'educator_employee_id', 'secondary_educator_employee_id', 
    'session_type', 'fathers_name', 'mothers_name', 'blood_group', 'allergies', 
    'contact_number', 'alt_contact_number', 'parents_email', 'address', 'transport', 
    'strengths', 'weakness', 'comments', 'center_id'
  ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
      // Generate preview when file is selected
      generatePreview(selectedFile);
    } else {
      setFile(null);
      setPreviewData(null);
      setError('Please select a valid CSV file');
    }
  };

  const generatePreview = async (file: File) => {
    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        preview: 3, // Just show first 3 rows as preview
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            return;
          }
          
          if (results.data.length > 0) {
            setPreviewData(results.data as Record<string, any>[]);
          }
        },
        error: (error) => {
          setError(`CSV parsing error: ${error.message}`);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Error reading file');
    }
  };

  const validateStudentData = (rows: any[], existingIds: Set<string | number> = new Set()) => {
    const errors: { row: number; message: string }[] = [];
    const requiredFields = ['first_name', 'last_name', 'student_email', 'program_id', 'center_id'];
    const seenIds = new Set<string | number>();
    
    rows.forEach((row, index) => {
      // Check required fields
      for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push({
            row: index + 1,
            message: `Row ${index + 1}: Missing required field "${field}"`
          });
        }
      }
      
      // Check for duplicate student_id within the CSV file
      if (row.student_id) {
        if (seenIds.has(row.student_id)) {
          errors.push({
            row: index + 1,
            message: `Row ${index + 1}: Duplicate student_id "${row.student_id}" found in CSV file`
          });
        } else {
          seenIds.add(row.student_id);
        }
        
        // Check if student_id already exists in the database
        if (existingIds.has(row.student_id)) {
          errors.push({
            row: index + 1,
            message: `Row ${index + 1}: student_id "${row.student_id}" already exists in the database`
          });
        }
      }
      
      // Validate email format if present
      if (row.student_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.student_email)) {
        errors.push({
          row: index + 1,
          message: `Row ${index + 1}: Invalid student_email format`
        });
      }
      
      if (row.parents_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.parents_email)) {
        errors.push({
          row: index + 1,
          message: `Row ${index + 1}: Invalid parents_email format`
        });
      }
      
      // Validate numeric fields if present
      const numericFields = ['program_id', 'program_2_id', 'center_id', 'number_of_sessions', 
        'educator_employee_id', 'secondary_educator_employee_id'];
      
      for (const field of numericFields) {
        if (row[field] && row[field] !== '' && isNaN(Number(row[field]))) {
          errors.push({
            row: index + 1,
            message: `Row ${index + 1}: Invalid numeric value for "${field}"`
          });
        }
      }
    });
    
    return errors;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const text = await file.text();

      // First, get existing student_ids from the database to check for duplicates
      let existingIds = new Set<string | number>();
      if (tableName === 'students') {
        const existingData = await fetchTableData(tableName);
        if (existingData) {
          existingIds = new Set(existingData.map(item => item.student_id));
          console.log(`Found ${existingIds.size} existing student IDs`, existingIds);
        }
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            setIsUploading(false);
            return;
          }

          let rows = results.data as Record<string, any>[];
          console.log(`Parsed ${rows.length} rows from CSV for ${tableName}`, rows);
          
          if (rows.length === 0) {
            setError('CSV file contains no data');
            setIsUploading(false);
            return;
          }

          // Additional validation for student data
          if (tableName === 'students') {
            const validationErrors = validateStudentData(rows, existingIds);
            if (validationErrors.length > 0) {
              setError(`Validation errors found:\n${validationErrors.slice(0, 5).map(err => err.message).join('\n')}${validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors` : ''}`);
              setIsUploading(false);
              return;
            }
          }

          // Process the rows to ensure correct data types
          const processedRows = rows.map(row => {
            const newRow: Record<string, any> = {};

            Object.entries(row).forEach(([key, value]) => {
              // Convert empty strings to null
              if (value === '') {
                newRow[key] = null;
                return;
              }

              // Convert numeric values
              if (
                ['program_id', 'program_2_id', 'center_id', 'number_of_sessions', 
                 'educator_employee_id', 'secondary_educator_employee_id', 'student_id', 'enrollment_year'].includes(key) && 
                !isNaN(Number(value))
              ) {
                newRow[key] = Number(value);
                return;
              }

              // Handle arrays
              if (['days_of_week', 'timings'].includes(key)) {
                try {
                  // If it's already a JSON array
                  if (typeof value === 'string' && (value.startsWith('[') && value.endsWith(']'))) {
                    newRow[key] = JSON.parse(value);
                  } 
                  // If it's a comma-separated list
                  else if (typeof value === 'string' && value.includes(',')) {
                    newRow[key] = value.split(',').map(item => item.trim());
                  } 
                  // If it's a single value
                  else {
                    newRow[key] = [value];
                  }
                } catch (e) {
                  newRow[key] = typeof value === 'string' ? [value] : null;
                }
                return;
              }

              // Format date fields
              if (key === 'dob' || key === 'created_at') {
                try {
                  const date = new Date(value as string);
                  newRow[key] = !isNaN(date.getTime()) ? date.toISOString() : value;
                } catch (e) {
                  newRow[key] = value;
                }
                return;
              }

              // Default case
              newRow[key] = value;
            });

            // Ensure created_at is always set
            if (!newRow.created_at) {
              newRow.created_at = new Date().toISOString();
            }

            return newRow;
          });

          try {
            const result = await bulkInsert(tableName, processedRows);
            setIsUploading(false);

            if (result.success) {
              toast.success(result.message);
              onSuccess();
              if (onClose) onClose();
            } else {
              // Display more specific error details
              let errorMessage = result.message;
              if (result.message.includes('duplicate key value')) {
                errorMessage = 'Some student IDs in your file already exist in the database. Please check and try again.';
              }
              setError(errorMessage);
            }
          } catch (err: any) {
            let errorMessage = err.message || 'Error uploading data';
            if (errorMessage.includes('duplicate key value')) {
              errorMessage = 'Some student IDs in your file already exist in the database. Please check and try again.';
            }
            setError(errorMessage);
            setIsUploading(false);
          }
        },
        error: (error) => {
          setError(`CSV parsing error: ${error.message}`);
          setIsUploading(false);
        },
      });
    } catch (err: any) {
      setError(err.message || 'Error reading file');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Upload a CSV file with the following columns:
        </p>
        <div className="bg-gray-50 p-3 rounded-md border text-xs max-h-32 overflow-y-auto">
          <code className="whitespace-normal break-words">
            {tableName === 'students' && getStudentColumns().join(', ')}
            {tableName === 'educators' && 'name, designation, email, phone, date_of_birth, date_of_joining, center_id'}
            {tableName === 'employees' && 'name, gender, designation, department, employment_type, email, phone, date_of_birth, status, center_id'}
            {tableName === 'courses' && 'name, duration_weeks, max_students, description, start_date, end_date, center_id, program_id'}
          </code>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="flex-1"
        />
        <Button 
          type="button" 
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="bg-ishanya-green hover:bg-ishanya-green/90"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}
      
      {file && !error && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-green-500" />
            <p className="text-sm text-gray-600">
              Selected file: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
            </p>
          </div>
          
          {previewData && previewData.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview (first 3 rows):</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {Object.keys(previewData[0]).slice(0, 5).map((key) => (
                        <th key={key} className="border p-1 text-left">{key}</th>
                      ))}
                      {Object.keys(previewData[0]).length > 5 && (
                        <th className="border p-1 text-left">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b">
                        {Object.entries(row).slice(0, 5).map(([key, value]) => (
                          <td key={key} className="border p-1">{value as string || <span className="text-gray-400">null</span>}</td>
                        ))}
                        {Object.keys(row).length > 5 && (
                          <td className="border p-1 text-gray-400">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
