// https://dagshub.com/arjvik/wordle-wordlist
// https://dagshub.com/arjvik/wordle-wordlist/raw/e8d07d33a59a6b05f3b08bd827385604f89d89a0/answerlist.txt
// https://dagshub.com/arjvik/wordle-wordlist/raw/e8d07d33a59a6b05f3b08bd827385604f89d89a0/wordlist.txt


// TODO
/*

- guess validation
- mobile
- 4 letter version?

*/

// ELEMENTS
const gameboard = document.querySelector('#gameboard');
const keyboard = document.querySelector('#keyboard');
const startButton = document.querySelector('#start');
const confirmButton = document.querySelector('#confirm');
const impossibleStyle = document.querySelector('#impossible');
const timerElement = document.querySelector('#timer');
const clearButton = document.querySelector('#clear');

// GAME CONSTANTS
const maxtries = 10;
const alphabet = "abcdefghjiklmnopqrstuvwxyz";
const keyboardChars = [
	"qwertyuiop",
	"asdfghjkl",
	"zxcvbnm"
];

// GAME DATA
let secretWord = words[Math.floor(Math.random() * words.length)];
const currentWord = [];
const impossibleCharacters = [];
let startTime = new Date();
let over = false;

// FUNCTIONS
const timerInterval = setInterval(() => {
	if (over) return;
	
	const timeInSeconds = Math.floor((new Date() - startTime) / 1000);
	const seconds = `${timeInSeconds % 60}`.padStart(2, "0");
	const minutes = `${Math.floor(timeInSeconds / 60)}`.padStart(2, "0");
	timerElement.textContent = minutes + ":" + seconds;
}, 250);

const guessWord = (word) => {
	const currentRow = gameboard.querySelector('.active');
	
	// Make a mutable copy of the actual word and the guess
	const wordCopy = [...currentWord];
	const secretCopy = [...secretWord];
	
	// The list of letters that are close, and correct
	const closes = [];
	const corrects = [];
	
	// The indices of the correct character to remove (to not accidentally double up)
	const removeIndices = [];
	
	// Iterate through each character and mark down the indices that are identical (GREEN)
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
	if (secretCopy.length) {
		// Iterate through each character and 
		currentWord.forEach(char => {
			// Mark on the bottom keyboard which characters are wrong or maybe close
			keyboard.querySelector('.key_'+char).classList.add(secretCopy.length === 5 ? 'impossible' : 'maybe');
			
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
			gameboard.querySelector('.final').childNodes[i].textContent = secretWord[i] || '';
			gameboard.querySelector('.final').classList.add('victory');
			currentRow.classList.add('victory');
		}
	
		over = true;
	}
	
	// Add the guess results
	currentRow.querySelector('.wrong').textContent = secretCopy.length;
	currentRow.querySelector('.close').textContent = closes.length;
	currentRow.querySelector('.correct').textContent = corrects.length;
	
	currentRow.classList.remove('active');
	currentRow.classList.add('guessed');
	
	// If it was the last guess
	if (currentRow.nextSibling.classList.contains('final') ) {
		for (let i = 0; i < 5; i++) {
			gameboard.querySelector('.final').childNodes[i].textContent = secretWord[i] || '';
		}
		
		over = true;
	} else {
		currentRow.nextSibling.classList.remove('inactive');
		currentRow.nextSibling.classList.add('active');
	}
	
	for (let i = 0; i < 5; i++) {
		currentWord.pop();
	}
	
	if (impossibleCharacters.length) {
		impossibleStyle.textContent = '.' + impossibleCharacters.join(', .');
		impossibleStyle.textContent += ' { border: 2px solid black !important; background-color: black !important; color: white !important; }';
	}
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
		currentRow.childNodes[i].classList.add(currentWord[i]);
	}
}

document.addEventListener('keydown', (evt) => {
	if (over) return;
	if (evt.ctrlKey) return;
	if (evt.altKey) return;
	
	if ([...alphabet, "Enter", "Backspace"].indexOf(evt.key) === -1) return;
	
	keyInput(evt.key);
});

