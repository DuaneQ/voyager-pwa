
const React = require('react');

// Only show dropdown if input matches 'London' (case-insensitive)
module.exports = function MockGooglePlacesAutocomplete(props) {
  const [inputValue, setInputValue] = React.useState(props.selectProps?.value?.label || '');
  const [showDropdown, setShowDropdown] = React.useState(false);
  const option = { label: 'London, UK', value: 'London, UK' };
  const match = inputValue.toLowerCase().includes('london');

  const handleChange = (e) => {
    setInputValue(e.target.value);
    setShowDropdown(e.target.value.length > 0 && e.target.value.toLowerCase().includes('london'));
    // Do not call onChange here, only on selection
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
        data-testid="mock-google-places-input"
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
