
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePickerInput from '@/components/ui/DatePickerInput';
import ImageUploader from './ImageUploader';

export interface TableFieldProps {
  column: string;
  value: any;
  onChange: (column: string, value: any) => void;
  isRequired?: boolean;
  mode?: 'edit' | 'view' | 'insert';
  validationErrors?: Record<string, string>;
  getPlaceholder: (column: string) => string;
  shouldUseDropdown: (column: string) => boolean;
  shouldUseDatePicker: (column: string) => boolean;
  shouldUseTextarea: (column: string) => boolean;
  shouldUseImageUpload: (column: string) => boolean;
  getDropdownOptions: (column: string) => Array<{ value: string; label: string }>;
  onImageUploadClick?: () => void;
}

const TableField: React.FC<TableFieldProps> = ({
  column,
  value,
  onChange,
  isRequired = false,
  mode = 'edit',
  validationErrors = {},
  getPlaceholder,
  shouldUseDropdown,
  shouldUseDatePicker,
  shouldUseTextarea,
  shouldUseImageUpload,
  getDropdownOptions,
  onImageUploadClick
}) => {
  const [localValue, setLocalValue] = useState(value);
  
  // Update local value when prop value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // If in view mode and not an image field, just display the value
  if (mode === 'view' && !shouldUseImageUpload(column)) {
    return <div className="text-gray-800">{value || ''}</div>;
  }

  // Image Upload Field
  if (shouldUseImageUpload(column)) {
    return (
      <ImageUploader
        value={value}
        onChange={(url) => onChange(column, url)}
        column={column}
        disabled={mode === 'view'}
      />
    );
  }

  // Handle local change and propagate to parent
  const handleLocalChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(column, newValue);
  };

  // Dropdown Field
  if (shouldUseDropdown(column)) {
    return (
      <Select
        value={String(localValue || '')}
        onValueChange={(newValue) => handleLocalChange(newValue)}
        disabled={mode === 'view'}
      >
        <SelectTrigger className={validationErrors[column] ? 'border-red-500' : ''}>
          <SelectValue placeholder={getPlaceholder(column)} />
        </SelectTrigger>
        <SelectContent>
          {getDropdownOptions(column).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Date Picker Field
  if (shouldUseDatePicker(column)) {
    let dateValue: Date | undefined;
    
    if (localValue) {
      try {
        dateValue = new Date(localValue);
        if (isNaN(dateValue.getTime())) {
          dateValue = undefined;
        }
      } catch (e) {
        console.error(`Error parsing date for ${column}:`, e);
        dateValue = undefined;
      }
    }
    
    return (
      <DatePickerInput
        value={dateValue}
        onChange={(date) => handleLocalChange(date ? date.toISOString().split('T')[0] : '')}
        placeholder={getPlaceholder(column)}
        disabled={mode === 'view'}
      />
    );
  }

  // Textarea Field
  if (shouldUseTextarea(column)) {
    return (
      <Textarea
        value={localValue || ''}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={getPlaceholder(column)}
        className={`min-h-[100px] border focus:ring ${validationErrors[column] ? 'border-red-500' : ''}`}
        disabled={mode === 'view'}
      />
    );
  }

  // Default Input Field
  return (
    <Input
      value={localValue || ''}
      onChange={(e) => handleLocalChange(e.target.value)}
      placeholder={getPlaceholder(column)}
      className={`border focus:ring ${validationErrors[column] ? 'border-red-500' : ''}`}
      disabled={mode === 'view'}
    />
  );
};

export default TableField;
