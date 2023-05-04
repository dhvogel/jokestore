import React, {useState} from 'react';
import { TextField, Button, Stack } from '@mui/material';
import JokeCategorySelect from './JokeCategorySelect';
import { Firestore, addDoc, collection } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Joke } from './JokeTable';
import { randomUUID } from 'crypto';
 
interface Props {
    db: Firestore;
    user: User;
}

 
const JokeCreateForm = ({ db, user }: Props) => {
    const [showErrorMessage, setShowErrorMessage] = React.useState(false);
    const [content, setContent] = React.useState('')
    const [categories, setCategories] = React.useState<any>([]);

    const addJoke = async () => {
        if (content === '') {
            setShowErrorMessage(true)
            return
        }
        setShowErrorMessage(false)
        const epochSeconds = Math.floor(new Date().getTime() / 1000)
        await addDoc(collection(db, "jokes"), {
            uid: user.uid,
            jokeid: epochSeconds, // jokeID is epoch seconds for now
            content: content,
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
                    onChange={e => setContent(e.target.value)}
                    value={content}
                    rows={4}
                    fullWidth
                    multiline
                    required
                />
                <JokeCategorySelect user={user} db={db} categories={categories} setCategories={setCategories} />
                <Button variant="outlined" color="secondary" type="submit" onClick={addJoke}>Add Joke</Button>
                {showErrorMessage && <p style={{color: "red"}}>Please fill in a joke</p>}
            </form>
     
        </React.Fragment>
    )
}
 
export default JokeCreateForm;