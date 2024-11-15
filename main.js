// https://dagshub.com/arjvik/wordle-wordlist
// https://dagshub.com/arjvik/wordle-wordlist/raw/e8d07d33a59a6b05f3b08bd827385604f89d89a0/answerlist.txt
// https://dagshub.com/arjvik/wordle-wordlist/raw/e8d07d33a59a6b05f3b08bd827385604f89d89a0/wordlist.txt

// TODO
/*

- sometimes placing a black note on a word with one letter of it will not apply it to all (index issue?)
- guess validation
- 4 letter version?

*/

const statplayed = document.querySelector('#statplayed');
const statwins = document.querySelector('#statwins');
const statwinrate = document.querySelector('#statwinrate');
const distribution = document.querySelector('#distribution');

let gameStats;

const saveStats = () => {
	localStorage.mentleStats = JSON.stringify(gameStats);
}

const fillStats = () => {
	if (!gameStats.gamesPlayed) return;
	
	statplayed.textContent = gameStats.gamesPlayed;
	statwins.textContent = gameStats.victories;
	statwinrate.textContent = Math.floor(gameStats.victories / gameStats.gamesPlayed * 100) + '%';
	
	distribution.innerHTML = '';
	
	gameStats.guessesTaken.forEach((amount, i) => {
		const row = document.createElement('div');
		const num = document.createElement('div');
		num.textContent = i+1;
		num.className = 'number';
		const bar = document.createElement('div');
		bar.className = 'bar';
		bar.style = `--percent: ${Math.floor(amount / gameStats.victories * 100)}%;`;
		bar.textContent = amount;
		
		
		distribution.appendChild(row);
		row.appendChild(num);
		row.appendChild(bar);
	});
}

// delete localStorage.mentleStats;

const loadStats = () => {
	if (localStorage.mentleStats) {
		gameStats = JSON.parse(localStorage.mentleStats);

		fillStats();
	} else {
		gameStats = {
			gamesPlayed: 0,
			victories: 0,
			guessesTaken: new Array(10).fill(0)
		}
		// gameStats = {
		// 	gamesPlayed: 20,
		// 	victories: 15,
		// 	guessesTaken: [
		// 		0, 0, 0, 0, 1, 2, 4, 2, 3, 3
		// 	]
		// }

		fillStats();
		saveStats();
	}
}

loadStats();

// ELEMENTS
const gameboard = document.querySelector('#gameboard');
const keyboard = document.querySelector('#keyboard');
const startButton = document.querySelector('#start');
const confirmButton = document.querySelector('#confirm');
const impossibleStyle = document.querySelector('#impossible');
const notesStyle = document.querySelector('#notes');
const timerElement = document.querySelector('#timer');
const clearButton = document.querySelector('#clear');

// GAME CONSTANTS
const layout = 'QWERTY';
const maxtries = 10;
const alphabet = "abcdefghjiklmnopqrstuvwxyz";
const keyboardChars = {
	"QWERTY": {
		layout: [
			"qwertyuiop",
			"asdfghjkl",
			"zxcvbnm"
		],
		enter: 'z',
		back: 'm'
	},
	"DVORAK": {
		layout: [
			"pyfgcrl",
			"aoeuidhtns",
			"qjkxbmwvz"
		],
		enter: 'p',
		back: 'l'
	},
	"COLEMAN": {
		layout: [
			"qwfpgjluy",
			"arstdhneio",
			"zxcvbkm"
		],
		enter: 'z',
		back: 'm'
	}
}

// GAME DATA
let secretWord = words[Math.floor(Math.random() * words.length)];
const guessedWords = []; // List of the guessed words this round
const currentWord = [];
const impossibleCharacters = [];
const markedCharacters = [];
// example
/**
[
{
	"char": "a",
	"data": {
		green: [2], // indexes of letter that are marked GREEN
		yellow: 1, // amount of letter that CAN be it.
		black: 3 // amount of letters that CAN'T be it.
	}
}
]

**/
let startTime = new Date();
let over = false;

// FUNCTIONS
const timerInterval = setInterval(() => {
	if (over) return;
	
	const timeInSeconds = Math.floor((new Date() - startTime) / 1000);
	const seconds = `${timeInSeconds % 60}`.padStart(2, "0");
	const minutes = `${Math.floor(timeInSeconds / 60)}`.padStart(2, "0");
	const hours = ``;
	timerElement.textContent = minutes + ":" + seconds;
}, 250);

