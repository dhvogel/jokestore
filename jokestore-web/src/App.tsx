import React from 'react';
import logo from './logo.svg';
import './App.css';
import ResponsiveAppBar from './ResponsiveAppBar';
import JokeTable from './JokeTable';
import ShowTable from './ShowTable';

function App() {
  return (
    <div className="App">
      <ResponsiveAppBar />
      <br />
      <JokeTable />
      <br />
      <ShowTable />
    </div>
  );
}

export default App;
