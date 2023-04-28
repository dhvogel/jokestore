package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io/ioutil"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/bit101/go-ansi"
	"github.com/manifoldco/promptui"
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
	ID uint32
	// deprecated
	Jokes       []string // list of jokeIDs
	JokeResults []JokeResult
	Notes       string
	Location    string
	Time        time.Time
}

type Joke struct {
	ID         uint32
	Content    string
	Categories []string
	TimeAdded  time.Time
}

type JokeResult struct {
	JokeID          uint32
	UpperBoundGrade string
	LowerBoundGrade string
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
					fmt.Printf("Categories: ")

					jokeStore, err := readJokeStore(jokesFile)
					if err != nil {
						return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
					}
					categories, err := makeTermRawAndGetCategories(jokeStore.Categories)
					if err != nil {
						return cli.Exit(err, 1)
					}
					// 2. Add a new joke to the list in memory
					_, newJokeStore := addJoke(*jokeStore, jokeContent, categories)
					// 3. Write the list back out to the joke file
					err = writeJokes(newJokeStore, jokesFile)
					if err != nil {
						return cli.Exit(fmt.Sprintf("error: could not write joke: %v", err), 1)
					}
					fmt.Printf("\nJoke added!\n")
					return nil
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
						Action: func(c *cli.Context) error {
							jokeStore, err := readJokeStore(jokesFile)
							if err != nil {
								return cli.Exit(fmt.Sprintf("error reading jokes file %s: %v", jokesFile, err), 1)
							}

							jokeResults := []JokeResult{}
							addAnotherJoke := true

							for addAnotherJoke {
								prompt := promptui.Select{
									Label: "Add Joke?",
									Items: []string{"Y", "N"},
								}
								_, result, err := prompt.Run()
								if err != nil {
									fmt.Printf("Prompt failed %v\n", err)
									continue
								}
								if result == "N" {
									addAnotherJoke = false
								} else {
									joke, otherOption, err := getJokeFromCommandLine(jokeStore.Jokes)
									if err != nil {
										fmt.Println(err)
									}
									if otherOption == "Add Joke" {
										jokeContent, err := getJokeContentFromCommandLine()
										if err != nil {
											fmt.Println(err)
										}
										fmt.Printf("Categories: ")
										jokeCategories, err := makeTermRawAndGetCategories(jokeStore.Categories)
										if err != nil {
											fmt.Println(err)
										}
										newJoke, newJokeStore := addJoke(*jokeStore, *jokeContent, jokeCategories)
										err = writeJokes(newJokeStore, jokesFile)
										joke = newJoke
									}
									upperBound, lowerBound, err := getJokeGradeFromCommandLine()
									if err != nil {
										fmt.Println(err)
									}
									if upperBound != nil && lowerBound != nil {
										jokeResult := JokeResult{
											JokeID:          joke.ID,
											UpperBoundGrade: *upperBound,
											LowerBoundGrade: *lowerBound,
										}
										jokeResults = append(jokeResults, jokeResult)
									}
								}
								if !addAnotherJoke {
									prompt = promptui.Select{
										Label: "Finish show joke entry?",
										Items: []string{"Y", "N"},
									}
									_, result, err := prompt.Run()
									if err != nil {
										fmt.Printf("Prompt failed %v\n", err)
										addAnotherJoke = true
										continue
									}
									if result == "N" {
										addAnotherJoke = true
									}
								}
							}

							fmt.Printf("Location: ")
							reader := bufio.NewReader(os.Stdin)
							input, _ := reader.ReadString('\n')
							location := strings.TrimSpace(string([]byte(input)))

							fmt.Printf("Date (MM/DD/YYYY): ")
							reader = bufio.NewReader(os.Stdin)
							input, _ = reader.ReadString('\n')
							date := strings.TrimSpace(string([]byte(input)))
							parsedDate, err := time.Parse("01/02/2006", date)

							fmt.Printf("Notes: ")
							reader = bufio.NewReader(os.Stdin)
							input, _ = reader.ReadString('\n')
							notes := strings.TrimSpace(string([]byte(input)))

							// 2. Add a new show
							newJokeStore := addShow(*jokeStore, jokeResults, parsedDate, notes, location)

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

func makeTermRawAndGetCategories(existingCategories []string) ([]string, error) {
	oldState, err := term.MakeRaw(int(os.Stdin.Fd()))
	if err != nil {
		return nil, err
	}
	defer term.Restore(int(os.Stdin.Fd()), oldState)

	categories, err := getCategoriesFromCommandLine(existingCategories)
	if err != nil {
		return nil, err
	}

	ansi.NewLine()
	ansi.CarriageReturn()
	fmt.Printf("Press enter to confirm, 'a' to abort.")

	b := make([]byte, 1)
	for true {
		// Read in the typed character
		_, err = os.Stdin.Read(b)
		if err != nil {
			return nil, err
		}
		if string(b[0]) == "a" {
			ansi.NewLine()
			ansi.CarriageReturn()
			return nil, err
		}
		// If it's a return, accept it as a category
		if string(b[0]) == "\r" {
			break
		}
	}
	term.Restore(int(os.Stdin.Fd()), oldState)
	return categories, nil
}

func getJokeContentFromCommandLine() (*string, error) {
	validate := func(input string) error {
		return nil
	}
	prompt := promptui.Prompt{
		Label:    "Joke Content",
		Validate: validate,
	}
	jokeContent, err := prompt.Run()
	if err != nil {
		return nil, err
	}
	return &jokeContent, nil
}

func getJokeGradeFromCommandLine() (*string, *string, error) {
	validate := func(input string) error {
		if !slices.Contains([]string{"A", "B", "C", "D", "E", "F"}, input) {
			return fmt.Errorf("invalid string")
		}
		return nil
	}
	prompt := promptui.Prompt{
		Label:    "Grade - Upper Bound",
		Validate: validate,
	}
	upperBound, err := prompt.Run()
	if err != nil {
		return nil, nil, err
	}
	validate = func(input string) error {
		if !slices.Contains([]string{"A", "B", "C", "D", "E", "F"}, input) {
			return fmt.Errorf("invalid string")
		}
		return nil
	}
	prompt = promptui.Prompt{
		Label:    "Grade - Lower Bound",
		Validate: validate,
	}
	lowerBound, err := prompt.Run()
	if err != nil {
		return nil, nil, err
	}
	return &upperBound, &lowerBound, nil

}

// Requires that the terminal is in raw state.
func getJokeFromCommandLine(existingJokes []Joke) (*Joke, string, error) {
	validate := func(input string) error {
		if len(input) < 1 {
			return fmt.Errorf("invalid string")
		}
		return nil
	}
	prompt := promptui.Prompt{
		Label:    "Joke Content Fragment (ONLY PART OF THE JOKE)",
		Validate: validate,
	}
	result, err := prompt.Run()
	if err != nil {
		return nil, "", err
	}
	options := []Joke{}
	contentOptions := []string{}
	for _, j := range existingJokes {
		if strings.Contains(strings.ToUpper(j.Content), strings.ToUpper(result)) {
			options = append(options, j)
		}
	}
	for _, o := range options {
		contentOptions = append(contentOptions, o.Content)
	}
	addJokeText := "Add Joke"
	// TODO: add option to add joke if it's not there.
	selectPrompt := promptui.Select{
		Label: "Select Joke",
		Items: append(contentOptions, addJokeText),
	}
	i, result, err := selectPrompt.Run()
	if err != nil {
		return nil, "", err
	}
	if result == "Add Joke" {
		return nil, addJokeText, nil
	}
	return &options[i], "", nil
}

// Requires that the terminal is in raw state
func getCategoriesFromCommandLine(existingCategories []string) ([]string, error) {
	// Hacky way to get three categories and autocomplete
	// where possible.
	i := 0
	categories := []string{}
	b := make([]byte, 1)
	lastOneWasAReturn := false
	// Max of 10 categories
	for i < 10 {
		stringInput := ""
		b = make([]byte, 1)
		var match *string
		// Keep looking for input until it's a return char
		// which is handled later
		for true {
			// Read in the typed character
			_, err := os.Stdin.Read(b)
			if err != nil {
				return nil, err
			}

			// This is a hack to delete a character with the
			// '=' sign because I can't figure out how to read
			// the actual delete character.
			if string(b[0]) == "=" {
				if stringInput == "" {
					continue
				}
				stringInput = stringInput[:len(stringInput)-1]
				ansi.ClearLine()
				fmt.Printf("Categories: %s", strings.ToUpper(stringInput))
				continue
			}

			// If it's a return, accept it as a category
			if string(b[0]) == "\r" {
				// This code works, and it's comedy. The idea is that a double return
				// ends the category entering, so `lastOneWasAReturn` keeps track if the
				// last button press was also a return. If the last one was a return
				// and this one is a return, then exit the loop by setting i to 10.
				if lastOneWasAReturn {
					i = 10
				}
				lastOneWasAReturn = true
				break
			}
			lastOneWasAReturn = false
			// Keep track of the entire input, character by character
			// TODO: handle delete
			stringInput += string(b[0])
			// Print the new character
			fmt.Printf(strings.ToUpper(string(b[0])))
			// Check the joke list to see if any categories are prefixed
			// with the string input. There aren't that many categories,
			// in theory.
			for _, j := range existingCategories {
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
		// The string input is the empty string in the double return case
		if stringInput == "" {
			continue
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
	return categories, nil
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

func addJoke(existingStore JokeStore, newJokeContent string, newJokeCategories []string) (*Joke, JokeStore) {
	// TODO: add check to see if joke has already been added
	newJoke := Joke{
		// Create a unique ID for the joke that incorporates the tags
		// by hashing the string "<content>:<cat1>,<cat2>,<cat3>"
		ID:         createHash(fmt.Sprintf("%s:%s", newJokeContent, strings.Join(newJokeCategories[:], ","))),
		Content:    newJokeContent,
		Categories: newJokeCategories,
		TimeAdded:  time.Now(),
	}
	categories := existingStore.Categories
	for _, c := range newJokeCategories {
		if !slices.Contains(categories, c) {
			categories = append(categories, c)
		}
	}
	sort.Strings(categories)
	newJokeStore := JokeStore{
		Jokes:      append(existingStore.Jokes, newJoke),
		Categories: categories,
		Shows:      existingStore.Shows,
	}
	return &newJoke, newJokeStore
}

func addShow(existingStore JokeStore, jokeResults []JokeResult, time time.Time, notes string, location string) JokeStore {
	// TODO: add check to see if joke has already been added
	newShow := Show{
		// Create a unique ID for the joke that incorporates the tags
		// by hashing the string "<location>:<time>"
		ID:          createHash(fmt.Sprintf("%s:%s", location, time)),
		JokeResults: jokeResults,
		Time:        time,
		Notes:       notes,
		Location:    location,
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
