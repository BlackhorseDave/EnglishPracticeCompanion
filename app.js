const practiceSentence = document.getElementById("practice-sentence");
const progress = document.getElementById("progress");
const recognizedText = document.getElementById("recognized-text");
const feedback = document.getElementById("feedback");

const listenButton = document.getElementById("listen-button");
const speakButton = document.getElementById("speak-button");
const previousButton = document.getElementById("previous-button");
const repeatButton = document.getElementById("repeat-button");
const nextButton = document.getElementById("next-button");

let currentSentenceIndex = 0;
const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (!SpeechRecognition) {
    speakButton.disabled = true;
    speakButton.textContent = "Speech unavailable";
}

function displaySentence() {
    practiceSentence.textContent = sentences[currentSentenceIndex];

    progress.textContent =
        `Sentence ${currentSentenceIndex + 1} of ${sentences.length}`;

    recognizedText.textContent = "Nothing yet";
    feedback.textContent = "";
}

function speakSentence() {
    if (!("speechSynthesis" in window)) {
        alert("Text-to-speech is not supported by this browser.");
        return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(
        sentences[currentSentenceIndex]
    );

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

function calculateWordSimilarity(expected, spoken) {
    const expectedWords = normalizeText(expected).split(" ");
    const spokenWords = normalizeText(spoken).split(" ");

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

    const wordErrors =
        distances[expectedWords.length][spokenWords.length];

    const longestSentence = Math.max(
        expectedWords.length,
        spokenWords.length
    );

    return 1 - wordErrors / longestSentence;
}

function checkAnswer(transcript) {
    const expectedSentence = sentences[currentSentenceIndex];
    const similarity = calculateWordSimilarity(
        expectedSentence,
        transcript
    );

    if (similarity >= 0.8) {
        feedback.textContent = "Well done — that was close enough!";
        feedback.style.color = "#16845b";
    } else {
        feedback.textContent = "Almost — try again.";
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