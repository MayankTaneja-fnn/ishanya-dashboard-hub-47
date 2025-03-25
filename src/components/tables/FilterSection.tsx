
import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FilterSectionProps {
  columns: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterValues: Record<string, string>;
  handleFilterChange: (column: string, value: string) => void;
  clearFilters: () => void;
  isFiltered: boolean;
  formatColumnName: (name: string) => string;
  displayColumns: string[];
}

const FilterSection = ({
  columns,
  searchTerm,
  setSearchTerm,
  filterValues,
  handleFilterChange,
  clearFilters,
  isFiltered,
  formatColumnName,
  displayColumns
}: FilterSectionProps) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search all columns..."
            className="pl-10 border-ishanya-green/30 focus-visible:ring-ishanya-green"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="absolute right-3 top-3" 
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
            </button>
          )}
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={isFilterOpen ? "bg-gray-100 border-ishanya-green/50 text-ishanya-green" : "border-ishanya-green/50 text-ishanya-green"}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        {isFiltered && (
          <Button 
            variant="ghost" 
            onClick={clearFilters}
            size="sm"
            className="text-ishanya-green hover:text-ishanya-green/90 hover:bg-ishanya-green/10"
          >
            Clear All
          </Button>
        )}
      </div>
      
      {isFilterOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50 border-ishanya-green/20 shadow-inner">
          {displayColumns
            .filter(column => column !== 'created_at')
            .map(column => (
              <div key={`filter-${column}`} className="space-y-2">
                <Label htmlFor={`filter-${column}`} className="text-xs font-medium text-ishanya-green">
                  Filter by {formatColumnName(column)}
                </Label>
                <div className="relative">
                  <Input
                    id={`filter-${column}`}
                    placeholder={`Filter ${formatColumnName(column)}...`}
                    value={filterValues[column] || ''}
                    onChange={(e) => handleFilterChange(column, e.target.value)}
                    className="border-ishanya-green/30 focus-visible:ring-ishanya-green"
                  />
                  {filterValues[column] && (
                    <button 
                      className="absolute right-3 top-3" 
                      onClick={() => handleFilterChange(column, '')}
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default FilterSection;