const updateImpossible = () => {
	impossibleStyle.textContent = '';
	
	const chars = [];
	
	guessedWords.forEach(word => {
		chars.push(...word.split(''));
	});
	
	if (chars.length) {
		impossibleStyle.textContent += '#keyboard .key_';
		impossibleStyle.textContent += [...new Set(chars)].join(', #keyboard .key_');
		
		impossibleStyle.textContent += ' { border-color: var(--color-default); background-color: var(--color-default); color: white !important; }';
	}
	
	if (!impossibleCharacters.length) return;
	impossibleStyle.textContent += '#main .' + impossibleCharacters.join(', #main .');
	impossibleStyle.textContent += ', #keyboard .key_' + impossibleCharacters.join(', #keyboard .key_');
	impossibleStyle.textContent += ' { border-color: var(--color-wrong) !important; background-color: var(--color-wrong) !important; color: white !important; cursor: default !important; }';
}

const updateNotes = () => {
	[...gameboard.querySelectorAll('.guessed, .active')].forEach(row => {
		if (!row.textContent) return;
		
		const word =  /[a-zA-Z]{1,}/.exec(row.textContent)[0];
		const characters = [...row.querySelectorAll('.cell:not(.result)')];
		
		characters.forEach(cell => {
			const state = cell.className.split(' ').find(className => className.startsWith('note_'));
			cell.classList.remove(state);
		});
		
		// Shorter list of notes that only use the letters in the current word
		const microNotes = {};
		word.split('').forEach(char => {
			const entry = markedCharacters.find(entry => entry.char === char);
			
			if (!entry) return;
			
			microNotes[char] = {
				green: [...entry.data.green],
				yellow: entry.data.yellow,
				black: entry.data.black,
				yellowSpot: [...entry.data.yellowSpot],
				blackSpot: [...entry.data.blackSpot]
			};
		});
		
		Object.keys(microNotes).forEach(char => {
			let greensMarked = 0;
			let yellowsMarked = 0;
			let blacksMarked = 0;
			
			if (microNotes[char].green.length) {
				microNotes[char].green.forEach(greenIndex => {
					if (word[greenIndex] === char) {
						characters[greenIndex].classList.add('note_green');
						greensMarked++;
					}
				});
				
				microNotes[char].yellow += microNotes[char].green.length - greensMarked;
			}
			
			if (microNotes[char].yellow) {
				microNotes[char].yellowSpot.forEach(yellowIndex => {
					if (word[yellowIndex] === char && !characters[yellowIndex].classList.contains('note_green')) {
						characters[yellowIndex].classList.add('note_yellow');
						yellowsMarked++;
					}
				});
				
				characters.filter(cell => {
					return !cell.classList.contains('note_green') && cell.textContent === char;
				}).forEach(cell => {
					if (yellowsMarked >= microNotes[char].yellow) return;
					yellowsMarked++;
					cell.classList.add('note_yellow');
				});
			}
			
			if (microNotes[char].black) {
				const instancesOfLetter = word.split('').filter(character => character === char).length;
				const notLetter = 5 - instancesOfLetter;
				
				if (blacksMarked >= microNotes[char].black - notLetter) return;
				
				microNotes[char].blackSpot.forEach(blackIndex => {
					if (word[blackIndex] === char && !characters[blackIndex].classList.contains('note_yellow') && !characters[blackIndex].classList.contains('note_green')) {
						characters[blackIndex].classList.add('note_black');
						blacksMarked++;
					}
				});
				
				characters.filter(cell => {
					return !cell.classList.contains('note_green') && !cell.classList.contains('note_yellow') && cell.textContent === char;
				}).forEach(cell => {
					if (blacksMarked >= microNotes[char].black - notLetter) return;
					blacksMarked++;
					cell.classList.add('note_black');
				});
			}
		});
	});
	
	const greenList = [];
	const yellowList = [];
	const blackList = [];
	
	markedCharacters.forEach(entry => {
		const char = entry.char;
		const data = entry.data;
		
		// GREEN apply to keyboard too
		if (data.green.length) {
			greenList.push(`#keyboard .key_${char}`);
			return;
		}
		
		// YELLOW apply to keyboard too
		else if (data.yellow) {
			yellowList.push(`#keyboard .key_${char}`);
			return;
		}
		
		// BLACK
		else if (data.black === 5) {
			blackList.push(`#keyboard .key_${char}`);
		}
		
	});
	
	const styleString = ' { border-color: var(--color-STYLE); background-color: var(--color-STYLE); color: white !important; } '
	
	notesStyle.textContent = '';
	
	notesStyle.textContent += greenList.join(', ');
	if (greenList.length)
		notesStyle.textContent += styleString.replace(/STYLE/g, 'correct');
	notesStyle.textContent += yellowList.join(', ');
	if (yellowList.length)
		notesStyle.textContent += styleString.replace(/STYLE/g, 'close');
	notesStyle.textContent += blackList.join(', ');
	if (blackList.length)
		notesStyle.textContent += styleString.replace(/STYLE/g, 'wrong');
}

