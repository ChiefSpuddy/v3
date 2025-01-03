import React, { useState, useEffect } from 'react';

const ManualSearch = ({ 
  initialCardName = '', 
  initialSetNumber = '', 
  onSearch, 
  className = '',
  error = null 
}) => {
  const [cardName, setCardName] = useState(initialCardName);
  const [setNumber, setSetNumber] = useState(initialSetNumber);

  useEffect(() => {
    setCardName(initialCardName);
    setSetNumber(initialSetNumber);
  }, [initialCardName, initialSetNumber]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ 
      name: cardName.trim(), 
      setNumber: setNumber.trim() 
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`manual-search ${className}`}>
      <div className="input-group">
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="Card Name"
          className="manual-input"
        />
      </div>
      <div className="input-group">
        <input
          type="text"
          value={setNumber}
          onChange={(e) => setSetNumber(e.target.value)}
          placeholder="Set Number (e.g. 036/119)"
          className="manual-input"
        />
      </div>
      {error && <p className="error-message">{error}</p>}
      <button 
        type="submit" 
        className="search-button"
        disabled={!cardName.trim()}
      >
        Search eBay
      </button>
    </form>
  );
};

export default ManualSearch;
