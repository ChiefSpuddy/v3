import React from 'react';
import styles from './Home.module.css';

const Home = () => {
  return (
    <div className={styles['home-container']}>
      <h1 className={styles['home-heading']}>Welcome to the Home Page</h1>
      <p className={styles['home-paragraph']}>This is a paragraph on the home page.</p>
      <a href="/about" className={styles['home-link']}>Go to About Page</a>
    </div>
  );
};

export default Home;