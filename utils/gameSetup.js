const { v4: uuidv4 } = require('uuid');
const { testDeck, testBonusPoints } = require('../testDeck');

function shuffle(array) {
	let currentIndex = array.length,
		randomIndex;

	while (currentIndex > 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		];
	}

	return array;
}
const createCardsInDeck = () => {
	if (process.env.NODE_ENV === 'test') return testDeck;

	const deck = [];
	for (let i = 0; i < 6; i++) {
		deck.push({ card_type: 'Diamond', card_id: uuidv4() });
	}
	for (let i = 0; i < 6; i++) {
		deck.push({ card_type: 'Gold', card_id: uuidv4() });
	}
	for (let i = 0; i < 6; i++) {
		deck.push({ card_type: 'Silver', card_id: uuidv4() });
	}
	for (let i = 0; i < 8; i++) {
		deck.push({ card_type: 'Spice', card_id: uuidv4() });
	}
	for (let i = 0; i < 8; i++) {
		deck.push({ card_type: 'Textiles', card_id: uuidv4() });
	}
	for (let i = 0; i < 10; i++) {
		deck.push({ card_type: 'Bronze', card_id: uuidv4() });
	}
	// for (let i = 0; i < 11; i++) {
	// 	deck.push({ card_type: 'Camels', card_id: uuidv4() });
	// }
	return shuffle(deck);
};

const dealFromDeck = (cardsInDeck, n) => {
	return cardsInDeck.splice(0, n);
};

const tokenValues = {
	Diamond: [5, 5, 5, 7, 7],
	Gold: [5, 5, 5, 6, 6],
	Silver: [5, 5, 5, 5, 5],
	Textile: [1, 1, 2, 2, 3, 3, 5],
	Spice: [1, 1, 2, 2, 3, 3, 5],
	// Leather: [1, 1, 1, 1, 1, 1, 2, 3, 4],
	Bronze: [1, 1, 1, 1, 1, 1, 2, 3, 4],
};

const createBonusPoints = () => {
	if (process.env.NODE_ENV === 'test') return testBonusPoints;
	return {
		5: shuffle([8, 8, 9, 10, 10]),
		4: shuffle([4, 4, 5, 5, 6, 6]),
		3: shuffle([1, 1, 2, 2, 2, 3, 3]),
	};
};

module.exports = {
	createCardsInDeck,
	dealFromDeck,
	createBonusPoints,
	tokenValues,
};
