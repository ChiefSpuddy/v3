import React from 'react';
import styles from './Home.module.css';
import pikachuBaloon from '../Assets/pikachu-baloon.gif';

const Home = () => {
  return (
    <div className={styles['home-container']}>
      <img src={pikachuBaloon} alt="Pikachu Baloon" className={styles['home-gif']} />
      <h1 className={styles['home-heading']}>Welcome to Spuds Card Hub</h1>
      <p className={styles['home-paragraph']}>Card Scanner - WIP</p>
      <a href="/scanner" className={styles['home-link']}>Go to Card Scanner</a>
    </div>
  );
};

export default Home;