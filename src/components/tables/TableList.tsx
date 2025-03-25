
import { useState, useEffect } from 'react';
import { TableInfo, fetchTablesByProgram } from '@/lib/api';
import { Program } from '@/lib/api';
import { ChevronRight, Database } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorDisplay from '../ui/ErrorDisplay';

type TableListProps = {
  program: Program;
  onSelectTable: (table: TableInfo) => void;
  selectedTable?: TableInfo;
};

const TableList = ({ program, onSelectTable, selectedTable }: TableListProps) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTables = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tables for program ID ${program.program_id}`);
        // Convert program_id to number to fix the type error
        const result = await fetchTablesByProgram(Number(program.program_id));
        if (result) {
          console.log(`Loaded ${result.length} tables for program ${program.program_id}:`, result);
          setTables(result);
        } else {
          setError("Failed to load tables. Please try again.");
        }
      } catch (err) {
        console.error("Error loading tables:", err);
        setError("An unexpected error occurred while loading tables.");
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, [program.program_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3 text-ishanya-green">Data Tables</h3>
      {tables.length === 0 ? (
        <div className="text-center p-4 bg-gray-50 rounded-md text-gray-500">
          No tables available for this program
        </div>
      ) : (
        <ul className="space-y-2">
          {tables.map((table) => (
            <li key={table.id}>
              <button
                onClick={() => onSelectTable(table)}
                className={`flex items-center justify-between w-full p-3 rounded-md transition-colors ${
                  selectedTable?.id === table.id
                    ? 'bg-ishanya-green text-white shadow-md'
                    : 'bg-white hover:bg-gray-50 border border-gray-100 shadow-sm'
                }`}
              >
                <div className="flex items-center">
                  <Database className={`h-4 w-4 mr-2 ${selectedTable?.id === table.id ? 'text-white' : 'text-ishanya-green'}`} />
                  <span className="font-medium">{table.display_name || table.name}</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TableList;
