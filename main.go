package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io/ioutil"
	"log"
	"os"
	"strings"
	"time"

	"github.com/bit101/go-ansi"
	"github.com/urfave/cli/v2"
	"golang.org/x/exp/slices"
	"golang.org/x/term"
)

type JokeStore struct {
	Jokes      []Joke
	Categories []string
	Shows      []Show
}

type Show struct {
	ID       uint32
	Jokes    []string // list of jokeIDs
	Notes    string
	Location string
	Time     time.Time
}

type Joke struct {
	ID         uint32
	Content    string
	Categories []string
}

const (
	// TODO: make this ~/.jokes, and then make it configurable
	// TODO: in the future, allow jokes to be stored in the cloud somehow
	//   maybe just a local fs + gcsfuse as a quick way to do it?
	jokesFile = "./.jokes"
)

func main() {
	// Make sure the jokes file exists. If it doesn't, create it.
	if !checkFileExists(jokesFile) {
		log.Printf("jokes file does not exist at %s. Creating new one.", jokesFile)
		err := createFile(jokesFile)
		if err != nil {
			log.Fatalf("could not create jokes file at %s: %v", jokesFile, err)
		}
	}

	app := &cli.App{
		Name:        "joke",
		Description: "a cli app for jokes",
		Commands: []*cli.Command{
			{
				Name:        "add",
				Usage:       "add a joke",
				Description: "add a joke",
				// Both content and categories are needed to add a joke
				Action: func(c *cli.Context) error {
					fmt.Printf("Content: ")
					reader := bufio.NewReader(os.Stdin)
					input, _ := reader.ReadString('\n')
					jokeContent := strings.TrimSpace(string([]byte(input)))

					fmt.Printf("jokeContent %s\n", jokeContent)
					fmt.Printf("Categories: ")
					oldState, err := term.MakeRaw(int(os.Stdin.Fd()))
					if err != nil {
						fmt.Println(err)
						return nil
					}
					defer term.Restore(int(os.Stdin.Fd()), oldState)

					jokeStore, err := readJokeStore(jokesFile)
					if err != nil {
						return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
					}

					// Hacky way to get three categories and autocomplete
					// where possible.
					i := 0
					categories := []string{}
					for i < 3 {
						stringInput := ""
						b := make([]byte, 1)
						var match *string
						// Keep looking for input until it's a return char
						// which is handled later
						for true {
							// Read in the typed character
							_, err = os.Stdin.Read(b)
							if err != nil {
								fmt.Println(err)
								return nil
							}
							// If it's a return, accept it as a category
							if string(b[0]) == "\r" {
								break
							}
							// Keep track of the entire input, character by character
							// TODO: handle delete
							stringInput += string(b[0])
							// Print the new character
							fmt.Printf(strings.ToUpper(string(b[0])))
							// Check the joke list to see if any categories are prefixed
							// with the string input. There aren't that many categories,
							// in theory.
							for _, j := range jokeStore.Categories {
								if strings.HasPrefix(j, strings.ToUpper(stringInput)) {
									// Reverse color to differentiate between typed and completion
									ansi.SetReversed(true)
									// Print the rest of the match to show the suggestion
									fmt.Printf("%s", j[len(stringInput):])
									// Set the match, in case the next character is '\r'
									match = &j
									break
								} else {
									// Unset the match, because now the category is new.
									match = nil
									// Reset because this avoids saying
									// "GHANDMA" instead of "GH"
									ansi.ClearLine()
									fmt.Printf("Categories: %s", strings.ToUpper(stringInput))
								}
							}
							ansi.SetReversed(false)
						}
						// If it's a match, add the matched category.
						// If not, just add the typed string.
						cat := strings.ToUpper(stringInput)
						if match != nil {
							cat = *match
						}
						// Append it to the list of categories
						categories = append(categories, cat)
						// Show the categories before the next one is typed
						ansi.ClearLine()
						fmt.Printf("Categories: %s ", categories)
						// Increment i, for now this sets categories to 3 per joke
						i++
					}

					ansi.NewLine()
					fmt.Println("Press enter to confirm, 'a' to abort.")

					b := make([]byte, 1)
					for true {
						// Read in the typed character
						_, err = os.Stdin.Read(b)
						if err != nil {
							fmt.Println(err)
							return nil
						}
						if string(b[0]) == "a" {
							return cli.Exit("Aborted joke add.", 1)
						}
						// If it's a return, accept it as a category
						if string(b[0]) == "\r" {
							break
						}
					}

					return nil
					// input, _ = reader.ReadString('\n')
					// jokeCategories := strings.Split(strings.TrimSpace(string([]byte(input))), ",")

					// //1. Read the list of jokes
					// jokeStore, err := readJokeStore(jokesFile)
					// if err != nil {
					// 	return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
					// }
					// for _, c := range jokeCategories {
					// 	if !slices.Contains(jokeStore.Categories, c) {
					// 		return cli.Exit(fmt.Sprintf("error: category '%s' not in list of categories", c), 1)
					// 	}
					// }
					// // 2. Add a new joke to the list in memory
					// newJokeStore := addJoke(*jokeStore, jokeContent, jokeCategories)
					// // 3. Write the list back out to the joke file
					// err = writeJokes(newJokeStore, jokesFile)
					// if err != nil {
					// 	return cli.Exit(fmt.Sprintf("error: could not write joke: %v", err), 1)
					// }
					// return nil
				},
			},
			{
				Name:        "list",
				Usage:       "list jokes",
				Description: "list jokes",
				// Category is needed to list a joke
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "category", Required: true},
					&cli.BoolFlag{Name: "show-ids", Required: false},
				},
				Action: func(c *cli.Context) error {
					jokeCategory := c.String("category")
					showIds := c.Bool("show-ids")
					// 1. Read the list of jokes
					jokeStore, err := readJokeStore(jokesFile)
					if err != nil {
						return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
					}
					if !slices.Contains(jokeStore.Categories, jokeCategory) {
						return cli.Exit(fmt.Sprintf("error: category '%s' not in list of categories.", jokeCategory), 1)
					}
					fmt.Printf("\nGot jokes for category %s:\n\n", jokeCategory)
					for _, j := range jokeStore.Jokes {
						if slices.Contains(j.Categories, jokeCategory) {
							printJoke(j, showIds)
						}
					}
					return nil
				},
			},
			{
				Name:        "find",
				Usage:       "find jokes",
				Description: "find jokes",
				Action: func(c *cli.Context) error {
					subStr := c.Args().Get(0)
					jokeStore, err := readJokeStore(jokesFile)
					if err != nil {
						return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
					}
					found := []Joke{}
					for _, j := range jokeStore.Jokes {
						if strings.Contains(j.Content, subStr) {
							found = append(found, j)
						}
					}
					fmt.Printf("\nGot jokes with substring '%s':\n\n", subStr)
					for _, f := range found {
						printJoke(f, true)
					}
					return nil
				},
			},
			{
				Name: "show",
				Subcommands: []*cli.Command{
					{
						Name:        "add",
						Usage:       "add a show",
						Description: "add a show",
						Flags: []cli.Flag{
							// IDs of jokes told at the show
							&cli.StringSliceFlag{Name: "jokes", Required: false},
							// Physical location of show
							&cli.StringFlag{Name: "location", Required: false},
							// Timestamp of show (example time: 2019-08-12T15:04:05)
							&cli.TimestampFlag{Name: "time", Layout: "2006-01-02T15:04:05", Required: true},
							// Notes for the show
							&cli.StringFlag{Name: "notes", Required: false},
						},
						Action: func(c *cli.Context) error {
							jokes := c.StringSlice("jokes")
							location := c.String("location")
							notes := c.String("notes")
							time := c.Timestamp("time")

							// 1. Read the jokestore
							jokeStore, err := readJokeStore(jokesFile)
							if err != nil {
								return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
							}

							// 2. Add a new show
							newJokeStore := addShow(*jokeStore, jokes, *time, notes, location)

							// 3. Write the list back out to the joke file
							err = writeJokes(newJokeStore, jokesFile)
							if err != nil {
								return cli.Exit(fmt.Sprintf("error: could not write joke: %v", err), 1)
							}
							return nil
						},
					},
				},
			},
		},
	}

	_ = app.Run(os.Args)
}