const makeGameBoard = () => {
	startTime = new Date();
	timerElement.textContent = "00:00";
	
	startButton.style.display = '';
	confirmButton.style.display = 'none';
	
	startButton.blur();
	confirmButton.blur();
	
	secretWord = words[Math.floor(Math.random() * words.length)];
	
	over = false;
	
	for (let i = 0; i < 5; i++) {
		currentWord.pop();
	}
	impossibleCharacters.splice(0, impossibleCharacters.length);
	impossibleStyle.textContent = '';
	
	gameboard.innerHTML = '';

	for (let i = 0; i < maxtries + 1; i++) {
		const row = document.createElement('div');
		row.classList.add('row');
		
		if (!i)
			row.classList.add('active');
		else if (i == maxtries)
			row.classList.add('final');
		else
			row.classList.add('inactive');

		for (let j = 0; j < 5 + 3; j++) {
			const cell = document.createElement('div');
			cell.classList.add('cell');
			
			if (j < 5) {
				cell.addEventListener('mousedown', (evt) => {
					if (evt.button === 1) {
						evt.preventDefault();
						cell.classList.remove('override_yes');
						cell.classList.remove('override_no');
						cell.classList.remove('override_maybe');
					}
				});
				
				cell.addEventListener('click', () => {
					if (!cell.parentNode.classList.contains('guessed')) return;
					
					if (cell.classList.contains('override_no')) {
						cell.classList.remove('override_no');
						cell.classList.add('override_maybe');
					}
					else if (cell.classList.contains('override_maybe')) {
						cell.classList.remove('override_maybe');
						cell.classList.add('override_yes');
					}
					else if (cell.classList.contains('override_yes')) {
						cell.classList.remove('override_yes');
					}
					else {
						cell.classList.add('override_no');
					}
				});
			}
			
			if (i == maxtries && j >= 5) continue;
			
			if (j >= 5) {
				cell.classList.add(['wrong', 'close', 'correct'][j-5]);
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
	
	const createKey = (key, text) => {
		const cell = document.createElement('div');
		cell.classList.add('cell');

		cell.textContent = text || key;
		cell.classList.add('key_'+key.toLowerCase());

		cell.addEventListener('mousedown', (evt) => {
			if (evt.button === 1) {
				evt.preventDefault();
				// cell.classList.remove('override_yes');
				// cell.classList.remove('override_no');
				// cell.classList.remove('override_maybe');

				
				// if (cell.classList.contains('override_no')) {
				// 	cell.classList.remove('override_no');
				// 	cell.classList.add('override_maybe');
				// }
				// else if (cell.classList.contains('override_maybe')) {
				// 	cell.classList.remove('override_maybe');
				// 	cell.classList.add('override_yes');
				// }
				// else if (cell.classList.contains('override_yes')) {
				// 	cell.classList.remove('override_yes');
				// }
				// else {
				// 	cell.classList.add('override_no');
				// }
			}
		});

		cell.addEventListener('click', () => {
			keyInput(key);
		});
		
		return cell;
	}
	
	keyboardChars.forEach(row => {
		const keyrow = document.createElement('div');
		keyrow.classList.add('row');
		
		[...row].forEach(key => {
			if (key === "z")
				keyrow.appendChild(createKey("Enter"));
			
			keyrow.appendChild(createKey(key));
			
			if (key === "m")
				keyrow.appendChild(createKey("Backspace", "←"));
		});
		
		keyboard.appendChild(keyrow);
	})
}

makeGameBoard();

startButton.addEventListener('click', () => {
	if (over) makeGameBoard();
	
	startButton.style.display = 'none';
	confirmButton.style.display = '';
	
	setTimeout(() => {
		startButton.style.display = '';
		confirmButton.style.display = 'none';
	}, 2000);
});
confirmButton.addEventListener('click', makeGameBoard);

clearButton.addEventListener('click', () => {
	[...gameboard.childNodes].filter(n => {
		return n.classList.contains('guessed')
	}).forEach(row => {
		[...row.childNodes].forEach(cell => {
			cell.classList.remove('override_no');
			cell.classList.remove('override_yes');
			cell.classList.remove('override_maybe');
		});
	});
});