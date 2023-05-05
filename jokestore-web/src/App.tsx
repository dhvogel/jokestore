import React from 'react';
import logo from './logo.svg';
import './App.css';
import ResponsiveAppBar from './ResponsiveAppBar';
import JokeTable from './JokeTable';
import BitTable from './BitTable';
import { Auth } from "firebase/auth";
import { useAuthState } from 'react-firebase-hooks/auth';
import { SignInButton } from './SignInButton';
import { Firestore } from 'firebase/firestore';

interface Props {
  auth: Auth;
  db: Firestore;
}

function App({ auth, db }: Props) {
  const [user] = useAuthState(auth);
  return (
    <div className="App">
    {
      user ? 
      <div>
        <ResponsiveAppBar auth={auth} />
        <br />
        <JokeTable db={db} user={user}/>
        <br />
        {/*<BitTable />*/}
      </div> : 
      <div>
        <SignInButton auth={auth} db={db} />
      </div>
    }
    </div>

  );
}

export default App;
