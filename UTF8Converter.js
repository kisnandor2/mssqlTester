const fs = require('fs');
const chardet = require('chardet');

class UTF8Converter {
	constructor(){
		this.from = 'éáúûűüóőö';
		this.to = 'eauuuuooo';
	}

	removeAccentedLetters(text){
		[...this.from].forEach((letter, index)=>{
			let reg = new RegExp(letter, "g");
			text = text.replace(reg, this.to.charAt(index));
		})
		return text;
	}

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