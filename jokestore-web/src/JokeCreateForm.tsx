import React, {useState} from 'react';
import { TextField, Button, Stack } from '@mui/material';
import JokeCategorySelect from './JokeCategorySelect';
import { Firestore, addDoc, arrayUnion, collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Joke } from './JokeTable';
import { randomUUID } from 'crypto';
 
interface Props {
    db: Firestore;
    user: User;
    setShouldUpdateJokeTable: React.Dispatch<boolean>;
}

 
const JokeCreateForm = ({ db, user, setShouldUpdateJokeTable }: Props) => {
    const [showErrorMessage, setShowErrorMessage] = React.useState(false);
    const [content, setContent] = React.useState('')
    const [categories, setCategories] = React.useState<any>([]);
    const [savedCategories, setSavedCategories] = React.useState<string[][]>([[]]);
    const [jokeAdded, setJokeAdded] = React.useState<string>("false");

    const addJoke = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (content === '') {
            setShowErrorMessage(true)
            return
        }
        setShowErrorMessage(false)
        const flatCategories : string[] = categories
                .reduce((accumulator:any, value:any) => accumulator.concat(value), [])
                .map((category:string) => category.toUpperCase())
        const q = query(collection(db, "categories"), where("uid", "==", user.uid))
        const querySnapshot = await getDocs(q)
        // If no document reference is returned, then create the per-user category document.
        // Else, modify the existing category document.
        if (querySnapshot.docs.length === 0) {
            await addDoc(collection(db, "categories"), {
                uid: user.uid,
                categories: flatCategories,
            })
        } else {
            const categoriesRef = querySnapshot.docs[0].ref
            const existingCategories = querySnapshot.docs.map(docSnapshot => docSnapshot.data())[0].categories
            await updateDoc(categoriesRef, {
                categories: arrayUnion(...existingCategories, ...flatCategories)
            });
        }
        const epochSeconds = Math.floor(new Date().getTime() / 1000)
        await addDoc(collection(db, "jokes"), {
            uid: user.uid,
            jokeid: epochSeconds, // jokeID is epoch seconds for now
            content: content,
            timeAdded: epochSeconds,
            categories: flatCategories,
        });
        setCategories([])
        setContent("")
        setShouldUpdateJokeTable(true)
    }
 
    return (
        <React.Fragment>
            <h2>Add Joke</h2>
            <form style={{padding:20, paddingTop:0}}>
                <TextField
                    id="jokefield"
                    type="text"
                    variant='outlined'
                    color='secondary'
                    label="Joke"
                    onChange={e => setContent(e.target.value)}
                    sx={{
                        paddingBottom: 2
                    }}
                    value={content}
                    rows={4}
                    fullWidth
                    multiline
                    required
                />
                <div style={{paddingBottom: 5}}>
                    <JokeCategorySelect 
                        user={user} 
                        db={db} 
                        categories={categories} 
                        setCategories={setCategories}
                        savedCategories={savedCategories}
                        setSavedCategories={setSavedCategories}
                        jokeAdded={jokeAdded}
                    />
                </div>
                <Button variant="outlined" color="secondary" type="submit" onClick={addJoke}>Add Joke</Button>
                {showErrorMessage && <p style={{color: "red"}}>Please fill in a joke</p>}
            </form>
     
        </React.Fragment>
    )
}
 
export default JokeCreateForm;