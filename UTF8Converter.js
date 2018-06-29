const fs = require('fs');
const chardet = require('chardet');

/**
* @class UTF8Converter
* Convert the sql script to UTF-8
*/
class UTF8Converter {
	/**
	* @constructor
	*/
	constructor(){
		this.from = 'éáúûűüóőö';
		this.to = 'eauuuuooo';
	}

	/**
	* Clean string from accented letters
	* @param {string} inputStr
	* @returns {string} outputStr - cleaned string
	*/
	removeAccentedLetters(text){
		[...this.from].forEach((letter, index)=>{
			let reg = new RegExp(letter, "g");
			text = text.replace(reg, this.to.charAt(index));
		})
		return text;
	}

	/**
	* Convert file to UTF-8 with chardet package
	* @param {string} fileName - input filename
	*/
	convertFileToUTF8(fileName){
		let buffer = fs.readFileSync(fileName);
		let originalEncoding = chardet.detect(buffer);
		if (originalEncoding == "ISO-8859-1")
			originalEncoding = "latin1"
		else if (originalEncoding == "ISO-8859-2")
			originalEncoding = "latin1"
		let file = fs.readFileSync(fileName, originalEncoding);
		fs.unlinkSync(fileName);
		file = this.removeAccentedLetters(file.toString());
		file = this.cleanString(file);
		fs.writeFileSync(fileName, file, 'UTF-8');
	}

	/**
	* Remove invalid characters form a string
	* @param {string} inputStr
	* @returns {string} outputStr - cleaned string
	*/
	cleanString(input) {
	  var output = "";
	  for (var i=0; i<input.length; i++) {
	    if (input.charCodeAt(i) <= 127) {
	      output += input.charAt(i);
	    }
	  }
	  return output;
	}
}

module.exports = UTF8Converter;