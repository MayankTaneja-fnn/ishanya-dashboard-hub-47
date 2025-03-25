import { useEffect, useState, useRef } from 'react';
import { TableInfo, fetchTableData, deleteRow, updateRow, insertRow, fetchTableColumns } from '@/lib/api';
import supabase from '@/lib/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorDisplay from '../ui/ErrorDisplay';
import TableActions from './TableActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import VoiceInputDialog from '@/components/ui/VoiceInputDialog';
import { getCurrentUser, getUserRole } from '@/lib/auth';
import { processFieldData } from '@/lib/dataUtils';

// Import our new components and utilities
import FilterSection from './components/FilterSection';
import DataTable from './components/DataTable';
import DetailedViewDialog from './components/DetailedViewDialog';
import InsertDialog from './components/InsertDialog';
import useReferenceData from './hooks/useReferenceData';
import { 
  formatColumnName, 
  isFieldRequired, 
  shouldUseDropdown,
  shouldUseDatePicker, 
  isColumnEditable, 
  shouldUseTextarea, 
  shouldUseImageUpload, 
  shouldHideColumn,
  getPlaceholder
} from './utils/tableHelpers';

type TableViewProps = {
  table: TableInfo;
};

const TableView = ({ table }: TableViewProps) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRow, setNewRow] = useState<any>({});
  const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [detailedViewRow, setDetailedViewRow] = useState<any | null>(null);
  const [isDetailedViewOpen, setIsDetailedViewOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [isVoiceInputDialogOpen, setIsVoiceInputDialogOpen] = useState(false);
  const [isEditModeInDetailView, setIsEditModeInDetailView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userRole = getUserRole();
  
  // Use our custom hook for reference data
  const { 
    getDropdownOptions, 
    loading: refDataLoading 
  } = useReferenceData();

  // Load table data
  const loadTableData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching columns for table ${table.name}`);
      
      const tableColumns = await fetchTableColumns(table.name);
      if (tableColumns) {
        console.log(`Columns for ${table.name}:`, tableColumns);
        
        // Filter out columns that should be hidden based on user role
        const visibleColumns = tableColumns.filter(col => !shouldHideColumn(col, userRole));
        
        setAllColumns(tableColumns);
        
        if (table.name === 'students') {
          const limitedColumns = visibleColumns.filter(col => 
            ['student_id', 'first_name', 'last_name', 'photo', 'dob', 'contact_number', 'student_email'].includes(col)
          );
          setDisplayColumns(limitedColumns);
          setColumns(limitedColumns);
        } else {
          setDisplayColumns(visibleColumns);
          setColumns(visibleColumns);
        }
      } else {
        console.error(`No columns returned for ${table.name}`);
      }
      
      console.log(`Fetching data from ${table.name} with center_id: ${table.center_id}`);
      const result = await fetchTableData(table.name, table.center_id);
      if (result) {
        console.log(`Loaded ${result.length} records from ${table.name}:`, result);
        setData(result);
        setFilteredData(result);
      } else {
        console.error(`Failed to load data from ${table.name}`);
        setError('Failed to load table data. Please try again.');
      }
    } catch (err) {
      console.error('Error in loadTableData:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!table.name) return;
    
    console.log(`Setting up real-time subscription for ${table.name}`);
    
    const channel = supabase
      .channel(`${table.name}-changes`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: table.name.toLowerCase() 
      }, (payload) => {
        console.log('Change received:', payload);
        loadTableData();
      })
      .subscribe();
    
    return () => {
      console.log(`Cleaning up subscription for ${table.name}`);
      supabase.removeChannel(channel);
    };
  }, [table.id, table.name]);
  
  // Initial data load
  useEffect(() => {
    loadTableData();
  }, [table.id, table.name, table.center_id]);

  // Filter data based on search and filter values
  useEffect(() => {
    let result = [...data];
    
    if (searchTerm) {
      result = result.filter(row => 
        Object.entries(row).some(([key, value]) => 
          key !== 'id' && 
          value !== null && 
          String(value)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }
    
    Object.entries(filterValues).forEach(([column, value]) => {
      if (value) {
        result = result.filter(row => 
          row[column] !== undefined && 
          row[column] !== null &&
          String(row[column])
            .toLowerCase()
            .includes(value.toLowerCase())
        );
      }
    });
    
    setFilteredData(result);
  }, [data, searchTerm, filterValues]);

  // Handle image upload
  const handleImageUpload = async (file: File, rowData: any, fieldName: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${table.name}/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file);
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      if (urlData && urlData.publicUrl) {
        const publicUrl = urlData.publicUrl;
        
        // Update row data with image URL
        if (isEditing && editingRow) {
          setEditingRow({
            ...editingRow,
            [fieldName]: publicUrl
          });
        } else if (isInsertDialogOpen) {
          setNewRow({
            ...newRow,
            [fieldName]: publicUrl
          });
        } else if (detailedViewRow) {
          setDetailedViewRow({
            ...detailedViewRow,
            [fieldName]: publicUrl
          });
        }
        
        toast.success('Image uploaded successfully', {
          duration: 3000,
          dismissible: true
        });
        
        return publicUrl;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image', {
        duration: 3000,
        dismissible: true
      });
    }
    
    return null;
  };

  // Handle view details mode
  const handleViewDetails = (row: any) => {
    setDetailedViewRow({...row});
    setIsDetailedViewOpen(true);
    setIsEditModeInDetailView(false); // Start in view mode
  };

  // Toggle edit mode in detail view
  const handleToggleEditMode = () => {
    setIsEditModeInDetailView(!isEditModeInDetailView);
  };

  // Save changes from detailed view with improved error handling
  const handleSaveDetailedView = async () => {
    if (!detailedViewRow) return;
    
    try {
      toast.loading('Saving changes...');
      
      console.log(`Saving changes to row in ${table.name}:`, detailedViewRow);
      
      // Ensure created_at is set
      if (!detailedViewRow.created_at || detailedViewRow.created_at === '') {
        detailedViewRow.created_at = new Date().toISOString();
      }
      
      // Process data before submitting
      const processedData = processFieldData(detailedViewRow);
      console.log('Processed data for update:', processedData);
      
      // Update row in database
      const { data, error } = await supabase
        .from(table.name.toLowerCase())
        .update(processedData)
        .eq('id', detailedViewRow.id)
        .select();
      
      if (error) {
        console.error(`Update error in ${table.name}:`, error);
        toast.dismiss();
        toast.error(error.message || 'Failed to update record');
        
        // Set validation errors if we can determine them
        if (error.message.includes('violates not-null constraint')) {
          const field = error.message.match(/column "([^"]+)"/)
          if (field && field[1]) {
            setValidationErrors({
              [field[1]]: `${field[1]} is required`
            });
          }
        }
        return;
      }
      
      toast.dismiss();
      toast.success('Record updated successfully');
      
      setIsDetailedViewOpen(false);
      setIsEditModeInDetailView(false);
      loadTableData(); // Refresh data after successful update
    } catch (err) {
      console.error('Error in handleSaveDetailedView:', err);
      toast.dismiss();
      toast.error('An error occurred while updating the record');
    }
  };

  // Delete a row
  const handleDeleteRow = async (id: number) => {
    if (window.confirm(`Are you sure you want to delete this record?`)) {
      try {
        console.log(`Deleting row with id ${id} from ${table.name}`);
        const success = await deleteRow(table.name, id);
        if (success) {
          toast.success('Record deleted successfully', {
            duration: 3000,
            dismissible: true
          });
          setIsDetailedViewOpen(false);
        } else {
          toast.error('Failed to delete record', {
            duration: 3000,
            dismissible: true
          });
        }
      } catch (err) {
        console.error('Error in handleDeleteRow:', err);
        toast.error('An error occurred while deleting the record', {
          duration: 3000,
          dismissible: true
        });
      }
    }
  };

  // Edit a row
  const handleEditClick = (row: any) => {
    console.log('Editing row:', row);
    setEditingRow({ ...row });
    setIsEditing(true);
    setValidationErrors({});
  };

  // Handle changes during row editing
  const handleEditChange = (column: string, value: any) => {
    console.log(`Changing column ${column} to:`, value);
    
    const updatedEditingRow = {
      ...editingRow,
      [column]: value,
    };
    setEditingRow(updatedEditingRow);
    
    // Also update the filtered data for immediate UI feedback
    const newFilteredData = filteredData.map(row => 
      row.id === editingRow?.id ? {...row, [column]: value} : row
    );
    setFilteredData(newFilteredData);
    
    // Clear any validation errors for this field
    if (validationErrors[column]) {
      const newErrors = { ...validationErrors };
      delete newErrors[column];
      setValidationErrors(newErrors);
    }
  };

  // Save edited row with improved error handling
  const handleSaveEdit = async () => {
    if (!editingRow) return;
    
    try {
      toast.loading('Saving changes...');
      
      // Ensure created_at is set
      if (!editingRow.created_at || editingRow.created_at === '') {
        editingRow.created_at = new Date().toISOString();
      }
      
      console.log(`Updating row in ${table.name}:`, editingRow);
      
      // Process data before submitting
      const processedData = processFieldData(editingRow);
      console.log('Processed data for update:', processedData);
      
      // Update row in database
      const { data, error } = await supabase
        .from(table.name.toLowerCase())
        .update(processedData)
        .eq('id', editingRow.id)
        .select();
      
      if (error) {
        console.error(`Update error in ${table.name}:`, error);
        toast.dismiss();
        toast.error(error.message || 'Failed to update record');
        
        // Set validation errors if we can determine them
        if (error.message.includes('violates not-null constraint')) {
          const field = error.message.match(/column "([^"]+)"/)
          if (field && field[1]) {
            setValidationErrors({
              [field[1]]: `${field[1]} is required`
            });
          }
        }
        return;
      }
      
      toast.dismiss();
      toast.success('Record updated successfully');
      
      // Exit edit mode and refresh data
      setIsEditing(false);
      setEditingRow(null);
      setValidationErrors({});
      loadTableData(); // Refresh data after successful update
    } catch (err) {
      console.error('Error in handleSaveEdit:', err);
      toast.dismiss();
      toast.error('An error occurred while updating the record');
    }
  };

  // Initialize new row for insert
  const handleInsertClick = () => {
    const initialNewRow: Record<string, any> = {};
    
    // Get the last ID for auto-increment suggestions
    let lastStudentId = '1000';
    if (table.name === 'students' && data.length > 0) {
      // Find highest student_id
      const studentIds = data
        .map(row => row.student_id)
        .filter(id => id && !isNaN(Number(id)))
        .map(id => Number(id));
      
      if (studentIds.length > 0) {
        lastStudentId = (Math.max(...studentIds) + 1).toString();
      }
    }
    
    allColumns.forEach(column => {
      if (column === 'center_id' && table.center_id) {
        initialNewRow[column] = table.center_id.toString();
      } else if (column === 'program_id' && table.program_id) {
        initialNewRow[column] = table.program_id.toString();
      } else if (column === 'created_at') {
        initialNewRow[column] = new Date().toISOString();
      } else if (column === 'student_id' && table.name === 'students') {
        initialNewRow[column] = lastStudentId;
      } else if (column === 'status') {
        initialNewRow[column] = 'Active';
      } else {
        initialNewRow[column] = '';
      }
    });
    
    console.log('New row template:', initialNewRow);
    setNewRow(initialNewRow);
    setIsInsertDialogOpen(true);
    setValidationErrors({});
  };

  // Handle change in insert form
  const handleInsertChange = (column: string, value: any) => {
    setNewRow({
      ...newRow,
      [column]: value,
    });
    
    if (validationErrors[column]) {
      const newErrors = { ...validationErrors };
      delete newErrors[column];
      setValidationErrors(newErrors);
    }
  };

  // Submit new row
  const handleInsertSubmit = async () => {
    try {
      if (!newRow.created_at || newRow.created_at === '') {
        newRow.created_at = new Date().toISOString();
      }
      
      console.log(`Inserting row into ${table.name}:`, newRow);
      
      const result = await insertRow(table.name, newRow);
      if (result.success) {
        toast.success('Record added successfully', {
          duration: 3000,
          dismissible: true
        });
        setIsInsertDialogOpen(false);
        setNewRow({});
        setValidationErrors({});
      } else if (result.errors) {
        console.error('Insert errors:', result.errors);
        setValidationErrors(result.errors);
        toast.error('Please correct the validation errors', {
          duration: 3000,
          dismissible: true
        });
      }
    } catch (err) {
      console.error('Error in handleInsertSubmit:', err);
      toast.error('An error occurred while adding the record', {
        duration: 3000,
        dismissible: true
      });
    }
  };

  // Open voice input dialog
  const handleOpenVoiceInputDialog = () => {
    setIsVoiceInputDialogOpen(true);
  };

  // Handle voice input completion
  const handleVoiceInputComplete = async (data: Record<string, any>) => {
    try {
      console.log(`Inserting row into ${table.name} from voice input:`, data);
      
      if (table.center_id && !data.center_id) {
        data.center_id = table.center_id;
      }
      
      if (table.program_id && !data.program_id) {
        data.program_id = table.program_id;
      }
      
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }
      
      const result = await insertRow(table.name, data);
      if (result.success) {
        toast.success('Record added successfully via voice input', {
          duration: 3000,
          dismissible: true
        });
        setIsVoiceInputDialogOpen(false);
      } else if (result.errors) {
        console.error('Insert errors from voice input:', result.errors);
        toast.error('Failed to add record. Please try again.', {
          duration: 3000,
          dismissible: true
        });
      }
    } catch (err) {
      console.error('Error in handleVoiceInputComplete:', err);
      toast.error('An error occurred while adding the record', {
        duration: 3000,
        dismissible: true
      });
    }
  };

  // Clear search and filters
  const clearFilters = () => {
    setFilterValues({});
    setSearchTerm('');
  };

  // Apply filter
  const handleFilterChange = (column: string, value: string) => {
    setFilterValues(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Handle image upload click
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Loading state
  if (loading || refDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorDisplay message={error} onRetry={loadTableData} />;
  }

  const isFiltered = searchTerm !== '' || Object.values(filterValues).some(v => v !== '');

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <TableActions 
          tableName={table.name} 
          onInsert={handleInsertClick}
          onRefresh={loadTableData}
        />
        
        <Button 
          onClick={handleOpenVoiceInputDialog}
          variant="outline"
          className="border-ishanya-green text-ishanya-green hover:bg-ishanya-green/10"
        >
          <span className="mr-2">🎤</span>
          Add with Voice
        </Button>
      </div>
      
      <FilterSection
        columns={columns}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterValues={filterValues}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        isFiltered={isFiltered}
        formatColumnName={formatColumnName}
        displayColumns={displayColumns}
      />
      
      <DataTable
        displayColumns={displayColumns}
        filteredData={filteredData}
        formatColumnName={formatColumnName}
        isEditing={isEditing}
        editingRow={editingRow}
        validationErrors={validationErrors}
        handleEditChange={handleEditChange}
        handleSaveEdit={handleSaveEdit}
        handleEditClick={handleEditClick}
        handleViewDetails={handleViewDetails}
        handleDeleteRow={handleDeleteRow}
        isFieldRequired={(column) => isFieldRequired(column, table.name)}
        getPlaceholder={getPlaceholder}
        shouldUseDropdown={shouldUseDropdown}
        shouldUseDatePicker={shouldUseDatePicker}
        shouldUseTextarea={shouldUseTextarea}
        shouldUseImageUpload={shouldUseImageUpload}
        getDropdownOptions={getDropdownOptions}
        onImageUploadClick={handleImageUploadClick}
      />

      {/* Insert Dialog */}
      <InsertDialog
        isOpen={isInsertDialogOpen}
        onOpenChange={setIsInsertDialogOpen}
        allColumns={allColumns}
        newRow={newRow}
        validationErrors={validationErrors}
        onInsertSubmit={handleInsertSubmit}
        onInsertChange={handleInsertChange}
        formatColumnName={formatColumnName}
        shouldHideColumn={(column) => shouldHideColumn(column, userRole)}
        isFieldRequired={(column) => isFieldRequired(column, table.name)}
        getPlaceholder={getPlaceholder}
        shouldUseDropdown={shouldUseDropdown}
        shouldUseDatePicker={shouldUseDatePicker}
        shouldUseTextarea={shouldUseTextarea}
        shouldUseImageUpload={shouldUseImageUpload}
        getDropdownOptions={getDropdownOptions}
        onImageUploadClick={handleImageUploadClick}
      />

      {/* Detailed View Dialog */}
      <DetailedViewDialog
        isOpen={isDetailedViewOpen}
        onOpenChange={setIsDetailedViewOpen}
        detailedViewRow={detailedViewRow}
        isEditMode={isEditModeInDetailView}
        validationErrors={validationErrors}
        allColumns={allColumns}
        formatColumnName={formatColumnName}
        shouldHideColumn={(column) => shouldHideColumn(column, userRole)}
        isColumnEditable={isColumnEditable}
        isFieldRequired={(column) => isFieldRequired(column, table.name)}
        getPlaceholder={getPlaceholder}
        shouldUseDropdown={shouldUseDropdown}
        shouldUseDatePicker={shouldUseDatePicker}
        shouldUseTextarea={shouldUseTextarea}
        shouldUseImageUpload={shouldUseImageUpload}
        getDropdownOptions={getDropdownOptions}
        onSave={handleSaveDetailedView}
        onDelete={() => {
          if (detailedViewRow) {
            handleDeleteRow(detailedViewRow.id);
            setIsDetailedViewOpen(false);
          }
        }}
        onImageUploadClick={handleImageUploadClick}
        onEditModeToggle={handleToggleEditMode}
        onRowChange={(column, value) => {
          if (detailedViewRow) {
            setDetailedViewRow({...detailedViewRow, [column]: value});
          }
        }}
        tableName={table.name}
      />
      
      <VoiceInputDialog 
        isOpen={isVoiceInputDialogOpen}
        onClose={() => setIsVoiceInputDialogOpen(false)}
        table={table.name}
        onComplete={handleVoiceInputComplete}
      />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Determine which context we're in and update accordingly
            if (isEditing && editingRow) {
              const column = 'photo'; // Default to photo column
              const url = await handleImageUpload(file, editingRow, column);
              if (url) {
                handleEditChange(column, url);
              }
            } else if (isInsertDialogOpen) {
              const column = 'photo';
              const url = await handleImageUpload(file, newRow, column);
              if (url) {
                handleInsertChange(column, url);
              }
            } else if (isEditModeInDetailView && detailedViewRow) {
              const column = 'photo';
              const url = await handleImageUpload(file, detailedViewRow, column);
              if (url) {
                setDetailedViewRow({
                  ...detailedViewRow,
                  [column]: url
                });
              }
            }
          }
        }}
      />
    </div>
  );
};

export default TableView;
