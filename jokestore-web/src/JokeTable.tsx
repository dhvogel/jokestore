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

function createData(
  joke: string,
  categories: string[],
  timesUsed: number,
) {
  return { joke, categories, timesUsed};
}

const rows = [
  createData('My workplace just got these gender neutral bathrooms...', ["A", "B"], 1000),
  createData('I studied hard. Seriously, I had this persistent boner.', ["C", "D"], 2)
];

export default function JokeTable() {
  const [showForm, setShowForm] = React.useState(false);
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
      {showForm && <JokeCreateForm/>}
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>Joke</StyledTableCell>
            <StyledTableCell align="right">Categories</StyledTableCell>
            <StyledTableCell align="right">Times Used</StyledTableCell>
            <StyledTableCell align="right">Create New Version</StyledTableCell>
            <StyledTableCell align="right">Add Tag</StyledTableCell>
            <StyledTableCell align="right">Last Updated</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <StyledTableRow key={row.joke}>
              <StyledTableCell component="th" scope="row">
                {row.joke}
              </StyledTableCell>
              <StyledTableCell align="right">{row.categories}</StyledTableCell>
              <StyledTableCell align="right">
               {row.timesUsed}
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
              {"4/28/23"}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
}