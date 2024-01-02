const cardValues = ["Gold", "Silver", "Bronze"];

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
  const cardsInDeck = shuffle(
    Array(6)
      .fill("Gold")
      .concat(Array(8).fill("Silver"))
      .concat(Array(10).fill("Bronze"))
  );
  return cardsInDeck;
};

const dealFromDeck = (n) => {
  return cardsInDeck.splice(0, n);
};

const gameSetup = () => {
  const cardsInDeck = createCardsInDeck();
  const cardsOnTable = dealFromDeck(5);

  return {
    cardsOnTable,
    cardsInDeck,
  };
};

module.exports = { gameSetup, dealFromDeck };
