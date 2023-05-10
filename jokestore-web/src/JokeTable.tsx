import * as React from 'react';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Chip, IconButton, TextField, Toolbar } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import JokeCreateForm from './JokeCreateForm';
import { Database, getDatabase, ref, onValue, set } from "firebase/database";
import { Firestore, addDoc, collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
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

function createData(jokeid: number, setup: string, punch: string, categories:string[], timesUsed: number, timeAdded: Date) : Joke {
  return {jokeid, setup, punch, categories, timesUsed, timeAdded};
}

interface Props {
  db: Firestore;
  user: User;
}

export interface Joke {
  jokeid: number;
  setup: string;
  punch: string;
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
    return {jokeid: data.jokeid, setup: data.setup, punch: data.punch, categories: data.categories, timesUsed: 0, timeAdded: d};
  }
};

export default function JokeTable({ db, user }: Props) {
  const [showForm, setShowForm] = React.useState(false);
  const [showJokeSearch, setShowJokeSearch] = React.useState(false);
  const [showCategorySearch, setShowCategorySearch] = React.useState(false);
  const [jokes, setJokes] = React.useState<Joke[]>([]);
  const [filteredJokes, setFilteredJokes] = React.useState<Joke[]>([]);
  const [filteredCategories, setFilteredCategories] = React.useState<Joke[]>([]);
  const [shouldUpdateJokeTable, setShouldUpdateJokeTable] = React.useState<boolean>(false);

  React.useEffect(() =>  {
    const ReadJoke = async () => {
      const q = query(collection(db, "jokes"), where("uid", "==", user.uid)).withConverter(jokeConverter);
      const querySnapshot = await getDocs(q);
      const jokes = querySnapshot.docs.map(docSnapshot => docSnapshot.data())
      setJokes(jokes);
    } 
    ReadJoke().catch(console.error)
    setShouldUpdateJokeTable(false)
  }, [db, shouldUpdateJokeTable])

  React.useEffect(() => {
    setFilteredJokes(jokes)
    setFilteredCategories(jokes)
  }, [jokes])

  const deleteJoke = async (e: React.MouseEvent, jokeid : number) => {
    const q = query(collection(db, "jokes"), where("jokeid", "==", jokeid))
    const querySnapshot = await getDocs(q)
    const jokeRef = querySnapshot.docs[0].ref
    await deleteDoc(jokeRef);
    setShouldUpdateJokeTable(true)
  }

  const filterJokes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value:string = event.target.value
    setFilteredJokes(jokes.filter(joke => {
      const fullContent:string = `${joke.setup} ${joke.punch}`
      return fullContent.includes(value)
   }))
  }

  const filterCategories = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value:string = event.target.value
    setFilteredCategories(jokes.filter(joke => {
      const cats : string[] = joke.categories
      let match : boolean = false
      cats.forEach((cat) => {
        if (cat.includes(value.toUpperCase())) {
          match = true
        }
      })
      return match
   }))
  }

  return (
    <div style={{padding: 20}}>
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
      {showForm && <JokeCreateForm user={user} db={db} setShouldUpdateJokeTable={setShouldUpdateJokeTable}/>}
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>
              Joke
              <IconButton aria-label="search" onClick={() => {setShowJokeSearch(!showJokeSearch)}}>
                <SearchIcon />
              </IconButton>
              {showJokeSearch && <div><TextField variant="standard" size="small" onChange={filterJokes}/></div>}
            </StyledTableCell>
            <StyledTableCell align="right">
              Categories
              <IconButton aria-label="search" onClick={() => {setShowCategorySearch(!showCategorySearch)}}>
                <SearchIcon />
              </IconButton>
              {showCategorySearch && <div><TextField variant="standard" size="small" onChange={filterCategories}/></div>}
            </StyledTableCell>
            <StyledTableCell align="right">Times Used</StyledTableCell>
            <StyledTableCell align="right">Create New Version</StyledTableCell>
            <StyledTableCell align="right">Add Tag</StyledTableCell>
            <StyledTableCell align="right">Date Added</StyledTableCell>
            <StyledTableCell align="right">Delete</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredCategories.filter((c) => filteredJokes.includes(c)).map((joke) => (
            <StyledTableRow key={joke.jokeid}>
              <StyledTableCell component="th" scope="row">
                {joke.setup} <b>{joke.punch}</b>
              </StyledTableCell>
              <StyledTableCell align="right">
                {joke.categories.map((category) => {
                  return (<div style={{paddingBottom: 5}}><Chip label={category}/><br/></div>)
                })}
              </StyledTableCell>
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
              <StyledTableCell align="right">
                <IconButton aria-label="delete" color="error" onClick={(e) => {deleteJoke(e, joke.jokeid)}}>
                    <DeleteIcon />
                </IconButton>
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
}