import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Pencil, Save, Trash } from 'lucide-react';
import TableField from './TableField';

interface DetailedViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  detailedViewRow: any | null;
  isEditMode: boolean;
  validationErrors: Record<string, string>;
  allColumns: string[];
  formatColumnName: (name: string) => string;
  shouldHideColumn: (column: string) => boolean;
  isColumnEditable: (column: string) => boolean;
  isFieldRequired: (column: string) => boolean;
  getPlaceholder: (column: string) => string;
  shouldUseDropdown: (column: string) => boolean;
  shouldUseDatePicker: (column: string) => boolean;
  shouldUseTextarea: (column: string) => boolean;
  shouldUseImageUpload: (column: string) => boolean;
  getDropdownOptions: (column: string) => { value: string; label: string }[];
  onSave: () => void;
  onDelete: () => void;
  onImageUploadClick?: () => void;
  onEditModeToggle: () => void;
  onRowChange: (column: string, value: any) => void;
  tableName: string;
}

const DetailedViewDialog = ({
  isOpen,
  onOpenChange,
  detailedViewRow,
  isEditMode,
  validationErrors,
  allColumns,
  formatColumnName,
  shouldHideColumn,
  isColumnEditable,
  isFieldRequired,
  getPlaceholder,
  shouldUseDropdown,
  shouldUseDatePicker,
  shouldUseTextarea,
  shouldUseImageUpload,
  getDropdownOptions,
  onSave,
  onDelete,
  onImageUploadClick,
  onEditModeToggle,
  onRowChange,
  tableName
}: DetailedViewDialogProps) => {
  
  // Log detailed row data for debugging
  React.useEffect(() => {
    if (detailedViewRow) {
      console.log('DetailedViewDialog - Current row data:', detailedViewRow);
    }
  }, [detailedViewRow, isEditMode]);

  const handleChange = (column: string, value: any) => {
    console.log(`DetailedViewDialog - Changing ${column} to:`, value);
    if (onRowChange) {
      onRowChange(column, value);
    }
  };

  // Make sure we have the row before rendering
  if (!detailedViewRow) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {isEditMode ? (
              <span className="flex items-center text-ishanya-green">
                <Pencil className="h-5 w-5 mr-2" />
                Edit {tableName || 'Record'} 
              </span>
            ) : (
              <span>
                View {tableName || 'Record'} Details
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Make changes to the record below and save when done.'
              : 'Detailed view of the selected record.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {allColumns
            .filter(column => !shouldHideColumn(column) && column !== 'id')
            .map(column => (
              <div key={column} className="space-y-2">
                <Label htmlFor={column} className="text-sm font-medium flex items-center">
                  {formatColumnName(column)}
                  {isFieldRequired(column) && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {isEditMode && isColumnEditable(column) ? (
                  <>
                    <TableField
                      column={column}
                      value={detailedViewRow[column]}
                      onChange={handleChange}
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
                      <p className="text-red-500 text-xs">{validationErrors[column]}</p>
                    )}
                  </>
                ) : (
                  <div className="p-2 bg-gray-50 rounded-md min-h-[40px] break-words">
                    {shouldUseImageUpload(column) && detailedViewRow[column] ? (
                      <img 
                        src={detailedViewRow[column]} 
                        alt={`${formatColumnName(column)}`}
                        className="h-20 w-20 object-cover rounded-md" 
                      />
                    ) : (
                      <span>
                        {detailedViewRow[column] !== null && 
                        detailedViewRow[column] !== undefined ? 
                          String(detailedViewRow[column]) : 
                          '—'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
        
        <DialogFooter className="gap-2 sm:space-x-0">
          {!isEditMode && (
            <Button 
              variant="outline" 
              type="button" 
              onClick={onEditModeToggle}
              className="mr-auto"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          
          {isEditMode && (
            <>
              <Button 
                variant="destructive" 
                type="button" 
                onClick={onDelete}
                className="mr-auto"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
              
              <Button 
                variant="ghost" 
                type="button" 
                onClick={onEditModeToggle}
              >
                Cancel
              </Button>
              
              <Button 
                type="button" 
                onClick={onSave}
                className="bg-ishanya-green hover:bg-ishanya-green/90"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}
          
          {!isEditMode && (
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DetailedViewDialog;
