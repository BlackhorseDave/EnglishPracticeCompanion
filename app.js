const practiceSentence = document.getElementById("practice-sentence");
const progress = document.getElementById("progress");
const recognizedText = document.getElementById("recognized-text");
const feedback = document.getElementById("feedback");
const differenceHelp = document.getElementById("difference-help");
let encouragementIndex = 0;
const listenButton = document.getElementById("listen-button");
const speakButton = document.getElementById("speak-button");
const previousButton = document.getElementById("previous-button");
const repeatButton = document.getElementById("repeat-button");
const nextButton = document.getElementById("next-button");

let currentSentenceIndex = 0;
const sentenceOrder = sentences.map((_, index) => index);

function shuffleSentenceOrder() {
    for (let i = sentenceOrder.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [sentenceOrder[i], sentenceOrder[randomIndex]] =
            [sentenceOrder[randomIndex], sentenceOrder[i]];
    }
}

function getCurrentSentence() {
    return sentences[sentenceOrder[currentSentenceIndex]];
}
const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (!SpeechRecognition) {
    speakButton.disabled = true;
    speakButton.textContent = "Speech unavailable";
}

function displaySentence() {
    practiceSentence.textContent = getCurrentSentence();

    progress.textContent =
        `Sentence ${currentSentenceIndex + 1} of ${sentences.length}`;

    recognizedText.textContent = "Nothing yet";
    feedback.textContent = "";
    feedback.style.color = "#344054";
    differenceHelp.hidden = true;
}

