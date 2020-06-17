////////////////////////////////////////////
// Spelling
//
// Copyright 2020 Casey Smith
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
////////////////////////////////////////////


////////////////////////////////////////////
// Globals

//Speech rate on apple devices (ios, macos) is faster
// than android and windows, so we need to know
// if we're on an apple device
var isMac = navigator.userAgent.toLowerCase().indexOf("mac os") > -1;

//For keeping track of what's happening
var state=0;
var voiceGetterInterval;
var counter = 0;
var numPositiveVoiceCheck = 0;
var initializedSpeech = 0;

//Spelling lists
var spellingLists = [
  ["better", "follow", "happen", "different", "people", "trouble", "terrible", "awesome", "special"],
  ["enough", "through", "goes", "does", "question", "slowly", "suddenly", "probably", "trouble"],
	["younger", "too . ! (as in also)", "to . ! (a direction)", "two . ! (a number)", "tries", "children", "different", "other", "introduction", "should", "number"],
	["there . ! (as in) . . ! ... (there are.) ! ... (or.) ! ...  (over there)", "they're . ! ... (as in). ! ...  (they). ! ... (are. !)", "their . ! ... (as in). ! ... (belonging to them). ! ...)", "turned ! ... (as in changed direction)", "intelligent", "secret", "music", "magical", "laugh", "oops"],
	["please", "nurse", "gem", "fairy", "fairies", "prominent", "american", "objects", "families", "trampoline"],
	["space", "rangers", "because", "choose", "chose", "guide", "really", "student", "video", "usually"],
	["golf", "great .... ! (as in ... ! . awesome)", "rice", "person", "aunt ... ! (as in your parent's sister)", "machine", "scent ... ! (as in the way something smells)", "cross", "guess", "detector"],
	["toilet", "picture", "photo", "junction", "adventure", "normal", "tube (like a pipe)", "general", "weird", "recommend"],
	["change", "pushed", "immature", "depends", "again", "skinnier", "burnt", "human", "sooty", "tern ... ! (as in the bird)"]
];
var pronunciationLists = [
  ["bet er", "fole ow", "happ enn", "diff fer ent", "pee-o pleh", "trow-ooh bleh", "tehr ih bleh", "awe some", "speh see-al"],
  ["ee nuff", "through", "goes", "does", "quest ion", "slow lee", "sud enn lee", "pro bab lee", "trow-ooh bleh"],
	["yoh-un ger", "too", "to", "two", "tries", "child ren", "diff fer ent", "oth er", "in tro duct ion", "show uld", "num ber"],
	["there", "they're", "their", "turn ed", "in tell i gent", "sec ret", "music", "mag i cal", "lah ooh guh huh", "oops"],
	["plea ah seh", "noorse", "gem", "fair e", "fair i-ease", "pro min ent", "am er i can", "ob jects", "fam i lie-ease", "tramp o line"],
	["ess pace", "rangers", "be cause", "choose", "chose", "goo ide", "real lee", "stew dent", "vid e oh", "you sue al lee"],
	["golf", "great", "rice", "per son", "awnt", "mah chine", "skent", "cross", "goo ess", "de tect or"],
	["toy let", "pick chure", "pah hoe toe", "junc shun", "ad ven chure", "nor mal", "tube", "gen er al", "weird", "re com mend"],
	["chan ghee", "push ed", "im ma ture", "dee pends", "a gain", "skinnier", "burn t", "hu man", "soot e", "tern"]
];

var correct = [];
var currList = 0;
var currWordIndex = 0;
var failOnCurrent = 0;


//Parameters the user can change
var lang = "en-gb";
var rate = 1.0;
//if(isMac) {
//    rate = 1.4;
//}
var voiceIndex;

//General storage
var voices;

//References to DOM elements
var readyElem;
var settingsElem;
var speechVoiceSelectorElem;
var speechRateSelectorElem;
var spellingListSelectorElem;
var settingsButtonElem;
var okButtonElem;
var cancelButtonElem;
var spellGuessElem;
var advanceButtonElem;
var progressDivElem;

