const cardValues = ['Gold', 'Silver', 'Bronze'];
const { v4: uuidv4 } = require('uuid');

// const gameSetup = {
// cardsInHand: [
//     {
//         card_id: 'string',
//         card_type: 'string',
//     }, ...

// ],
// cardsOnTable: [
//     {
//         card_id: 'string',
//         card_type: 'string',
//     }, ...

// ]
// };

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
	const deck = [];
	for (let i = 0; i < 6; i++) {
		deck.push({ card_type: 'Gold', card_id: uuidv4() });
	}
	for (let i = 0; i < 8; i++) {
		deck.push({ card_type: 'Silver', card_id: uuidv4() });
	}
	for (let i = 0; i < 10; i++) {
		deck.push({ card_type: 'Bronze', card_id: uuidv4() });
	}
	return shuffle(deck);
};

const dealFromDeck = (cardsInDeck, n) => {
	return cardsInDeck.splice(0, n);
};

const gameSetup = () => {
	const cardsInDeck = createCardsInDeck();
	const cardsOnTable = dealFromDeck(cardsInDeck, 5);

	return { cardsOnTable, cardsInDeck };
};

module.exports = { gameSetup, dealFromDeck };
