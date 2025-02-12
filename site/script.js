// Initialize CodeMirror
let editor;
window.onload = function () {
    editor = CodeMirror.fromTextArea(document.getElementById("playerFunction"), {
        mode: "javascript",
        lineNumbers: true,
        theme: "default"
    });

    // Read-only snippet of the Card class
    let readOnlyCode = `// --- Card Class (Read-Only) ---
class Card {
    constructor(card, suit) {
        this.suit = suit;
        this.card = card;
        this.isRed = (suit === "hearts" || suit === "diamonds");
        this.isPicture = ["J", "Q", "K", "A"].includes(card);
    }
    getValue() {
        if (["J", "Q", "K"].includes(this.card)) return 11 + ["J", "Q", "K"].indexOf(this.card);
        if (this.card === "A") return 14;
        return parseInt(this.card);
    }
}
    
// Your function goes below (Editable)
function wantCard(myCards, dealerCards) {`;
    
    // Load saved function from localStorage
    const savedFunction = localStorage.getItem("SinglePlayerPokerPlayerFunction");
    let userFunctionTemplate = savedFunction ? savedFunction : `
    let wanted = [];

    // Return an array of cards that you want to pick up
    // 'DECK' is an array of all cards in a deck (excluding jokers)
    // 'myCards' and 'dealerCards' are arrays of cards
    // A basic strategy is implemented below as an example
    
    // Flush Rush™ (35% winrate)
    if (myCards.length === 0) {
        return DECK;
    } else {
        return DECK.filter(c => c.suit === myCards[0].suit);
    }
    return wanted;`;
    
    // Read-only closing bracket
    let readOnlyCodeEnd = `
}`;
    
    // Set editor content
    let fullCode = readOnlyCode + userFunctionTemplate + readOnlyCodeEnd;
    editor.setValue(fullCode);


    // ** Lock Read-Only Sections Dynamically **
    let readOnlyStartLine = 0;
    let functionDefinitionLine = readOnlyCode.split("\n").length - 1; 
    let closingLines = editor.lineCount() - 1; 

    // Lock the `Card` class and function header
    editor.markText({line: readOnlyStartLine, ch: 0}, {line: functionDefinitionLine + 1, ch: 0}, {
        readOnly: true,
        inclusiveLeft: true,
        inclusiveRight: true
    });

    // Function to dynamically lock the last bracket
    function updateClosingBracketLock() {
        let totalLines = editor.lineCount();
        let newclosingLines = totalLines - 1;

        // Remove previous lock (if any)
        editor.doc.getAllMarks().forEach(mark => {
            let pos = mark.find();
            if (pos && pos.from.line >= closingLines) {
                mark.clear();
            }
        });

        // Apply new lock to the last line
        editor.markText({line: newclosingLines, ch: 0}, {line: newclosingLines + 1, ch: 0}, {
            readOnly: true,
            inclusiveLeft: true,
            inclusiveRight: true
        });

        closingLines = newclosingLines;
    }

    // Update the closing bracket lock every time the user types
    editor.on("change", function () {
        updateClosingBracketLock();
        localStorage.setItem("SinglePlayerPokerPlayerFunction", editor.getValue().replace(readOnlyCode, '').replace(readOnlyCodeEnd, ''));
    });

    // Prevent new lines from being added below the closing bracket
    editor.on("beforeChange", function (instance, change) {
        if (change.origin === "+input" && change.from.line >= closingLines) {
            change.cancel();
        }
    });

    // Initial lock
    updateClosingBracketLock();

    // Load username password
    document.getElementById("username").value = localStorage.getItem("SinglePlayerPokerUsername") || "";
    document.getElementById("password").value = localStorage.getItem("SinglePlayerPokerPassword") || "";

};

// Firebase

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCJB-N3w7PdEDaN-LsfuibyHeSVeRCPZCk",
    authDomain: "single-player-poker.firebaseapp.com",
    projectId: "single-player-poker",
    storageBucket: "single-player-poker.firebasestorage.app",
    messagingSenderId: "311267867448",
    appId: "1:311267867448:web:4f844b1f8a02d7d02e9fcd",
    measurementId: "G-G21G8K8G0P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const db = firebase.firestore();