// Globals
///////////////////////////////////////////




///////////////////////////////////////////
// Functions

function shuffleListOrder(listIndex) {
	for(let i=spellingLists[listIndex].length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[spellingLists[listIndex][i], spellingLists[listIndex][j]] = [spellingLists[listIndex][j], spellingLists[listIndex][i]];
		[pronunciationLists[listIndex][i], pronunciationLists[listIndex][j]] = [pronunciationLists[listIndex][j], pronunciationLists[listIndex][i]];
	}
}


//Initialize correct array
function initializeCorrect(listIndex) {
  correct = [];
  for(var i=0; i<spellingLists[listIndex].length; i++) {
		correct[i] = 0;
  }
}

function restart() {
  currWordIndex = 0;
  state = 0;
  initializeCorrect(currList);
  failOnCurrent = 0;
	shuffleListOrder(currList);
  setProgress();
}


function getWord(listNum, wordNum) {
  return spellingLists[listNum][wordNum].replace(/\s.*/g, "");
}

function getWordForSaying(listNum, wordNum) {
	return spellingLists[listNum][wordNum];
}

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}
function getPronunciation(listNum, wordNum) {
  var p = toTitleCase(pronunciationLists[listNum][wordNum]);
  p = p.replace(/\s/g, "... ") + "...";
  return p;
}

