const testDeck = [
	{
		card_type: 'Silver',
		card_id: 'f7666612-1624-4c65-afc1-db260b8aa13b',
	},
	{
		card_type: 'Bronze',
		card_id: 'b4c2d52f-01d3-4e72-be35-33b66b20a614',
	},
	{
		card_type: 'Silver',
		card_id: 'b22ebfc1-4aa3-48e2-8b46-6c874d49219f',
	},
	{
		card_type: 'Gold',
		card_id: '75754222-025c-4046-ae89-5f69c4eef65d',
	},
	{
		card_type: 'Bronze',
		card_id: 'd37e233e-42f8-4fb8-b92b-2173a696cd46',
	},
	{
		card_type: 'Bronze',
		card_id: '00222345-73e2-41a9-82c2-b91bb452acc8',
	},
	{
		card_type: 'Gold',
		card_id: '260b684f-b792-4270-9a3c-3a9aa85190cc',
	},
	{
		card_type: 'Bronze',
		card_id: '4ca70a85-44d1-4605-a0d8-7284ee2e3331',
	},
	{
		card_type: 'Bronze',
		card_id: 'eac22667-3b53-4b4d-8b7f-6d7526b2a069',
	},
	{
		card_type: 'Bronze',
		card_id: '06a7b16f-ad8c-4ac8-9083-5d3d9a0a40c2',
	},
	{
		card_type: 'Gold',
		card_id: '86c4e27e-3b98-456d-8b9f-fffe4b9e1461',
	},
	{
		card_type: 'Gold',
		card_id: 'b37d6cf1-f5ad-460a-8039-a6e2234567dd',
	},
	{
		card_type: 'Silver',
		card_id: '74664451-e538-49c3-8e43-017e399d9c23',
	},
	{
		card_type: 'Bronze',
		card_id: '5c1dfa59-74da-47a7-be5c-0803826e01de',
	},
	{
		card_type: 'Silver',
		card_id: '64f0bc91-5e8c-40de-a18a-13f07418fb4d',
	},
	{
		card_type: 'Silver',
		card_id: 'a4002ebd-4594-4b32-a241-c7e553cd63c5',
	},
	{
		card_type: 'Silver',
		card_id: '160fd677-9c00-4c7a-974b-a71c6b2c1429',
	},
	{
		card_type: 'Gold',
		card_id: 'd7d0b1f1-de71-4c20-b144-597cc6195e5c',
	},
	{
		card_type: 'Bronze',
		card_id: '7be58240-86a8-4405-9150-1e3dd0fe9e55',
	},
	{
		card_type: 'Silver',
		card_id: '18f45acc-b05a-41df-b238-f13df1e21e51',
	},
	{
		card_type: 'Silver',
		card_id: 'f3ef4933-47cf-4bf4-ae8c-700d1d3c1de8',
	},
	{
		card_type: 'Gold',
		card_id: '8b743dd0-042b-4257-9588-bc5f06dbb8c6',
	},
	{
		card_type: 'Bronze',
		card_id: 'e30e4eba-2b0c-4fa6-9250-12253cabbba5',
	},
	{
		card_type: 'Bronze',
		card_id: 'b6b94820-fab4-4566-86f7-88d392004408',
	},
];

const testBonusPoints = {
	5: [8, 8, 9, 10, 10],
	4: [4, 4, 5, 5, 6, 6],
	3: [1, 1, 2, 2, 2, 3, 3],
};

// cardsInDeck:
// [
// 	{
// 		card_type: 'Silver',
// 		card_id: 'a4002ebd-4594-4b32-a241-c7e553cd63c5',
// 	},
// 	{
// 		card_type: 'Silver',
// 		card_id: '160fd677-9c00-4c7a-974b-a71c6b2c1429',
// 	},
// 	{
// 		card_type: 'Gold',
// 		card_id: 'd7d0b1f1-de71-4c20-b144-597cc6195e5c',
// 	},
// 	{
// 		card_type: 'Bronze',
// 		card_id: '7be58240-86a8-4405-9150-1e3dd0fe9e55',
// 	},
// 	{
// 		card_type: 'Silver',
// 		card_id: '18f45acc-b05a-41df-b238-f13df1e21e51',
// 	},
// 	{
// 		card_type: 'Silver',
// 		card_id: 'f3ef4933-47cf-4bf4-ae8c-700d1d3c1de8',
// 	},
// 	{
// 		card_type: 'Gold',
// 		card_id: '8b743dd0-042b-4257-9588-bc5f06dbb8c6',
// 	},
// 	{
// 		card_type: 'Bronze',
// 		card_id: 'e30e4eba-2b0c-4fa6-9250-12253cabbba5',
// 	},
// 	{
// 		card_type: 'Bronze',
// 		card_id: 'b6b94820-fab4-4566-86f7-88d392004408',
// 	},
// ],
//cardsOnTable:

//  [
//     {
//       card_type: 'Silver',
//       card_id: 'f7666612-1624-4c65-afc1-db260b8aa13b'
//     },
//     {
//       card_type: 'Bronze',
//       card_id: 'b4c2d52f-01d3-4e72-be35-33b66b20a614'
//     },
//     {
//       card_type: 'Silver',
//       card_id: 'b22ebfc1-4aa3-48e2-8b46-6c874d49219f'
//     },
//     {
//       card_type: 'Gold',
//       card_id: '75754222-025c-4046-ae89-5f69c4eef65d'
//     },
//     {
//       card_type: 'Bronze',
//       card_id: 'd37e233e-42f8-4fb8-b92b-2173a696cd46'
//     }
//   ],

// Player 1 Hand
// [
//   {
//     card_type: 'Bronze',
//     card_id: '00222345-73e2-41a9-82c2-b91bb452acc8'
//   },
//   {
//     card_type: 'Gold',
//     card_id: '260b684f-b792-4270-9a3c-3a9aa85190cc'
//   },
//   {
//     card_type: 'Bronze',
//     card_id: '4ca70a85-44d1-4605-a0d8-7284ee2e3331'
//   },
//   {
//     card_type: 'Bronze',
//     card_id: 'eac22667-3b53-4b4d-8b7f-6d7526b2a069'
//   },
//   {
//     card_type: 'Bronze',
//     card_id: '06a7b16f-ad8c-4ac8-9083-5d3d9a0a40c2'
//   }
// ]
//Player 2 Hand

// [
// 	{
// 		card_type: 'Gold',
// 		card_id: '86c4e27e-3b98-456d-8b9f-fffe4b9e1461',
// 	},
// 	{
// 		card_type: 'Gold',
// 		card_id: 'b37d6cf1-f5ad-460a-8039-a6e2234567dd',
// 	},
// 	{
// 		card_type: 'Silver',
// 		card_id: '74664451-e538-49c3-8e43-017e399d9c23',
// 	},
// 	{
// 		card_type: 'Bronze',
// 		card_id: '5c1dfa59-74da-47a7-be5c-0803826e01de',
// 	},
// 	{
// 		card_type: 'Silver',
// 		card_id: '64f0bc91-5e8c-40de-a18a-13f07418fb4d',
// 	},
// ]

module.exports = { testDeck, testBonusPoints };
