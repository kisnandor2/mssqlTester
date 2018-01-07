//(select\s.*\sfrom\s.*\s(join.*\s)*(where\s(.|\n)*\s)?(group\sby\s.*\s)?(having\s.*\s)?(\s?intersect\s?)?(\s?union\s?)?(\s?except\s)?)(?R)*

const testIt = false;
const name = "test.sql";

const { execSync } = require('child_process');
const fs = require('fs');

const SqlFilter = require('./SqlFilter');
const UTF8Converter = require('./UTF8Converter');
const SqlOutputHandler = require('./SqlOutputHandler');
const config = require('./config.json');
const SqlFileSplitter = require('./SqlFileSplitter');

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
		this.sqlFileSplitter = new SqlFileSplitter();

		this.allExercises = this.sqlOutputHandler.getSolvedOutputs(config.SOLVED_OUTPUTS_FOLDER, config.EXERCISES);
	}

	testConfigFile(){
		if (!config.OUTPUT_DIR)
			config.OUTPUT_DIR = "./out";
		let exercises = config.EXERCISES;
		exercises.forEach((exercise)=>{
			if (exercise.exercisePoints === undefined){
				exercise.exercisePoints = new Array(exercise.exerciseCount);
				exercise.exercisePoints.fill(1);
			}
			if (exercise.exerciseCount !== exercise.exercisePoints.length){
				throw `Ex ${exercise.name}: exercisePointList and exerciseCount not matching ${exercise.exerciseCount} .. ${exercise.exercisePoints.length}`;
			}
			let sum = exercise.exercisePoints.reduce((a,b)=> a + b, 0);
			if (sum !== config.MAX_POINTS_FOR_ALL_EXERCISES){
				throw `Ex ${exercise.name}: Exercise points does not equal MAX_POINTS_FOR_ALL_EXERCISES ${sum} .. ${config.MAX_POINTS_FOR_ALL_EXERCISES}`;
			}
		});
		try{
						fs.mkdirSync(config.OUTPUT_DIR);
		}
		catch (err){
						// console.log(err);
		}
	}

	splitAndExecInputFile(username, input, output, db){
		process.chdir(config.OUTPUT_DIR);
		try{
			fs.mkdirSync(`./${username}`);
		}
		catch (err){
			// console.log(err);
		}
		process.chdir(`./${username}`);
		fs.renameSync(`../../${input}`, `./${input}`);
		this.removeOutputFiles();
		SqlFileSplitter.removePreviousFiles();

		this.sqlFileSplitter.split(input);
		let ret = [];
		let i = 0;
		let outputFileName = 'output';
		let fileName = `${outputFileName}${i}.sql`;
		while (fs.existsSync(fileName)){
            let cmd = `sqlcmd -i ${fileName} -o ${output}_${i}.txt /d ${db}`;
            execSync(cmd);
            ret.push(`${output}_${i}.txt`);
            ++i;
            fileName = `${outputFileName}${i}.sql`;
        }
		process.chdir('../../'); //go back to base dir
		return ret;
	}

	testOne(fileName){
		if (!this.fileNameIsCorrect(fileName)){
			fs.unlinkSync(fileName);
			return {error: 'Incorrect fileName', points: 0};
		}
		this.sqlFileSplitter = new SqlFileSplitter();
		this.fileName = fileName;
		//Create a tmp file that is escaped
		this.newFileName = this.removeUnnecessaryLines(fileName);
		this.outputFileBaseName = 'output_' + fileName;

		let exerciseNumber = Tester.getExerciseNumber(fileName);
		let db = config.EXERCISES[exerciseNumber].databaseName;
		let cleanDbCmd = 'sqlcmd -i Feladatok/cleanDB.sql /d ' + db;

		execSync(cleanDbCmd);
		let username = fileName.match(this.fileNamePattern);
		let outputFiles = this.splitAndExecInputFile(username ,this.newFileName, this.outputFileBaseName, db);

		console.log(fileName);
		let ret = this.getScoreOfAFileList(username, outputFiles, exerciseNumber);
		fs.unlinkSync(fileName);
		return ret;
	}

	removeOutputFiles(){
		fs.readdirSync('./').forEach(fileName => {
			if (fileName.match(/^output_.*\.txt/))
				fs.unlinkSync(fileName);
		})
	}

	removeEveryFile(){
		fs.unlinkSync(this.newFileName);
		if (this.testing)
			return;
		this.removeOutputFiles();
		fs.unlinkSync(this.fileName);
	}

	removeUnnecessaryLines(fileName){
		let newFileName = 'escape_' + fileName;
		this.utf8Converter.convertFileToUTF8(fileName);
		this.sqlFilter.filter(fileName, newFileName);
		return newFileName;
	}

	static getExerciseNumber(fileName){
		let splitFileName = fileName.split('_');
		let exerciseStr = splitFileName[splitFileName.length - 1].split('.')[0];
		let exercise = parseInt(exerciseStr);
		return exercise || 0;
	}

	fileNameIsCorrect(fileName){
		return this.fileNamePattern.test(fileName);
	}

	getScoreOfAFileList(username, outputFiles, exerciseIndex){
		let exerciseOrder = config.EXERCISES[exerciseIndex].exerciseOrder;
		let exerciseCount = exerciseOrder.length;
		let exercises = JSON.parse(JSON.stringify(this.allExercises[exerciseIndex]));
		let oks = [];
		let lista = new Array(exerciseCount).fill(0).map((e,i)=>i+1);
		for (let i = 0; i < outputFiles.length; ++i){
			let indexOfMatch = this.getScoreOfASingleFile(username, outputFiles[i], exercises);
			if (indexOfMatch > -1){
				oks.push(lista[indexOfMatch]);
				exercises.splice(indexOfMatch, 1);
				lista.splice(indexOfMatch, 1);
			}
		}
		let oksHelper = new Set();
		for (let i = 0; i < oks.length; ++i){
			oksHelper.add(Math.floor(exerciseOrder[oks[i]-1]));
		}
		oks = Array.from(oksHelper);
		let incorrectSelects = [];
		let points = this.maxPoints;
		lista = new Array(config.EXERCISES[exerciseIndex].exerciseCount).fill(0).map((e,i)=>i+1);
		lista.forEach((elem, index)=>{
			if (oks.indexOf(elem) === -1){
				incorrectSelects.push(elem);
				points -= config.EXERCISES[exerciseIndex].exercisePoints[index];
			}
		});
		return {points, incorrectSelects};
	}

	getScoreOfASingleFile(username, outputFileName, exercises){
		let baseDir = `./${config.OUTPUT_DIR}/${username}/`;
		let outputExercise = this.sqlOutputHandler.getExercisesInList(baseDir, outputFileName);
		if (outputExercise.length === 0)
			return -2; //nothing to check
		outputExercise = SqlOutputHandler.sortExercises(outputExercise)[0];
		for (let i = 0; i < exercises.length; ++i){
			if (SqlOutputHandler.exercisesEqual(outputExercise, exercises[i]))
				return i;
		}
		return -1;
	}

	getScoreOfFile(output, exerciseIndex){
		let outputExercises = this.sqlOutputHandler.getExercisesInList('./', output);
		let exercises = JSON.parse(JSON.stringify(this.allExercises[exerciseIndex]));
		let points = this.maxPoints;
		let incorrectSelects = [];
		outputExercises = SqlOutputHandler.sortExercises(outputExercises);

		let lista = new Array(config.EXERCISES[exerciseIndex].exerciseCount).fill(0).map((e,i)=>i+1);
		let oks = [];

		let i = 0;
		while(i < outputExercises.length){
			let j = 0;

			while (j < exercises.length){
				if (SqlOutputHandler.exercisesEqual(outputExercises[i], exercises[j])){
					exercises.splice(j, 1);
					oks.push(lista[j]);
					lista.splice(j, 1);
				}
				else
					++j;
			}
			++i;
		}

		lista = new Array(config.EXERCISES[exerciseIndex].exerciseCount).fill(0).map((e,i)=>i+1);
		lista.forEach((elem, index)=>{
			if (oks.indexOf(elem) === -1){
				incorrectSelects.push(elem);
				points -= config.EXERCISES[exerciseIndex].exercisePoints[index];
			}
		});

		return {points, incorrectSelects};
	}

}

module.exports = Tester;

if (testIt){
	t = new Tester(true, true); //testing
	console.log(t.testOne(name));
}