async function submitToFirebase() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const userFunction = localStorage.getItem("playerFunction");
    const numSimulations = parseInt(document.getElementById("simulations").value) || 10000;
    const winrate = Number(document.getElementById("winrate").innerText.replace('%', '').replace('Winrate: ', ''));
    const duration = Number(document.getElementById("avgGameLength").innerText.replace('Avg Dealer Cards: ', ''));

    if (winrate > 100) {
        alert("Error!");
        return;
    }

    if (!username || !password) {
        alert("Username and password are required!");
        return;
    }

    localStorage.setItem("SinglePlayerPokerUsername", username);
    localStorage.setItem("SinglePlayerPokerPassword", password);

    const userRef = db.collection("unverified_submissions").doc(username.toLowerCase());
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.password !== password) {
            alert("Incorrect password! Submission failed. If you are tying to create a new account, someone has taken that username already.");
            return;
        }
    }

    await userRef.set({
        username,
        password,  // NOT SECURE - only for basic verification
        userFunction,
        numSimulations,
        winrate,
        duration,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Submission successful!");
}

function formatTimestamp(timestamp) {
    if (timestamp && timestamp.seconds) {
        let date = new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
    }
    return "N/A";
}

function fetchLeaderboard() {
    const allScoresTable = document.getElementById("all-scores");
    const verifiedScoresTable = document.getElementById("verified-scores");
    
    db.collection("unverified_submissions").orderBy("winrate", "desc").get().then(snapshot => {
        snapshot.forEach(doc => {
            let data = doc.data();
            let row = `<tr><td>${data.username.replace('[[Official]]', '<span style="color: red;">[Official]</span>')}</td><td>${data.winrate}%</td><td>${data.duration}</td><td>${data.numSimulations}</td><td>${formatTimestamp(data.timestamp)}</td></tr>`;
            allScoresTable.innerHTML += row;
        });
    });
    
    db.collection("verified_submissions").orderBy("winrate", "desc").get().then(snapshot => {
        snapshot.forEach(doc => {
            let data = doc.data();
            let row = `<tr><td>${data.username.replace('[[Official]]', '<span style="color: red;">[Official]</span>')}</td><td>${data.winrate}%</td><td>${data.duration}</td><td>${data.numSimulations}</td><td>${formatTimestamp(data.timestamp)}</td></tr>`;
            verifiedScoresTable.innerHTML += row;
        });
    });
}

async function verify(username) {
    const sourceDocRef = db.collection("unverified_submissions").doc(username.toLowerCase());
    const targetDocRef = db.collection("verified_submissions").doc(username.toLowerCase());

    try {
        const docSnapshot = await sourceDocRef.get();

        if (docSnapshot.exists) {
            const data = docSnapshot.data();
            await targetDocRef.set(data); // Copy document data
            console.log("Verified!");
        } else {
            console.warn("Player does not exist!");
        }
    } catch (error) {
        console.error("Verification failed:", error);
    }
}

// Call function if on leaderboard page
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("all-scores")) {
        fetchLeaderboard();
    }
});


function clearSavedCredentials() {
    localStorage.removeItem("SinglePlayerPokerUsername");
    localStorage.removeItem("SinglePlayerPokerPassword");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    alert("Saved credentials cleared.");
}

// Card Game Constants
const HEARTS = "hearts";
const CLUBS = "clubs";
const DIAMONDS = "diamonds";
const SPADES = "spades";
const SUITS = [HEARTS, CLUBS, DIAMONDS, SPADES];
const ALL_CARDS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const HAND_RANKINGS = {
    "High Card": 1, "One Pair": 2, "Two Pair": 3, "Three of a Kind": 4,
    "Straight": 5, "Flush": 6, "Full House": 7, "Four of a Kind": 8,
    "Straight Flush": 9, "Royal Flush": 10
};

// Card Class
class Card {
    constructor(card, suit) {
        this.suit = suit;
        this.card = card;
        this.isRed = (suit === HEARTS || suit === DIAMONDS);
        this.isPicture = ['J', 'Q', 'K', 'A'].includes(card);
    }

    getValue() {
        if (['J', 'Q', 'K'].includes(this.card)) return 11 + ['J', 'Q', 'K'].indexOf(this.card);
        if (this.card === 'A') return 14;
        return parseInt(this.card);
    }
}

// Create Deck
let deck = [];
for (let suit of SUITS) {
    for (let card of ALL_CARDS) {
        deck.push(new Card(card, suit));
    }
}

const DECK = [...deck];