// Remove a specific note from this character
const removeNote = (character, word, index, lastState) => {
	const note = markedCharacters.findIndex(entry => entry.char === character);
	
	if (note === -1) return;
	
	switch (lastState) {
		case 'black': {
			// Find out if this current word has the most instances of the letter (out of all guesses)
			const instancesOfLetter = word.split('').filter(char => char === character).length;
			let hasMostInstances = true;
			
			guessedWords.forEach(oldWord => {
				const instances = oldWord.split('').filter(char => char === character).length;
				if (instances > instancesOfLetter) {
					hasMostInstances = false;
				}
			});
			
			// How many characters that are visibly marked as black (out of all guesses)
			const markedBlackVisibly = markedCharacters[note].data.black - (5 - instancesOfLetter);
			
			if (markedBlackVisibly > 1)
 				markedCharacters[note].data.black--;
			else {
				markedCharacters[note].data.black = 0;
				markedCharacters[note].data.blackSpot.splice(0, 5);
			}
			
			const i = markedCharacters[note].data.blackSpot.indexOf(index);
			markedCharacters[note].data.blackSpot.splice(i, 1);
			
			break;
		}

		case 'yellow': {
			if (markedCharacters[note].data.yellow) {
				markedCharacters[note].data.yellow--;
			}
			
			// Stops you from marking two greens of the same letter on another yellow
			// Normally it's be fine, but it causes a feeling of inconsistency
			// I can't see clearing a yellow to clear a green feeling better
			// or more intuitive than having to remove the green it's from.
			
			// else {
			// 	markedCharacters[note].data.green.pop();
			// }
			const i = markedCharacters[note].data.yellowSpot.indexOf(index);
			markedCharacters[note].data.yellowSpot.splice(i, 1);
			break;
		}

		case 'green': {
			const i = markedCharacters[note].data.green.indexOf(index);
			markedCharacters[note].data.green.splice(i, 1);
			break;
		}
			// Clear note
		case 'blank': {
			// do nothing lol
			break;
		}
	}
	
	const data = markedCharacters[note].data;
	if (!data.green && !data.yellow && !data.black) {
		markedCharacters.splice(note, 1);
	}
}

const addNote = (character, word, index, lastState) => {
	let note = markedCharacters.findIndex(entry => entry.char === character);
	if (note === -1) {
		note = markedCharacters.push({
			char: character,
			data: { green: [], yellow: 0, black: 0, yellowSpot: [], blackSpot: [] }
		});
		note--;
	}
	
	switch (lastState) {
			// Make it black
		case 'blank': {
			const instancesOfLetter = word.split('').filter(char => char === character).length;
			
			if (!markedCharacters[note].data.black)
				markedCharacters[note].data.black = 5 - instancesOfLetter;
			
			markedCharacters[note].data.black++;
			markedCharacters[note].data.blackSpot.push(index);
			
			break;
		}
			// Make it yellow
		case 'black': {
			markedCharacters[note].data.yellow++;
			markedCharacters[note].data.yellowSpot.push(index);
			break;
		}
			// Make it green
		case 'yellow': {
			markedCharacters[note].data.green.push(index);
			break;
		}
			// Clear note
		case 'green': {
			// do nothing lol
			break;
		}
	}
}

const endGame = (won = false) => {
	// The game is won
	for (let i = 0; i < 5; i++) {
		gameboard.querySelector('.final').childNodes[i].textContent = secretWord[i] || '';
		if (won) gameboard.querySelector('.final').classList.add('victory');
	}

	over = true;
	
	loadStats();
	
	gameStats.gamesPlayed++;
	
	if (won) {
		gameStats.victories++;
		gameStats.guessesTaken[guessedWords.length-1]++;
	}
	
	fillStats();

	saveStats();
}

