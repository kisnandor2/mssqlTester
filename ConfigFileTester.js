var fs = require('fs');

class ConfigFileTester {
	constructor(){
		this.CONFIG = require('./config.json');
		this.test();
	}
	test(){
		let exercises = this.CONFIG.EXERCISES;
		exercises.forEach((exercise, index)=>{
			if (exercise.exercisePoints == undefined){
				exercise.exercisePoints = new Array(exercise.exerciseCount);
				exercise.exercisePoints.fill(1);
			}
			if (exercise.exerciseCount != exercise.exercisePoints.length){
				throw `Ex ${exercise.name}: exercisePointList and exerciseCount not matching ${exercise.exerciseCount} <-> ${exercise.exercisePoints.length}`;
			}
			let sum = exercise.exercisePoints.reduce((a,b)=> a + b, 0);
			if (sum != this.CONFIG.MAX_POINTS_FOR_ALL_EXERCISES){
				throw `Ex ${exercise.name}: Exercise points does not equal MAX_POINTS_FOR_ALL_EXERCISES ${sum} <-> ${this.CONFIG.MAX_POINTS_FOR_ALL_EXERCISES}`;
			}
		})
		if (this.CONFIG.SOLVED_OUTPUTS_FOLDER == undefined)
			this.CONFIG.SOLVED_OUTPUTS_FOLDER = "./Feladatok";
		if (this.CONFIG.INPUT_FILENAME_PATTERN == undefined)
			throw "No FILENAME pattern! Can't test without it";
		if (this.CONFIG.MAX_POINTS_FOR_ALL_EXERCISES == undefined || this.MAX_POINTS_FOR_ALL_EXERCISES <= 0)
			throw "Invalid(<=0) or missing MAX_POINTS_FOR_ALL_EXERCISES! Can't test without it";
		if (this.CONFIG.ZIPPED_SUBMISSIONS_FOLDER == undefined)
			this.CONFIG.ZIPPED_SUBMISSIONS_FOLDER = "./submissions";
		if (this.CONFIG.UNZIPPED_SUBMISSIONS_FOLDER == undefined)
			this.CONFIG.UNZIPPED_SUBMISSIONS_FOLDER = "./unzipped_submissions";
		if (this.CONFIG.SOLVED_SUBMISSIONS_FOLDER == undefined)
			this.CONFIG.SOLVED_SUBMISSIONS_FOLDER = "./solved_submissions";
		if (this.CONFIG.FILTERED_AND_SOLVED_SUBMISSIONS_FOLDER == undefined)
			this.CONFIG.FILTERED_AND_SOLVED_SUBMISSIONS_FOLDER = "./escaped_submissions";
		exercises.forEach((exercise, index)=>{
			let solvedOutputName = this.CONFIG.SOLVED_OUTPUTS_FOLDER + "/" + exercise.outputFileName;
			if (!fs.existsSync(solvedOutputName)){
				throw `Output ${solvedOutputName} is missing!`
			}	
		})
		let folders = [];
		folders.push(this.CONFIG.UNZIPPED_SUBMISSIONS_FOLDER);
		folders.push(this.CONFIG.SOLVED_SUBMISSIONS_FOLDER);
		folders.push(this.CONFIG.FILTERED_AND_SOLVED_SUBMISSIONS_FOLDER);
		folders.forEach((dir, index)=>{
			if (!fs.existsSync(dir)){
				fs.mkdirSync(dir);
			}	
		})
		fs.readdirSync(this.CONFIG.UNZIPPED_SUBMISSIONS_FOLDER).forEach((fileName, index)=>{
			let path = this.CONFIG.UNZIPPED_SUBMISSIONS_FOLDER + "/" + fileName;
			fs.unlinkSync(path);
		})
	}
}

module.exports = new ConfigFileTester()