function sayIt(text) {
  var voice = voices[speechVoiceSelectorElem.options[voiceIndex].value];
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

function focusText() {
  spellGuessElem.focus();
}

function readWordsTest() {
  var voice = voices[speechVoiceSelectorElem.options[voiceIndex].value];
  lang = voice.lang;
  var rateIndex = speechRateSelectorElem.selectedIndex;
  rate = speechRateSelectorElem.options[rateIndex].value;

  for(var j=0; j<spellingLists.length; j++) {
		for(var i=0; i<spellingLists[j].length; i++) {
	    if(true) {//confirm("Say next?")) {
				var word = getWordForSaying(j,i);
				var pronunciation = getPronunciation(j,i);
				sayIt(word + "...");
				sayIt(pronunciation + "...");
	    } else {
				break;
	    }
		}
  }
}

function readCurrWord() {
  var voice = voices[speechVoiceSelectorElem.options[voiceIndex].value];
  lang = voice.lang;
  var rateIndex = speechRateSelectorElem.selectedIndex;
  rate = speechRateSelectorElem.options[rateIndex].value;

  sayIt(getWordForSaying(currList, currWordIndex));

}

function advanceToNextWord() {
  var correctCount = 0;
  var startIndex = currWordIndex;
  var numWords = spellingLists[currList].length;
  for(var i=1; i<=numWords; i++) {
		var testIndex = startIndex + i;
		if(testIndex >= numWords) {
	    testIndex -= numWords;
		}
		if(correct[testIndex]) {
	    correctCount++;
		} else {
	    currWordIndex = testIndex;
	    break;
		}
  }
  return (correctCount != numWords);
}

function checkSpelling() {
  var guess = spellGuessElem.value.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  var word = getWord(currList, currWordIndex);
  if(!word.localeCompare(guess)) {
		//Correct
		sayIt("That's correct! . !");
		correct[currWordIndex] = !failOnCurrent;
		spellGuessElem.value = "";
		if(!advanceToNextWord()) {
	    //Done!
	    alert("You Got Them All!");
	    restart();
	    return;
		}
		failOnCurrent = 0;
		setProgress();
		readCurrWord();
  } else {
		//Incorrect
		failOnCurrent = 1;
		sayIt("Not quite. !");
		sayIt(getWordForSaying(currList, currWordIndex)+ ". !");
		sayIt(getPronunciation(currList, currWordIndex));
  }
}

function setProgress() {
  htmlContent = "<table>";
  for(var i=0; i<spellingLists[currList].length; i++) {
		htmlContent += "<tr><td>";
		if(i == currWordIndex) {
	    htmlContent += "&rarr;";
		}
		htmlContent += "</td><td><span style=\"color:";
		if(correct[i]) {
	    htmlContent += "green";
		} else {
	    htmlContent += "black";
		}
		htmlContent += ";\">" + (i+1) + "</span></td></tr>"
  }
  htmlContent += "</table>";
  progressDivElem.innerHTML = htmlContent;
}

function showMe() {
  spellGuessElem.value = getWord(currList, currWordIndex);
}

//Called by an onload on the body
function initialize() {
  //stop the screen from rubber banding around pointlessly
  document.ontouchmove = function(event) { event.preventDefault(); }

  //get references to DOM elements into global variables for faster access
  readyElem = document.getElementById('ready');
  settingsElem = document.getElementById("settings");
  speechVoiceSelectorElem = document.getElementById("speechVoiceSelector");
  speechRateSelectorElem = document.getElementById("speechRateSelector");
  spellingListSelectorElem = document.getElementById("spellingListSelector");
  settingsButtonElem = document.getElementById("settingsButton");
  okayButtonElem = document.getElementById("okButton");
  cancelButtonElem = document.getElementById("cancelButton");
  spellGuessElem = document.getElementById("spellGuess");
  advanceButtonElem = document.getElementById("advanceButton");
  progressDivElem = document.getElementById("progressDiv");

  //add event listeners
  //if("ontouchend" in window) {
  //	settingsButtonElem.addEventListener("touchend", showSettings, false);
  //okayButtonElem.addEventListener("touchend", settingsOK, false);
  //cancelButtonElem.addEventListener("touchend", settingsCancel, false);
  //} else {
  //	settingsButtonElem.addEventListener("mouseup", showSettings, false);
  //	okayButtonElem.addEventListener("mouseup", settingsOK, false);
  //  cancelButtonElem.addEventListener("mouseup", settingsCancel, false);
  //}

  state = 0;

  //now populate the speech speed selector
  for(var i=11; i<=30; i++) {
		var val = i/10.0;
		var el = document.createElement("option");
		if((val == 1.0 && isMac) ||
			 (val == 1.0 && !isMac)) {
	    el.textContent = val + " (Default)";
		} else {
	    el.textContent = val;
		}
		el.value = val;
		speechRateSelectorElem.appendChild(el);
  }

  //check storage for the speech rate
  if(typeof localStorage === 'object') {
		try {
	    if(!localStorage.storedSpeechRate) {
				localStorage.storedSpeechRate = rate;
	    }
	    rate = localStorage.storedSpeechRate;
		} catch (e) {
	    //silently ignore
		}
  }
  //loop through the speed selector drop down and select
  //  the appropriate one
  var numOptions = speechRateSelectorElem.options.length;
  for(var i=0; i<numOptions; i++) {
		if(speechRateSelectorElem.options[i].value == rate) {
	    speechRateSelectorElem.options[i].selected = true;
		}
  }

  numPositiveVoiceCheck = 0;
  initializedSpeech = 0;

  //getVoicesList returns nothing for a while as the browser
  //  loads the speech module, so we'll just keep calling
  //  it until we're confident it loaded the full list
  voiceGetterInterval = setInterval(function() {getVoicesList();}, 200);

  if(typeof localStorage === 'object') {
		try {
	    var storedIndex = localStorage.storedListIndex;
	    if(storedIndex >= 0 && storedIndex < spellingListSelectorElem.options.length) {
				spellingListSelectorElem.selectedIndex = storedIndex;
	    }
		} catch (e) {
	    //silently ignore
		}
  }

  settingsOK();

	restart();

  focusText();

}


//Show the panel where the user can change the settings
function showSettings() {
    settingsElem.style.visibility="visible";
}

function blurAll() {
    speechRateSelectorElem.blur();
    speechVoiceSelectorElem.blur();
    spellingListSelectorElem.blur();
}

//Store settings when the user clicks okay
function settingsOK() {

  blurAll();

  //voice
  voiceIndex = speechVoiceSelectorElem.selectedIndex;
  if(voiceIndex >= 0) {
		//update the utterances
		var voice = voices[speechVoiceSelectorElem.options[voiceIndex].value];
		//store to localStorage
		if(typeof localStorage === 'object') {
	    try {
				localStorage.storedVoiceName = voice.name + " " + voice.lang;
	    } catch (e) {
				//silently ignore
	    }
		}
  }

  //rate
  var rateIndex = speechRateSelectorElem.selectedIndex;
  rate = speechRateSelectorElem.options[rateIndex].value;
  //store it to localStorage
  if(typeof localStorage === 'object') {
		try {
	    localStorage.storedSpeechRate = rate;
		} catch (e) {
	    //silently ignore
		}
  }

  //List selector
  var listIndex = spellingListSelectorElem.selectedIndex;
  if(listIndex != currList) {
		currList = listIndex;
		restart();
  }
  if(typeof localStorage === 'object') {
		try {
	    localStorage.storedListIndex = listIndex;
		} catch(e) {
	    //silently ignore
		}
  }

  //Hide settings panel
  settingsElem.style.visibility="hidden";

}

//User clicked cancel -- replace settings with stored values
function settingsCancel() {

    blurAll();

    //reset the voices selector
    speechVoiceSelectorElem.options[voiceIndex].selected = true;

    //reset the speech rate
    var numOptions = speechRateSelectorElem.options.length;
    for(var i=0; i<numOptions; i++) {
	if(speechRateSelectorElem.options[i].value == rate) {
	    speechRateSelectorElem.options[i].selected = true;
	}
    }

    //finally, hide the panel
    settingsElem.style.visibility="hidden";
}

//In theory, if the appcache file is updated, the app will find out
//  (assumedly it checks the server when there's an internet connection?)
//Then, the app can update itself accordingly
function updateSite(event) {
    window.applicationCache.swapCache();
}
window.applicationCache.addEventListener('updateready', updateSite, false);

//Check what voices are available
//This won't work when the page first loads, so we'll
//  callit several times with delays between, and wait until we have
//  a list that's full multiple times.
function getVoicesList() {
  voices = window.speechSynthesis.getVoices();
  if (voices.length !== 0) {
		numPositiveVoiceCheck++;
		if(numPositiveVoiceCheck < 2) {
	    //Make sure it's been populated for a while so that
	    //  we didn't accidentally get an incomplete list
	    return;
		}

		//populate the selector with the available voices
		var numVoices = voices.length;
		for(var i=0; i<numVoices; i++) {
	    //only include ones that don't require internet access
	    if(voices[i].localService) {
				var el = document.createElement("option");
				el.textContent = voices[i].name + " " + voices[i].lang;
				el.value = i;
				speechVoiceSelectorElem.appendChild(el);
	    }
		}
  } else {
		return;
  }

  //By default, select the first en-US entry
  var numSelector = speechVoiceSelector.options.length;
  for(var i=0; i<numSelector; i++) {
		if(voices[speechVoiceSelectorElem.options[i].value].lang == "en-US" ||
			 voices[speechVoiceSelectorElem.options[i].value].lang == "en_US") { //android uses underscore
	    speechVoiceSelectorElem.options[i].selected = true;
	    break;
		}
  }

  //now check local storage -- if we've already stored the voice, then select it.  Otherwise, store the default
  if(typeof localStorage === 'object') {
		try {
	    if(typeof localStorage.storedVoiceName == 'undefined') {
				localStorage.storedVoiceName = voices[speechVoiceSelector.options[speechVoiceSelectorElem.selectedIndex].value].name + " " + voices[speechVoiceSelector.options[selectV.selectedIndex].value].lang;;
	    } else {
				var targetName = localStorage.storedVoiceName;
				for(var i=0; i<numSelector; i++) {
					if(voices[speechVoiceSelector.options[i].value].name + " " + voices[speechVoiceSelector.options[i].value].lang == targetName) {
						speechVoiceSelector.options[i].selected = true;;
						break;
					}
				}
	    }
		} catch (e) {
	    //silently ignore
		}
  }
  voiceIndex = speechVoiceSelector.selectedIndex;

  clearInterval(voiceGetterInterval);
}

// Functions
///////////////////////////////////////////


