
import React from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TableRowActions from './TableRowActions';
import TableField from './TableField';

interface DataTableProps {
  displayColumns: string[];
  filteredData: any[];
  formatColumnName: (name: string) => string;
  isEditing: boolean;
  editingRow: any | null;
  validationErrors: Record<string, string>;
  handleEditChange: (column: string, value: any) => void;
  handleSaveEdit: () => void;
  handleEditClick: (row: any) => void;
  handleViewDetails: (row: any) => void;
  handleDeleteRow: (id: number) => void;
  isFieldRequired: (column: string) => boolean;
  getPlaceholder: (column: string) => string;
  shouldUseDropdown: (column: string) => boolean;
  shouldUseDatePicker: (column: string) => boolean;
  shouldUseTextarea: (column: string) => boolean;
  shouldUseImageUpload: (column: string) => boolean;
  getDropdownOptions: (column: string) => { value: string; label: string }[];
  onImageUploadClick: () => void;
}

const DataTable = ({
  displayColumns,
  filteredData,
  formatColumnName,
  isEditing,
  editingRow,
  validationErrors,
  handleEditChange,
  handleSaveEdit,
  handleEditClick,
  handleViewDetails,
  handleDeleteRow,
  isFieldRequired,
  getPlaceholder,
  shouldUseDropdown,
  shouldUseDatePicker,
  shouldUseTextarea,
  shouldUseImageUpload,
  getDropdownOptions,
  onImageUploadClick
}: DataTableProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <Table className="w-full capitalize-column-headers">
          <TableHeader>
            <TableRow className="bg-ishanya-green/10">
              {displayColumns
                .filter(column => column !== 'created_at')
                .map((column) => (
                  <TableHead key={column} className="text-ishanya-green font-medium">
                    {formatColumnName(column)}
                  </TableHead>
                ))}
              <TableHead className="w-28 text-ishanya-green font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 1} className="text-center py-8 text-gray-500">
                  No data matching current filters
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  {displayColumns
                    .filter(column => column !== 'created_at')
                    .map((column) => (
                      <TableCell 
                        key={`${row.id}-${column}`}
                        onClick={() => handleViewDetails(row)}
                        className="py-3"
                      >
                        {isEditing && editingRow?.id === row.id ? (
                          <div>
                            <TableField
                              column={column}
                              value={editingRow[column]}
                              onChange={handleEditChange}
                              isRequired={isFieldRequired(column)}
                              mode="edit"
                              validationErrors={validationErrors}
                              getPlaceholder={getPlaceholder}
                              shouldUseDropdown={shouldUseDropdown}
                              shouldUseDatePicker={shouldUseDatePicker}
                              shouldUseTextarea={shouldUseTextarea}
                              shouldUseImageUpload={shouldUseImageUpload}
                              getDropdownOptions={getDropdownOptions}
                              onImageUploadClick={onImageUploadClick}
                            />
                            {validationErrors[column] && (
                              <p className="text-red-500 text-xs mt-1">{validationErrors[column]}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            {column === 'photo' && row[column] ? (
                              <img 
                                src={row[column]} 
                                alt="Photo" 
                                className="h-8 w-8 rounded-full object-cover mr-2"
                              />
                            ) : (
                              <span className="truncate max-w-[200px]">
                                {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                              </span>
                            )}
                            {column === displayColumns.filter(c => c !== 'created_at')[displayColumns.filter(c => c !== 'created_at').length - 1] && (
                              <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
                            )}
                          </div>
                        )}
                      </TableCell>
                    ))}
                  <TableCell>
                    <TableRowActions
                      row={row}
                      isEditing={isEditing}
                      editingRow={editingRow}
                      onViewDetails={handleViewDetails}
                      onEdit={handleEditClick}
                      onSave={handleSaveEdit}
                      onDelete={handleDeleteRow}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;
