
const React = require('react');

// Mock that accepts any input for testing
module.exports = function MockGooglePlacesAutocomplete(props) {
  const [inputValue, setInputValue] = React.useState(props.selectProps?.value?.label || '');
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  // Create dynamic option based on input
  const option = { 
    label: inputValue || 'London, UK', 
    value: inputValue || 'London, UK' 
  };
  const match = inputValue.length > 0;

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowDropdown(newValue.length > 0);
    // Call onChange immediately to simulate real behavior
    if (newValue.trim()) {
      props.selectProps?.onChange?.({ label: newValue, value: newValue });
    }
  };

  const handleSelect = () => {
    setInputValue(option.label);
    setShowDropdown(false);
    props.selectProps?.onChange?.(option);
  };

  const handleKeyDown = (e) => {
    if (showDropdown && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      handleSelect();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        id="react-select-mock"
        value={inputValue}
        placeholder={props.selectProps?.placeholder || ''}
        onChange={handleChange}
        onFocus={() => setShowDropdown(match)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        data-testid="destination-input"
      />
      {showDropdown && match && (
        <div
          data-testid="mock-google-places-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ccc',
            zIndex: 1000,
            cursor: 'pointer',
          }}
        >
          <div
            onMouseDown={handleSelect}
            style={{ padding: 8 }}
            data-testid="mock-google-places-option"
          >
            {option.label}
          </div>
        </div>
      )}
    </div>
  );
};
