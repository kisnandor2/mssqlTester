const fs = require('fs');

class SqlFilter {
	constructor(){
		//Patterns
		this.createOrAlterPattern = /CREATE OR ALTER/;
		this.ifPattern = /IF.*/;
		this.insertIntoPattern = /INSERT .*INTO .*/;
		this.createTablePattern = /CREATE .*TABLE .*/;
		this.dropDatabasePattern = /DROP .*DATABASE .*/;
		// this.dropTablePattern = /DROP .*TABLE .*/;
		this.createDatabasePattern = /CREATE .*DATABASE .*/;
		this.useDatabasePattern = /USE .*/g
	}

	filter(inputFileName, outputFileName){
		this.inputFileName = inputFileName;
		this.outputFileName = outputFileName;

		let data = fs.readFileSync(this.inputFileName, 'UTF-8').toString().replace('\r', '').split('\n');
		let i = 0;
		while(i < data.length){
			let d = data[i].toUpperCase();

			//Replace create or alter
			if (d.match(this.createOrAlterPattern)){
				data[i] = data[i].toUpperCase().replace("CREATE OR ALTER", "CREATE");
			}

			//Remove create/use/drop/insert/if
			else if (d.match(this.createDatabasePattern) ||
					d.match(this.useDatabasePattern) ||
					d.match(this.dropDatabasePattern) ||
					d.match(this.insertIntoPattern) ||
					d.match(this.ifPattern))
				data.splice(i, 1);

			//Remove createTables
			else if (d.match(this.createTablePattern)){
				data.splice(i, 1);
				while (data[i].split('(').length === data[i].split(')').length)
					data.splice(i, 1);
				data.splice(i, 1);
			}
			else
				++i;
		}
		data = data.join('\n');
		fs.writeFileSync(this.outputFileName, data);
	}
}

module.exports = SqlFilter;