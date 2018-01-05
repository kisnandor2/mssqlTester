const { execSync } = require('child_process');
const fs = require('fs');

let lazy = false;
if (process.argv[2]){
	lazy = true;
	console.log('LAZY');
}

const tester = new (require('./Tester'))(lazy);

let sqlPattern = /.*\.sql$/g;
let scsIdPattern = /[a-zA-Z]{4}\d{4}/g;

let errorsFileName = 'errors.txt';
let pointsFileName = 'points.txt';

try{
	execSync("bash -e ./unzip.sh") //Unzip all files
}
catch (err){
	// console.log(err);
	fs.readdirSync('./').forEach(fileName => {
		if (fileName.match(sqlPattern)){
			fs.unlinkSync(fileName);
		}
	});
	execSync("bash -e ./unzip.sh") //Unzip all files	
}

try{
	fs.unlinkSync(errorsFileName);
	fs.unlinkSync(pointsFileName);
}
catch(err){
	//Nothing to delete
}

fs.writeFileSync(errorsFileName, '');
fs.writeFileSync(pointsFileName, '');

fs.readdirSync('./').forEach(fileName => {
	if (fileName.match(sqlPattern)){
		let scsID = undefined;
		let test = tester.testOne(fileName);
		try{
			scsID = fileName.match(scsIdPattern)[0];
		}
		catch(err){
			//Incorrect fileName
			scsID = fileName; 
		}
		if (test.error){
			let errStr = scsID + "-----" + test.error + "\n";
			let poiStr = scsID + " --- " + test.points;
			poiStr += "\tHibas: " + test.error +  "\n";
			fs.appendFileSync(errorsFileName, errStr);
			fs.appendFileSync(pointsFileName, poiStr);
		}
		else{
			let str = scsID + " --- " + test.points;
			if (test.incorrectSelects.length > 0) 
				str += "\tHibas: " + test.incorrectSelects +  "\n";
			else
				str += "\n";
			fs.appendFileSync(pointsFileName, str);
		}
	}
});

//TODO: Modify unzip.sh !!