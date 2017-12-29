//(select\s.*\sfrom\s.*\s(join.*\s)*(where\s(.|\n)*\s)?(group\sby\s.*\s)?(having\s.*\s)?(\s?intersect\s?)?(\s?union\s?)?(\s?except\s)?)(?R)*

const testIt = false;
const name = "snim1671.sql"

const { execSync } = require('child_process');
const fs = require('fs');

const SqlFilter = require('./SqlFilter');
const UTF8Converter = require('./UTF8Converter');
const SqlOutputHandler = require('./SqlOutputHandler');
const config = require('./config.json');

class Tester {
	constructor(lazy = false, testing = false){
		this.testing = testing;
		this.lazy = lazy;

		this.testConfigFile();

		this.maxPoints = config.MAX_POINTS_FOR_ALL_EXERCISES;
		this.fileNamePattern = new RegExp(config.INPUT_FILENAME_PATTERN);

		this.sqlFilter = new SqlFilter();
		this.utf8Converter = new UTF8Converter();
		this.sqlOutputHandler = new SqlOutputHandler(this.lazy); //lazy or not?

		this.allExercises = this.sqlOutputHandler.getSolvedOutputs(config.SOLVED_OUTPUTS_FOLDER, config.EXERCISES);
	}

	testConfigFile(){
		let exercises = config.EXERCISES;
		exercises.forEach((exercise, index)=>{
			if (exercise.exercisePoints == undefined){
				exercise.exercisePoints = new Array(exercise.exerciseCount);
				exercise.exercisePoints.fill(1);
			}
			if (exercise.exerciseCount != exercise.exercisePoints.length){
				throw `Ex ${exercise.name}: exercisePointList and exerciseCount not matching ${exercise.exerciseCount} .. ${exercise.exercisePoints.length}`;
			}
			let sum = exercise.exercisePoints.reduce((a,b)=> a + b, 0);
			if (sum != config.MAX_POINTS_FOR_ALL_EXERCISES){
				throw `Ex ${exercise.name}: Exercise points does not equal MAX_POINTS_FOR_ALL_EXERCISES ${sum} .. ${config.MAX_POINTS_FOR_ALL_EXERCISES}`;
			}
		})
	}

	testOne(fileName){
		try {
			if (!this.fileNameIsCorrect(fileName)){
				fs.unlinkSync(fileName);
				return {error: 'Incorrect fileName', points: 0};
			}
			this.fileName = fileName;
			//Create a tmp file that is escaped
			this.newFileName = this.removeUnnecessaryLines(fileName);
			this.outputFileName = 'output_' + fileName + '.txt';

			let db = config.EXERCISES[this.getExerciseNumber(fileName)].databaseName;
			let cmd = 'sqlcmd -i ' + this.newFileName + ' -o ' + this.outputFileName + ' /d ' + db;
			let cleanDbCmd = 'sqlcmd -i Feladatok/cleanDB.sql /d ' + db;

			execSync(cleanDbCmd);
			execSync(cmd);

			if (this.sqlOutputHandler.syntaxErrorOccured(this.outputFileName)){
				this.removeEveryFile();
				return {error: 'Syntax error in the sql script', points: 0};
			}

			console.log(fileName);

			let exercise = this.getExerciseNumber(fileName);
			let ret = this.getScoreOfFile(this.outputFileName, exercise);

			this.removeEveryFile();

			return ret;
		}
		catch(err){
			console.log(fileName + " " + err);
			return {error: "Unknown error! See output in cmd!", points: -10};
		}
	}

	removeEveryFile(){
		fs.unlinkSync(this.newFileName);
		if (this.testing)
			return;
		fs.unlinkSync(this.outputFileName);
		fs.unlinkSync(this.fileName);
	}

	removeUnnecessaryLines(fileName){
		let newFileName = 'escape_' + fileName;
		this.utf8Converter.convertFileToUTF8(fileName);
		this.sqlFilter.filter(fileName, newFileName);
		return newFileName;
	}

	getExerciseNumber(fileName){
		let splittedFileName = fileName.split('_');
		let exerciseStr = splittedFileName[splittedFileName.length - 1].split('.')[0]
		let exercise = parseInt(exerciseStr);
		return exercise || 0;
	}

	fileNameIsCorrect(fileName){
		return this.fileNamePattern.test(fileName);;
	}

	getScoreOfFile(output, exerciseIndex){
		let outputExercises = this.sqlOutputHandler.getExercisesInList('./', output);
		let exercises = JSON.parse(JSON.stringify(this.allExercises[exerciseIndex]));
		let points = this.maxPoints;
		let incorrectSelects = [];
		let incorrectSelectsStmts = [];
		outputExercises = this.sqlOutputHandler.sortExercises(outputExercises);

		let lista = new Array(config.EXERCISES[exerciseIndex].exerciseCount).fill().map((e,i)=>i+1);
		let oks = [];

		let i = 0;
		while(i < outputExercises.length){
			let j = 0;

			while (j < exercises.length){
				if (this.sqlOutputHandler.exercisesEqual(outputExercises[i], exercises[j])){
					exercises.splice(j, 1);
					oks.push(lista[j]);
					lista.splice(j, 1);
				}
				else
					++j;
			}
			++i;
		}

		lista = new Array(config.EXERCISES[exerciseIndex].exerciseCount).fill().map((e,i)=>i+1);
		lista.forEach((elem, index)=>{
			if (oks.indexOf(elem) == -1){
				incorrectSelects.push(elem);
				points -= config.EXERCISES[exerciseIndex].exercisePoints[index];
			}
		})

		return {points, incorrectSelects};
	}

}

module.exports = Tester;

if (testIt){
	t = new Tester(true, true); //testing
	console.log(t.testOne(name));
}