// Evaluate Hand Strength
function evaluateHand(deck) {
    let values = deck.map(card => card.getValue()).sort((a, b) => b - a);
    let suits = deck.map(card => card.suit);
    let valueCounts = {};
    let suitCounts = {};

    for (let v of values) valueCounts[v] = (valueCounts[v] || 0) + 1;
    for (let s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;

    let isFlush = Object.values(suitCounts).some(count => count >= 5);

    // **🔹 Corrected Straight Detection**
    let uniqueValues = [...new Set(values)]; // Remove duplicates
    let isStraight = uniqueValues.length >= 5 && uniqueValues.some((v, i) =>
        i <= uniqueValues.length - 5 &&
        uniqueValues[i] - uniqueValues[i + 1] === 1 &&
        uniqueValues[i + 1] - uniqueValues[i + 2] === 1 &&
        uniqueValues[i + 2] - uniqueValues[i + 3] === 1 &&
        uniqueValues[i + 3] - uniqueValues[i + 4] === 1
    );

    if (isFlush && isStraight) return ["Straight Flush", values];
    if (Object.values(valueCounts).includes(4)) return ["Four of a Kind", values];
    if (Object.values(valueCounts).includes(3) && Object.values(valueCounts).includes(2)) return ["Full House", values];
    if (isFlush) return ["Flush", values];
    if (isStraight) return ["Straight", values];
    if (Object.values(valueCounts).includes(3)) return ["Three of a Kind", values];
    if (Object.values(valueCounts).filter(v => v === 2).length === 2) return ["Two Pair", values];
    if (Object.values(valueCounts).includes(2)) return ["One Pair", values];

    return ["High Card", values];
}

function getHandValue(deck) {
    let [handType, sortedValues] = evaluateHand(deck);
    return [HAND_RANKINGS[handType], sortedValues];
}

function compareHands(playerHand, dealerHand) {
    let [playerRank, playerValues] = playerHand;
    let [dealerRank, dealerValues] = dealerHand;

    // **Compare hand rankings first**
    if (playerRank > dealerRank) return 1;
    if (playerRank < dealerRank) return -1;

    // **Compare highest card values**
    for (let i = 0; i < playerValues.length; i++) {
        if (playerValues[i] > dealerValues[i]) return 1;
        if (playerValues[i] < dealerValues[i]) return -1;
    }

    return 0; // **Tie**
}

function shuffle(array) {
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
}  

function resetPlayerCode() {
    if (confirm("Are you sure you want to reset your code? This cannot be undone.")) {
        localStorage.removeItem("playerFunction");
        location.reload();
    }
}

// Start Simulation Function
async function startSimulation() {
    let fullCode = editor.getValue();
    let functionStart = fullCode.indexOf("function wantCard(myCards, dealerCards) {") + "function wantCard(myCards, dealerCards) {".length;
    let functionEnd = fullCode.lastIndexOf("}");
    let userFunctionText = fullCode.substring(functionStart, functionEnd).trim();
    let numSimulations = parseInt(document.getElementById("simulations").value) || 10000;

    let win = 0, loss = 0, totalDealerCards = 0;
    let progressBar = document.getElementById("progressBar");
    let progressText = document.getElementById("progressText");

    let wantCard;
    try {
        wantCard = new Function("myCards", "dealerCards", userFunctionText);
    } catch (error) {
        alert("Invalid function: " + error.message);
        return;
    }

    for (let i = 0; i < numSimulations; i++) {
        let myCards = [], dealerCards = [];
        let wantedCards = wantCard(myCards, dealerCards);
        let shuffledDeck = shuffle([...DECK]);

        for (let card of shuffledDeck) {
            if (myCards.length < 5 && wantedCards.some(w => w.suit === card.suit && w.card === card.card)) {
                myCards.push(card);
                wantedCards = wantCard(myCards, dealerCards);
            } else {
                dealerCards.push(card);
                totalDealerCards++;
            }
            if (myCards.length === 5 && dealerCards.length >= 8) break;
        }
        
        if (compareHands(getHandValue(myCards), getHandValue(dealerCards)) > 0) win++;
        else loss++;
        
        progressBar.value = ((i + 1) / numSimulations) * 100;
        progressText.innerText = `Progress: ${(i + 1)}/${numSimulations} (${((win / (win + loss)) * 100).toFixed(2)}% winrate)`;

        if(i % Number(document.getElementById("pageHang").value) == 0) await new Promise(resolve => setTimeout(resolve, 1));
    }

    document.getElementById("winrate").innerText = `Winrate: ${((win / (win + loss)) * 100).toFixed(2)}%`;
    document.getElementById("avgGameLength").innerText = `Avg Dealer Cards: ${(totalDealerCards / numSimulations).toFixed(2)}`;
}
