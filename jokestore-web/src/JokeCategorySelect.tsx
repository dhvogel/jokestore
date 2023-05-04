import * as React from 'react';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface Props {
  db: Firestore;
  user: User;
  categories: any;
  setCategories: React.Dispatch<any>;
  savedCategories: any;
  setSavedCategories: React.Dispatch<any>;
}

export const categoryConverter = {
  toFirestore: (joke : any) => {
      return {
          content: joke.content,
          categories: joke.categories,
          timesUsed: 0,
          timeAdded: joke.timeAdded
      };
  },
  fromFirestore: (snapshot : any, options : any) : string[] => {
    const data = snapshot.data(options);
    return data.categories;
  }
};

const filter = createFilterOptions<string[]>();

export default function FixedTags({ db, user, categories, setCategories, savedCategories, setSavedCategories }: Props) {
  React.useEffect(() =>  {
    const ReadJoke = async () => {
      const q = query(collection(db, "categories"), where("uid", "==", user.uid)).withConverter(categoryConverter);
      const querySnapshot = await getDocs(q);
      const savedCategories = querySnapshot.docs.map(docSnapshot => docSnapshot.data())
      setSavedCategories(savedCategories);
    } 
    ReadJoke().catch(console.error)
  }, [db])

  return (
    <Autocomplete
      multiple
      id="fixed-tags-demo"
      value={categories}
      onChange={(event, newValue) => {
        setCategories([
          ...newValue
        ]);
      }}
      options={savedCategories[0]}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        const { inputValue } = params;
        // Suggest the creation of a new value
        const isExisting = options.some((option) => inputValue === option.title);
        if (inputValue !== '' && !isExisting && filtered.length === 0) {
          filtered.push(
            [`${inputValue}`]
          );
        }

        return filtered;
      }}
      getOptionLabel={(option) => option}
      style={{ width: 500 }}
      renderInput={(params) => (
        <TextField {...params} label="Categories" placeholder="Favorites" />
      )}
    />
  );
}

// Top 100 films as rated by IMDb users. http://www.imdb.com/chart/top
const top100Films = [
  'SEX',
  'DRUGS',
  'ROCK AND ROLL'
];