const guessWord = (word) => {
	const currentRow = gameboard.querySelector('.active');
	
	// Make a mutable copy of the actual word and the guess
	const wordCopy = [...currentWord];
	const secretCopy = [...secretWord];
	guessedWords.push(currentWord.join(''));
	
	currentRow._word = currentWord.join('');
	
	// The list of letters that are close, and correct
	const closes = [];
	const corrects = [];
	
	// The indices of the correct character to remove (to not accidentally double up)
	const removeIndices = [];
	
	// Iterate through each character, mark down the indices that are identical (GREEN)
	wordCopy.forEach((char, i) => {
		if (secretCopy[i] === char) {
			corrects.push(char);
			removeIndices.push(i);
		}
	});
	// Remove the correct characters (GREEN)
	removeIndices.reverse().forEach(i => {
		wordCopy.splice(i, 1);
		secretCopy.splice(i, 1);
	});
	// Since order doesn't matter now, we remove all characters that are similar (YELLOW)
	wordCopy.forEach((char, i) => {
		const index = secretCopy.indexOf(char);
		if (index+1) {
			closes.push(char);
			secretCopy.splice(index, 1);
		}
	});
	
	// If the guess is not the final word...
	if (currentWord.join("") !== secretWord) {
		// Iterate through each character and 
		currentWord.forEach(char => {
			// Mark on the bottom keyboard which characters are wrong or maybe close
			//keyboard.querySelector('.key_'+char).classList.add(secretCopy.length === 5 ? 'impossible' : 'maybe');
			
			// If the whole word is wrong, add them to the impossible list
			if (secretCopy.length === 5) {
				if (impossibleCharacters.indexOf(char) === -1) {
					impossibleCharacters.push(char);
				}
			}
		});
	} else {
		// The game is won
		for (let i = 0; i < 5; i++) {
			currentRow.classList.add('victory');
		}
		
		endGame(true);
	}
	
	// Add the guess results
	currentRow.querySelector('.result.note_black').textContent = secretCopy.length;
	currentRow.querySelector('.result.note_yellow').textContent = closes.length;
	currentRow.querySelector('.result.note_green').textContent = corrects.length;
	
	currentRow.classList.remove('active');
	currentRow.classList.add('guessed');
	
	// If it was the last guess
	if (currentRow.nextSibling.classList.contains('final') ) {
		endGame();
	} else {
		currentRow.nextSibling.classList.remove('inactive');
		currentRow.nextSibling.classList.add('active');
	}
	
	for (let i = 0; i < 5; i++) {
		currentWord.pop();
	}
	
	updateNotes();
	updateImpossible();
}

const keyInput = (key) => {
	if (over) return;
	
	if (alphabet.indexOf(key)+1 && currentWord.length < 5) {
		currentWord.push(key);
	}
	
	if (key === "Enter" && currentWord.length === 5) {
		guessWord(currentWord);
	}
	
	if (over) return;
	
	if ((key === "Backspace" || key === "Delete") && currentWord.length > 0) {
		currentWord.pop();
	}
	
	const currentRow = gameboard.querySelector('.active');
	
	for (let i = 0; i < 5; i++) {
		currentRow.childNodes[i].textContent = currentWord[i] || '';
		currentRow.childNodes[i].className = 'cell';
		if (currentWord[i]) currentRow.childNodes[i].classList.add(currentWord[i]);
	}
	
	updateNotes();
}

document.addEventListener('keydown', (evt) => {
	if (over) return;
	if (evt.ctrlKey) return;
	if (evt.altKey) return;
	
	if ([...alphabet, "Enter", "Backspace"].indexOf(evt.key) === -1) return;
	
	keyInput(evt.key);
});

