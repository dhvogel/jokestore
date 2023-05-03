import React, {useState} from 'react';
import { TextField, Button, Stack } from '@mui/material';
import JokeCategorySelect from './JokeCategorySelect';
import { Firestore, addDoc, collection } from 'firebase/firestore';
import { User } from 'firebase/auth';
 
interface Props {
    db: Firestore;
    user: User;
  }
 
const JokeCreateForm = ({ db, user }: Props) => {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [password, setPassword] = useState('')

    const addJoke = async () => {
        const epochSeconds = new Date().getTime() / 1000
        await addDoc(collection(db, "jokes"), {
            uid: user.uid,
            jokeid: "foo",
            content: "My work place just put in these new gender neutral bathrooms. I can't believe it. What a great place to meet women.",
            timeAdded: epochSeconds,
            categories: ["bar", "baz", "quux"]
        });
    }
 
    return (
        <React.Fragment>
            <h2>Add Joke</h2>
            <form>
               
                    <TextField
                        type="text"
                        variant='outlined'
                        color='secondary'
                        label="Joke"
                        onChange={e => setFirstName(e.target.value)}
                        value={firstName}
                        rows={4}
                        fullWidth
                        multiline
                        required
                    />
                <JokeCategorySelect />
                <Button variant="outlined" color="secondary" type="submit" onClick={addJoke}>Add Joke</Button>
            </form>
     
        </React.Fragment>
    )
}
 
export default JokeCreateForm;