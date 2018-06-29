const { execSync } = require('child_process');
const fs = require('fs');

const SqlFilter = require('./SqlFilter');
const UTF8Converter = require('./UTF8Converter');
const SqlOutputHandler = require('./SqlOutputHandler');
const CONFIG = require('./config.json');

/**
* @class Tester
* Class for comparing sql outputs and grading them
*/
class Tester {
	/**
	* @constructor
	* @param {bool} lazy - if true the column order and header names are not compared
	* @param {bool} testing - true if wanna test
	*/
	constructor(lazy = false, testing = false){
		this.testing = testing;
		this.lazy = lazy;

		this.testConfigFile();

		this.maxPoints = CONFIG.MAX_POINTS_FOR_ALL_EXERCISES;
		this.fileNamePattern = new RegExp(CONFIG.INPUT_FILENAME_PATTERN);

		this.sqlFilter = new SqlFilter();
		this.utf8Converter = new UTF8Converter();
		this.sqlOutputHandler = new SqlOutputHandler(this.lazy); //lazy or not?

		this.allExercises = this.sqlOutputHandler.getSolvedOutputs(CONFIG.SOLVED_OUTPUTS_FOLDER, CONFIG.EXERCISES);
	}

	/**
	* Check if the config file is well formated
	*/
	testConfigFile(){
		let exercises = CONFIG.EXERCISES;
		exercises.forEach((exercise, index)=>{
			if (exercise.exercisePoints == undefined){
				exercise.exercisePoints = new Array(exercise.exerciseCount);
				exercise.exercisePoints.fill(1);
			}
			if (exercise.exerciseCount != exercise.exercisePoints.length){
				throw `Ex ${exercise.name}: exercisePointList and exerciseCount not matching ${exercise.exerciseCount} .. ${exercise.exercisePoints.length}`;
			}
			let sum = exercise.exercisePoints.reduce((a,b)=> a + b, 0);
			if (sum != CONFIG.MAX_POINTS_FOR_ALL_EXERCISES){
				throw `Ex ${exercise.name}: Exercise points does not equal MAX_POINTS_FOR_ALL_EXERCISES ${sum} .. ${CONFIG.MAX_POINTS_FOR_ALL_EXERCISES}`;
			}
		})
	}

	/**
	* Test a single file
	* @param {string} fileName - the name of the file to be tested
	* @returns {int/string} pointsCollected - how many points were collected, or a string with error
	*/
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

			let db = CONFIG.EXERCISES[this.getExerciseNumber(fileName)].databaseName;
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

	/**
	* Delete all the files that were generated during testing phase
	* Delete input, already tested file
	*/
	removeEveryFile(){
		if (this.testing)
			return;
		fs.unlinkSync(this.newFileName);
		fs.unlinkSync(this.outputFileName);
		fs.unlinkSync(this.fileName);
	}

	/**
	* Convert the input file to readable and filtered SQL, that will be tested
	* @param {string} fileName - name of the file that will be tested
	* @returns {string} newFileName - name of the new file that is already filtered
	*/
	removeUnnecessaryLines(fileName){
		let newFileName = 'escape_' + fileName;
		this.utf8Converter.convertFileToUTF8(fileName);
		this.sqlFilter.filter(fileName, newFileName);
		return newFileName;
	}

	/**
	* Get the number of the submission from fileName
	* @params {string} fileName - name of the input file
	* @returns {int} submissionNumber
	*/
	getExerciseNumber(fileName){
		let splittedFileName = fileName.split('_');
		let exerciseStr = splittedFileName[splittedFileName.length - 1].split('.')[0]
		let exercise = parseInt(exerciseStr);
		return exercise || 0;
	}

	/**
	* Check if fileName matches config file name pattern
	* @returns {bool}
	*/
	fileNameIsCorrect(fileName){
		return this.fileNamePattern.test(fileName);;
	}

	/**
	* Get the score of a single file
	* @param {string} output - name of the file that was filtered and cleaned
	* @param {int} exerciseIndex - number of the submission
	* @returns {Object} points, incorrectSelects - how many points were collected, and which selects were incorrect
	*/
	getScoreOfFile(output, exerciseIndex){
		let outputExercises = this.sqlOutputHandler.getExercisesInList('./', output);
		let exercises = JSON.parse(JSON.stringify(this.allExercises[exerciseIndex]));
		let points = this.maxPoints;
		let incorrectSelects = [];
		let incorrectSelectsStmts = [];
		outputExercises = this.sqlOutputHandler.sortExercises(outputExercises);

		let lista = new Array(CONFIG.EXERCISES[exerciseIndex].exerciseCount).fill().map((e,i)=>i+1);
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

		lista = new Array(CONFIG.EXERCISES[exerciseIndex].exerciseCount).fill().map((e,i)=>i+1);
		lista.forEach((elem, index)=>{
			if (oks.indexOf(elem) == -1){
				incorrectSelects.push(elem);
				points -= CONFIG.EXERCISES[exerciseIndex].exercisePoints[index];
			}
		})

		return {points, incorrectSelects};
	}

}

module.exports = Tester;

if (require.main === module){
	// const name = "snim1671.sql"
	const name = process.argv[2];
	if (name == undefined){
		console.log("Usage: " + process.argv[1] + " nameOfFileToBeTested")
		process.exit(-1);
	}
	t = new Tester(true, true); //testing
	console.log(t.testOne(name));
}