function speakSentence() {
    if (!("speechSynthesis" in window)) {
        alert("Text-to-speech is not supported by this browser.");
        return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(
        getCurrentSentence());

    speech.lang = "en-US";
    speech.rate = 0.9;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[’']/g, "'")
        .replace(/\bi'm\b/g, "i am")
        .replace(/\byou're\b/g, "you are")
        .replace(/\bwe're\b/g, "we are")
        .replace(/\bthey're\b/g, "they are")
        .replace(/\bhe's\b/g, "he is")
        .replace(/\bshe's\b/g, "she is")
        .replace(/\bit's\b/g, "it is")
        .replace(/\bi've\b/g, "i have")
        .replace(/\byou've\b/g, "you have")
        .replace(/\bwe've\b/g, "we have")
        .replace(/\bthey've\b/g, "they have")
        .replace(/\bi'll\b/g, "i will")
        .replace(/\byou'll\b/g, "you will")
        .replace(/\bwe'll\b/g, "we will")
        .replace(/\bcan't\b/g, "cannot")
        .replace(/\bwon't\b/g, "will not")
        .replace(/\bdon't\b/g, "do not")
        .replace(/\bdidn't\b/g, "did not")
        .replace(/\bdoesn't\b/g, "does not")
        .replace(/\bcouldn't\b/g, "could not")
        .replace(/\bwouldn't\b/g, "would not")
        .replace(/\bshouldn't\b/g, "should not")
        .replace(/[.,!?;:"“”‘’']/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenizeForComparison(text) {
    const parts = text.split(/(\s+)/);
    const words = [];

    parts.forEach((part, index) => {
        const normalized = normalizeText(part);

        if (normalized) {
            normalized.split(" ").forEach(word => {
                words.push({ word, index });
            });
        }
    });

    return { parts, words };
}
function renderDifferences(element, tokens, differences) {
    element.textContent = "";

    tokens.parts.forEach((part, index) => {
        if (differences.has(index)) {
            const mark = document.createElement("mark");
            mark.className = "difference";
            mark.textContent = part;
            element.appendChild(mark);
        } else {
            element.appendChild(document.createTextNode(part));
        }
    });
}

function calculateWordSimilarity(expected, spoken) {
    const expectedTokens = tokenizeForComparison(expected);
    const spokenTokens = tokenizeForComparison(spoken);
    const expectedWords = expectedTokens.words.map(token => token.word);
    const spokenWords = spokenTokens.words.map(token => token.word);

    const rows = expectedWords.length + 1;
    const columns = spokenWords.length + 1;
    const distances = Array.from(
        { length: rows },
        () => Array(columns).fill(0)
    );

    for (let row = 0; row < rows; row += 1) {
        distances[row][0] = row;
    }

    for (let column = 0; column < columns; column += 1) {
        distances[0][column] = column;
    }

    for (let row = 1; row < rows; row += 1) {
        for (let column = 1; column < columns; column += 1) {
            const wordsMatch =
                expectedWords[row - 1] === spokenWords[column - 1];

            const substitutionCost = wordsMatch ? 0 : 1;

            distances[row][column] = Math.min(
                distances[row - 1][column] + 1,
                distances[row][column - 1] + 1,
                distances[row - 1][column - 1] + substitutionCost
            );
        }
    }

    const expectedDifferences = new Set();
    const spokenDifferences = new Set();

    let row = expectedWords.length;
    let column = spokenWords.length;

    while (row > 0 || column > 0) {
        if (
            row > 0 &&
            column > 0 &&
            expectedWords[row - 1] === spokenWords[column - 1]
        ) {
            row -= 1;
            column -= 1;
        } else if (
            row > 0 &&
            column > 0 &&
            distances[row][column] === distances[row - 1][column - 1] + 1
        ) {
            expectedDifferences.add(expectedTokens.words[row - 1].index);
            spokenDifferences.add(spokenTokens.words[column - 1].index);
            row -= 1;
            column -= 1;
        } else if (
            row > 0 &&
            distances[row][column] === distances[row - 1][column] + 1
        ) {
            expectedDifferences.add(expectedTokens.words[row - 1].index);
            row -= 1;
        } else {
            spokenDifferences.add(spokenTokens.words[column - 1].index);
            column -= 1;
        }
    }

    renderDifferences(practiceSentence, expectedTokens, expectedDifferences);
    renderDifferences(recognizedText, spokenTokens, spokenDifferences);

    differenceHelp.hidden =
        expectedDifferences.size === 0 && spokenDifferences.size === 0;

    const wordErrors =
        distances[expectedWords.length][spokenWords.length];

    const longestSentence = Math.max(
        expectedWords.length,
        spokenWords.length
    );

    return longestSentence > 0 ? 1 - wordErrors / longestSentence : 0;
}

function checkAnswer(transcript) {
    const expectedSentence = getCurrentSentence();
    const similarity = calculateWordSimilarity(
        expectedSentence,
        transcript
    );

    if (!normalizeText(transcript)) {
        feedback.textContent = "No words were heard — please try again.";
        feedback.style.color = "#b54708";
    } else if (similarity === 1) {
        feedback.textContent = "Correct! — exact match";
        feedback.style.color = "#116b48";
    } else if (similarity >= 0.8) {
        const encouragements = [
            "Well done — that was close enough!",
            "Good job — most words matched!",
            "Nice work — that’s a pass!",
            "Nearly there — just a small difference!"
        ];

        feedback.textContent =
            encouragements[encouragementIndex % encouragements.length];
        encouragementIndex += 1;
        feedback.style.color = "#116b48";
    } else {
        feedback.textContent = "Let’s try again — compare the yellow words.";
        feedback.style.color = "#b54708";
    }
}
function startListening() {
    if (!SpeechRecognition) {
        feedback.textContent =
            "Speech recognition is not supported by this browser.";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
        practiceSentence.textContent = getCurrentSentence();
        differenceHelp.hidden = true;
        feedback.style.color = "#344054";
        speakButton.textContent = "Listening…";
        recognizedText.textContent = "Listening…";
        feedback.textContent = "Speak the sentence now.";
    };

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;

        recognizedText.textContent = transcript;
        checkAnswer(transcript);
    };

    recognition.onerror = function (event) {
        recognizedText.textContent = "Nothing recognized";
        feedback.textContent = `Recognition error: ${event.error}`;
    };

    recognition.onend = function () {
        speakButton.textContent = "🎤 Speak";
    };

    recognition.start();
}
function showPreviousSentence() {
    if (currentSentenceIndex > 0) {
        currentSentenceIndex -= 1;
        displaySentence();
    }
}

function showNextSentence() {
    if (currentSentenceIndex < sentences.length - 1) {
        currentSentenceIndex += 1;
        displaySentence();
    }
}

listenButton.addEventListener("click", speakSentence);
speakButton.addEventListener("click", startListening);
repeatButton.addEventListener("click", speakSentence);
previousButton.addEventListener("click", showPreviousSentence);
nextButton.addEventListener("click", showNextSentence);

shuffleSentenceOrder();
displaySentence();
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("./sw.js")
            .catch(function (error) {
                console.error("Service worker registration failed:", error);
            });
    });
}