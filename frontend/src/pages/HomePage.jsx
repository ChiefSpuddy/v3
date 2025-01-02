import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
    return (
        <div>
            <h1>Welcome to the Pokémon Card Scanner!</h1>
            <nav>
                <Link to="/cardscanner">Go to Card Scanner</Link>
            </nav>
        </div>
    );
};

export default HomePage;
