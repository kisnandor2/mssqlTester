const fs = require('fs');

class SqlOutputHandler {

	//if lazy = true, headRowsSkipped, columnOrderSkipped
	constructor(lazy = false){
		//Patterns
		this.outputExerciseEnd = /rows affected/g;
		this.changedDBPattern = /Changed database context.*/g;
		this.syntaxErrorPattern = /MSG \d.*/g;
		this.minusSignPattern = /----/g;

		this.lazy = lazy;
	}

	getSolvedOutputs(folderName, outputTextList){
		let allExercises = [];
		outputTextList.forEach((elem)=>{
			let exercises = this.getExercisesInList(folderName, elem.outputFileName);
			exercises = SqlOutputHandler.sortExercises(exercises);
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
			data[i] = data[i].trim();
			if (data[i].length === 0)
				continue;
			if(data[i].match(this.changedDBPattern))
				continue;
			if (this.lazy && data[i].match(this.minusSignPattern)){
				elso = false;
				continue;
            }
			else if(data[i].match(this.minusSignPattern))
				continue;
			if (this.lazy && elso && data[i].match(this.outputExerciseEnd))
				continue;
			if (this.lazy && elso){
				elso = false;
				continue;
			}
			if(data[i].match(this.outputExerciseEnd)){
				elso = true;
				let j = 0;
				while (j < exercise.length){
					if (exercise[j] === '')
						exercise.splice(j, 1);
					else
						++j;
				}
                if (exercise.length === 0) {
					exercise = [];
                    continue;
                }
				exercises.push(exercise);
				exercise = [];
			}
			else {
				let ex = data[i].toUpperCase().replace(/\s\s+/g, ' ');
				if (this.lazy)
					ex = [...ex].sort().join('');
				exercise.push(ex.trim());
			}
		}
		return exercises;
	}

	static sortExercises(exercises){
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

	static exercisesEqual(exercise1, exercise2) {
		if (exercise1.length !== exercise2.length)
			return false;
		for (let i = 0; i < exercise1.length; ++i){
			if (exercise1[i] !== exercise2[i]){
				return false;
			}
		}
		return true;
	}

}

module.exports = SqlOutputHandler;