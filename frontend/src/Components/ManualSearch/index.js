import React, { useState } from 'react';
import './ManualSearch.css';

const ManualSearch = ({ onSearch, initialError }) => {
  const [cardName, setCardName] = useState('');
  const [setNumber, setSetNumber] = useState('');
  const [error, setError] = useState(initialError);

  const handleSearch = () => {
    if (!cardName) {
      setError('Please enter a card name');
      return;
    }
    onSearch({ name: cardName, setNumber });
  };

  return (
    <div className="manual-search">
      <h3>Manual Search</h3>
      <input
        type="text"
        placeholder="Card Name"
        value={cardName}
        onChange={(e) => setCardName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Set Number (optional)"
        value={setNumber}
        onChange={(e) => setSetNumber(e.target.value)}
      />
      <button onClick={handleSearch}>
        Search eBay
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default ManualSearch;