const makeGameBoard = () => {
	// Clear the timer
	startTime = new Date();
	timerElement.textContent = "00:00";
	
	// Reset the start over buttons
	startButton.style.display = '';
	confirmButton.style.display = 'none';
	
	// Unfocus the two starting buttons
	startButton.blur();
	confirmButton.blur();
	
	// Select the random word
	secretWord = words[Math.floor(Math.random() * words.length)];
	
	over = false;
	
	// Reset the game notes
	const size = markedCharacters.length;
	for (let i = 0; i < size; i++) {
		markedCharacters.pop();
	}
	updateNotes();
	
	// Clear the currently entered word
	for (let i = 0; i < 5; i++) {
		currentWord.pop();
	}
	
	// Clear the guessed word list
	guessedWords.splice(0, guessedWords.length);
	
	// Clear the impossible characters
	impossibleCharacters.splice(0, impossibleCharacters.length);
	impossibleStyle.textContent = '';
	
	gameboard.innerHTML = '';

	// Create the rows
	for (let i = 0; i <= maxtries; i++) {
		const row = document.createElement('div');
		row.classList.add('row');
		
		// First row
		if (!i)
			row.classList.add('active');
		// Final row
		else if (i == maxtries)
			row.classList.add('final');
		// Other rows
		else
			row.classList.add('inactive');

		for (let j = 0; j < 5 + 3; j++) {
			const cell = document.createElement('div');
			cell.classList.add('cell');
			
			// Actual letters
			if (j < 5) {
				cell.addEventListener('mousedown', (evt) => {
					if (evt.button === 1) {
						evt.preventDefault();
						// cell.classList.remove('note_green');
						// cell.classList.remove('note_black');
						// cell.classList.remove('note_yellow');
						// cell.classList.add('note_blank');
						
						const lastState = cell.className.split(' ').find(className => className.includes('note_'))?.replace('note_', '') || 'blank';
						
						removeNote(cell.textContent, row._word, j, lastState);
						updateNotes();
					}
				});
				
				cell.addEventListener('click', () => {
					if (!cell.parentNode.classList.contains('guessed')) return;
					
					const notes = ['blank', 'black', 'yellow', 'green', 'blank'];
					
					const lastState = cell.className.split(' ').find(className => className.includes('note_'))?.replace('note_', '') || 'blank';
					
					removeNote(cell.textContent, row._word, j, lastState);
					addNote(cell.textContent, row._word, j, lastState);
					updateNotes();
					
					// cell.classList.remove('note_' + lastState);
					// cell.classList.add('note_' + notes[notes.indexOf(lastState) + 1]);
				});
			}
			
			if (i == maxtries && j >= 5) continue;
			
			if (j >= 5) {
				cell.classList.add('result');
				//cell.classList.add(['wrong', 'close', 'correct'][j-5]);
				cell.classList.add(['note_black', 'note_yellow', 'note_green'][j-5]);
			} else {
				if (i == maxtries) cell.textContent = '?';
			}

			row.appendChild(cell);
			
			// Add the divider between the guessed word and the results
			if (j == 4 && i < maxtries) {
				const divider = document.createElement('div');
				divider.classList.add('divider');
				row.appendChild(divider);
			}
		}
		gameboard.appendChild(row);
	}
	
	keyboard.innerHTML = '';
	
	// Create a key in the physical keyboard
	const createKey = (key, text) => {
		const cell = document.createElement('div');
		cell.classList.add('cell');

		// Add its text
		cell.textContent = text || key;
		cell.classList.add('key_'+key.toLowerCase());

		// Push an event to the key listener
		cell.addEventListener('click', () => {
			keyInput(key);
		});
		
		return cell;
	}
	
	keyboardChars[layout].layout.forEach(row => {
		const keyrow = document.createElement('div');
		keyrow.classList.add('row');
		
		[...row].forEach(key => {
			if (key === keyboardChars[layout].enter)
				keyrow.appendChild(createKey("Enter"));
			
			keyrow.appendChild(createKey(key));
			
			if (key === keyboardChars[layout].back)
				keyrow.appendChild(createKey("Backspace", "←"));
		});
		
		keyboard.appendChild(keyrow);
	})
}

makeGameBoard();

startButton.addEventListener('click', () => {
	if (over) {
		makeGameBoard();
		return;
	}
	
	startButton.style.display = 'none';
	confirmButton.style.display = '';
	
	setTimeout(() => {
		startButton.style.display = '';
		confirmButton.style.display = 'none';
	}, 2000);
});
confirmButton.addEventListener('click', makeGameBoard);

clearButton.addEventListener('click', () => {
	const size = markedCharacters.length;
	for (let i = 0; i < size; i++) {
		markedCharacters.pop();
	}
	updateNotes();
	
	[...gameboard.childNodes].filter(n => {
		return n.classList.contains('guessed')
	}).forEach(row => {
		[...row.childNodes].forEach(cell => {
			if (cell.classList.contains('result')) return;
			cell.classList.add('note_blank');
			cell.classList.remove('note_green');
			cell.classList.remove('note_black');
			cell.classList.remove('note_yellow');
		});
	});
});







/* DIALOG BUTTONS */

const tutorialDialog = document.querySelector('#tutorial');
const tutorialOpen = document.querySelector('#help');
const tutorialClose = tutorialDialog.querySelector('#close');

const statsDialog = document.querySelector('#stats');
const statsOpen = document.querySelector('#openstats');
const statsClose = statsDialog.querySelector('#close');

tutorialOpen.addEventListener('click', () => {
	const hidden = tutorialDialog.style.display === 'none';
	tutorialDialog.style.display = hidden ? '' : 'none';
	statsDialog.style.display = 'none';
});
tutorialClose.addEventListener('click', () => {
	tutorialDialog.style.display = 'none';
});

statsOpen.addEventListener('click', () => {
	const hidden = statsDialog.style.display === 'none';
	statsDialog.style.display = hidden ? '' : 'none';
	tutorialDialog.style.display = 'none';
});
statsClose.addEventListener('click', () => {
	statsDialog.style.display = 'none';
});