export interface ManagerInfo {

name: string;

avatar: string | null;

sleeperId?: string;

title?: string;

favoriteTeam?: string; // Standard NFL abbreviation (min, atl, nyj, etc.)

bio?: string;

}



export const MANAGER_MAP: Record<string, ManagerInfo> = {

// --- ACTIVE OWNERS ---

"Aaron Hawkins": {

name: "Aaron",

avatar: "/managers/Aaron.png",

sleeperId: "583513420586848256",

favoriteTeam: "atl",

bio: "The 2025 Champ. Fear the Nudas Priest."

},

"Brian Stevens": {

name: "Brian",

avatar: "/managers/Brian.png",

sleeperId: "343129212162523136",

favoriteTeam: "nyj",

bio: "Jets fan by choice, champion by nature."

},

"David Besedich": {

name: "Dave",

avatar: "/managers/Dave.png",

sleeperId: "466663208728391680",

favoriteTeam: "cle",

bio: "The Schmendrick himself."

},

"Doug Fordham": {

name: "Doug",

avatar: "/managers/Doug.jpg",

sleeperId: "73400761740312576",

favoriteTeam: "was",

bio: "Steady hands, consistent rosters."

},

"JD Dowling": {

name: "JD",

avatar: "/managers/JD.png",

sleeperId: "342850391018356736",

favoriteTeam: "dal",

bio: "The 2020 Champion and resident Cowboys faithful."

},

"Jordan Maslyn": {

name: "Jordan",

avatar: "/managers/Jordan.jpg",

sleeperId: "341412060426436608",

favoriteTeam: "min",

bio: "Skol! 2024 Champion."

},

"Landon Elliott": {

name: "Landon",

avatar: "/managers/Landon.png",

sleeperId: "469199353672626176",

favoriteTeam: "min",

bio: "Building the purple dynasty."

},

"Ray Long": {

name: "Ray",

avatar: "/managers/Ray.png",

sleeperId: "342828350391230464",

title: "Commish",

favoriteTeam: "sf",

bio: "The Commish. Managing the chaos since 2011."

},

"Jeffrey Hudgins": {

name: "Jeffrey",

avatar: "/managers/Jeffrey.png",

sleeperId: "356621920969555968",

favoriteTeam: "sf",

bio: "Co-managing the Niners' empire."

},

"Rashad Gresham": {

name: "Rashad",

avatar: "/managers/Rashad.png",

sleeperId: "864186418971418624",

favoriteTeam: "det",

bio: "The Lions are roaring."

},

"Stan Schoppe": {

name: "Stan",

avatar: "/managers/Stan.jpg",

sleeperId: "1260048448384667648",

favoriteTeam: "nyj",

bio: "Veteran manager, elite strategist."

},

"Travis Miller": {

name: "Travis",

avatar: "/managers/Travis.png",

sleeperId: "342831451382841344",

favoriteTeam: "pit",

bio: "Steel City values, fantasy results."

},

"Tommy Moore": {

name: "Tommy",

avatar: "/managers/Tommy.png",

sleeperId: "342849293037608960",

favoriteTeam: "no",

bio: "5-time Champion. The Ship of Theseus."

},

"Wade Cameron": {

name: "Wade",

avatar: "/managers/Wade.png",

sleeperId: "342838548870762496",

title: "Asst. to the Commish",

favoriteTeam: "sf",

bio: "The Witchdoctor. 2019 Champion."

},



// --- STAFF ---

"Damon Davis": {

name: "Damon",

avatar: "/managers/Damon.png",

sleeperId: "737878619958947840",

favoriteTeam: "car",

bio: "Staff management and logistics."

},



// --- RETIRED OWNERS ---

"Adam Lind": {

name: "Adam",

avatar: "/managers/Adam.png",

sleeperId: "556676922517524480",

favoriteTeam: "min",

bio: "Retired legend."

},

"Billy Biddle": {

name: "Billy",

avatar: "/managers/Billy.png",

sleeperId: "470428278931320832",

favoriteTeam: "nyj",

bio: "Past competitor."

},

"Bryan Doane": {

name: "Bryan",

avatar: "/managers/Bryan.png",

favoriteTeam: "min",

bio: "Viking at heart."

},

"Chris Barras": {

name: "Chris",

avatar: "/managers/Chris.png",

sleeperId: "345934777502699520",

favoriteTeam: "was",

bio: "Area 10 Veteran."

},

"Darren Kusaj": {

name: "Darren",

avatar: null,

favoriteTeam: "dal",

bio: "Retired owner."

},

"Garet Prior": {

name: "Garet",

avatar: "/managers/Garet.png",

favoriteTeam: "atl",

bio: "The Prior dynasty legacy."

},

"Gordie Gahagan": {

name: "Gordie",

avatar: "/managers/Gordie.png",

favoriteTeam: "min",

bio: "Original 2011 Champion."

},

"James Minnix": {

name: "James",

avatar: "/managers/James.png",

favoriteTeam: "nyj",

bio: "Retired manager."

},

"Keith Polarek": {

name: "Keith",

avatar: "/managers/Keith.png",

favoriteTeam: "cle",

bio: "Former title holder."

},

"Nicholas Bates": {

name: "Nicholas",

avatar: "/managers/Nicholas.png",

favoriteTeam: "sf",

bio: "Retired owner."

},

"Patrick Leahey": {

name: "Patrick",

avatar: "/managers/Patrick.png",

sleeperId: "342831898403377152",

favoriteTeam: "nyj",

bio: "Past league member."

},

"Rachel Woolard": {

name: "Rachel",

avatar: "/managers/Rachel.jpg",

favoriteTeam: "was",

bio: "Retired owner."

},

"Ricky Taylor": {

name: "Ricky",

avatar: "/managers/Ricky.png",

sleeperId: "98907192333582336",

favoriteTeam: "sf",

bio: "Legacy manager."

},

"Zach Woolard": {

name: "Zach",

avatar: "/managers/Zach.png",

favoriteTeam: "was",

bio: "Area 10 original."

},

};



/**

* Helper to resolve a name or ID to ManagerInfo.

* This ensures "Real Names" are used as the primary anchor.

*/

export const getManagerDetails = (input: string | undefined): ManagerInfo => {

if (!input) {

return { name: "Unknown", avatar: null };

}



const lowerInput = input.toLowerCase();



// 1. Try to match by Sleeper ID first (Most reliable for active owners)

const idMatch = Object.values(MANAGER_MAP).find(m => m.sleeperId === input);

if (idMatch) {

return idMatch;

}



// 2. Try to match by Real Name (For manual archives)

const nameMatch = Object.keys(MANAGER_MAP).find(k => k.toLowerCase() === lowerInput);

if (nameMatch) {

return MANAGER_MAP[nameMatch];

}



// 3. Try to match by Nickname/Short Name

const nickMatch = Object.values(MANAGER_MAP).find(m => m.name.toLowerCase() === lowerInput);

if (nickMatch) {

return nickMatch;

}



// 4. Fallback (split first name)

return {

name: input.split(" ")[0] || input,

avatar: null

};

};