func printJoke(j Joke, showId bool) {
	fmt.Printf("%s\n%s", j.Content, j.Categories)
	if showId {
		fmt.Printf("\nID: %d", j.ID)
	}
	fmt.Printf("\n\n")
}

func readJokeStore(fileLocation string) (*JokeStore, error) {
	content, err := ioutil.ReadFile(fileLocation)
	if err != nil {
		return nil, fmt.Errorf("Error when opening file: %v", err)
	}
	var payload JokeStore
	err = json.Unmarshal(content, &payload)
	if err != nil {
		log.Fatal("Error during Unmarshal(): ", err)
	}
	return &payload, nil
}

func addJoke(existingStore JokeStore, newJokeContent string, newJokeCategories []string) JokeStore {
	// TODO: add check to see if joke has already been added
	newJoke := Joke{
		// Create a unique ID for the joke that incorporates the tags
		// by hashing the string "<content>:<cat1>,<cat2>,<cat3>"
		ID:         createHash(fmt.Sprintf("%s:%s", newJokeContent, strings.Join(newJokeCategories[:], ","))),
		Content:    newJokeContent,
		Categories: newJokeCategories,
	}
	newJokeStore := JokeStore{
		Jokes:      append(existingStore.Jokes, newJoke),
		Categories: existingStore.Categories,
		Shows:      existingStore.Shows,
	}
	return newJokeStore
}

func addShow(existingStore JokeStore, jokes []string, time time.Time, notes string, location string) JokeStore {
	// TODO: add check to see if joke has already been added
	newShow := Show{
		// Create a unique ID for the joke that incorporates the tags
		// by hashing the string "<location>:<time>"
		ID:       createHash(fmt.Sprintf("%s:%s", location, time)),
		Jokes:    jokes,
		Time:     time,
		Notes:    notes,
		Location: location,
	}
	newJokeStore := JokeStore{
		Jokes:      existingStore.Jokes,
		Categories: existingStore.Categories,
		Shows:      append(existingStore.Shows, newShow),
	}
	return newJokeStore
}

func writeJokes(jokeStore JokeStore, jokeFile string) error {
	fileContent, err := json.MarshalIndent(
		jokeStore, "", " ")
	if err != nil {
		return fmt.Errorf("error turning data into json: %v", err)
	}
	err = ioutil.WriteFile(jokeFile, fileContent, 0644)
	if err != nil {
		return fmt.Errorf("error writing file: %v", err)
	}
	return nil
}

func createHash(jokeContent string) uint32 {
	// https://stackoverflow.com/a/13582881
	h := fnv.New32a()
	// upper case to avoid casing changes
	h.Write([]byte(strings.ToUpper(jokeContent)))
	return h.Sum32()
}

func createFile(fileLocation string) error {
	// If it doesn't, create it with an empty list of jokes
	file, err := json.MarshalIndent(JokeStore{}, "", " ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(fileLocation, file, 0644)
}

func checkFileExists(fileLocation string) bool {
	if _, err := os.Stat(fileLocation); err == nil {
		// If joke file exists, do nothing
		return true
	} else {
		return false
	}
}
