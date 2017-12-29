const fs = require('fs');

class SqlOutputHandler {

	//if lazy = true, headRowsSkipped, columnOrderSkipped
	constructor(lazy = false){
		//Patterns
		this.outputExerciseEnd = /rows affected/g
		this.changedDBPattern = /Changed database context.*/g
		this.syntaxErrorPattern = /MSG \d{1}.*/g
		this.minusSignPattern = /----/g

		this.lazy = lazy;
	}

	getSolvedOutputs(folderName, outputTextList){
		let allExercises = [];
		outputTextList.forEach((elem, index)=>{
			let exercises = this.getExercisesInList(folderName, elem.outputFileName);
			exercises = this.sortExercises(exercises);
			allExercises.push(exercises);
		});
		return allExercises;
	}

	getExercisesInList(folderName, fileName) {
		let data = fs.readFileSync(folderName + fileName);
		data = data.toString().split("\r\n");
		let exercises = [];
		let exercise = [];
		let elso = true;
		for (let i = 0; i < data.length; ++i){
			if(data[i].match(this.changedDBPattern))
				continue;
			if(data[i].match(this.minusSignPattern))
				continue;
			if (this.lazy && elso){
				elso = false;
				continue;
			}
			if(data[i].match(this.outputExerciseEnd)){
				elso = true;
				if (exercise.length == 0)
					continue;
				if (exercise[0] == ''){
					exercise = [];
					continue;
				}
				exercises.push(exercise)
				exercise = [];
			}
			else {
				let ex = data[i].toUpperCase().replace(/\s\s+/g, ' ');
				if (this.lazy)
					ex = [...ex].sort().join();
				exercise.push(ex);
			}
		}
		return exercises;
	}

	sortExercises(exercises){
		let retExercises = [];
		for (let i = 0; i < exercises.length; ++i){
			retExercises.push(exercises[i].sort());
		}
		return retExercises;
	}

	syntaxErrorOccured(fileName){
		let data = fs.readFileSync(fileName).toString().toUpperCase();
		return data.match(this.syntaxErrorPattern);
	}

	exercisesEqual(exercise1, exercise2) {
		if (exercise1.length != exercise2.length) 
			return false;
		for (let i = 0; i < exercise1.length; ++i){
			if (exercise1[i] != exercise2[i]){
				return false;
			}
		}
		return true;
	}

}

module.exports = SqlOutputHandler;