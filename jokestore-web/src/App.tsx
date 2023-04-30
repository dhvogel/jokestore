import React from 'react';
import logo from './logo.svg';
import './App.css';
import ResponsiveAppBar from './ResponsiveAppBar';
import JokeTable from './JokeTable';
import ShowTable from './ShowTable';
import { Auth } from "firebase/auth";
import { useAuthState } from 'react-firebase-hooks/auth';
import { SignInButton } from './SignInButton';

interface Props {
  auth: Auth;
}

function App({ auth }: Props) {
  const [user] = useAuthState(auth);
  return (
    <div className="App">
    {
      user ? 
      <div>
        <ResponsiveAppBar auth={auth} />
        <br />
        <JokeTable />
        <br />
        <ShowTable />
      </div> : 
      <div>
        <SignInButton auth={auth} />
      </div>
    }
    </div>

  );
}

export default App;
