import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="home-container">
      <h1 className="home-heading">Welcome to the Card Scanning App</h1>
      <p className="home-paragraph">
        Use this app to scan and manage your Pokémon card collection.
      </p>
      <a href="/scanner" className="home-button">
        Go to Card Scanner
      </a>
    </div>
  );
}

export default Home;
