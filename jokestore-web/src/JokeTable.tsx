import * as React from 'react';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, IconButton, TextField, Toolbar } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import JokeCreateForm from './JokeCreateForm';
import { Database, getDatabase, ref, onValue, set } from "firebase/database";
import { Firestore, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { User } from 'firebase/auth';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "transparent",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    borderRadius: 6,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

function createData(jokeid: number, content: string, categories:string[], timesUsed: number, timeAdded: Date) : Joke {
  return {jokeid, content, categories, timesUsed, timeAdded};
}

interface Props {
  db: Firestore;
  user: User;
}

export interface Joke {
  jokeid: number
  content: string;
  categories: string[];
  timesUsed: number;
  timeAdded: Date;
}

export const jokeConverter = {
  toFirestore: (joke : any) => {
      return {
          jokeid: joke.id,
          content: joke.content,
          categories: joke.categories,
          timesUsed: 0,
          timeAdded: joke.timeAdded
      };
  },
  fromFirestore: (snapshot : any, options : any) : Joke => {
    const data = snapshot.data(options);
    const d = new Date(0); // The 0 there is the key, which sets the date to the epoch
    d.setUTCSeconds(data.timeAdded);
    return {jokeid: data.jokeid, content: data.content, categories: data.categories, timesUsed: 0, timeAdded: d};
  }
};

export default function JokeTable({ db, user }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [jokes, setJokes] = React.useState<Joke[]>([]);
  const [jokeAdded, setJokeAdded] = React.useState<boolean>(false);

  React.useEffect(() =>  {
    const ReadJoke = async () => {
      const q = query(collection(db, "jokes"), where("uid", "==", user.uid)).withConverter(jokeConverter);
      const querySnapshot = await getDocs(q);
      const jokes = querySnapshot.docs.map(docSnapshot => docSnapshot.data())
      setJokes(jokes);
    } 
    ReadJoke().catch(console.error)
    setJokeAdded(false)
  }, [db, jokeAdded])

  return (
    <div>
       <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar>
          JOKES
        </Toolbar>
        <IconButton color="primary" aria-label="add a joke" onClick={() => {
            setShowForm(!showForm)
        }}>
          <AddCircleOutlineIcon />
        </IconButton>
      </Box>
      {showForm && <JokeCreateForm user={user} db={db} setJokeAdded={setJokeAdded}/>}
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>Joke</StyledTableCell>
            <StyledTableCell align="right">Categories</StyledTableCell>
            <StyledTableCell align="right">Times Used</StyledTableCell>
            <StyledTableCell align="right">Create New Version</StyledTableCell>
            <StyledTableCell align="right">Add Tag</StyledTableCell>
            <StyledTableCell align="right">Date Added</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jokes.map((joke) => (
            <StyledTableRow key={joke.jokeid}>
              <StyledTableCell component="th" scope="row">
                {joke.content}
              </StyledTableCell>
              <StyledTableCell align="right">{joke.categories}</StyledTableCell>
              <StyledTableCell align="right">
               {joke.timesUsed}
              </StyledTableCell>
              <StyledTableCell align="right">
                <IconButton aria-label="delete" color="secondary">
                    <AddCircleOutlineIcon />
                </IconButton>
              </StyledTableCell>
              <StyledTableCell align="right">  <IconButton color="secondary">
                    <AddCircleOutlineIcon />
                </IconButton>
              </StyledTableCell>
              <StyledTableCell align="right">
              {joke.timeAdded.toDateString()}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
}