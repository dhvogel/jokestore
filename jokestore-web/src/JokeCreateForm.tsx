import React, {useState} from 'react';
import { TextField, Button, Stack } from '@mui/material';
import JokeCategorySelect from './JokeCategorySelect';
 
 
const JokeCreateForm = () => {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [password, setPassword] = useState('')
 
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
                <Button variant="outlined" color="secondary" type="submit">Add Joke</Button>
            </form>
     
        </React.Fragment>
    )
}
 
export default JokeCreateForm;