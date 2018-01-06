const test = false;

const fs = require('fs');

const SELECT_PATTERN = /select/i;
const SET_PATTERN = /(except|intersect|union)/i;
const VIEW_PATTERN = /create view/i;

const DECLARE_VARIABLE_PATTERN = /DECLARE\s@\S*/ig;
const VARIABLE_PATTERN = /@\S*/ig;
const TEMPORARY_SAVE_PATTERN = /INTO\s#\S*/ig;
const TEMPORARY_PATTERN = /#\S*/ig;
const OUTPUT_FILE_PATTERN = /^output[0-9]+.sql$/i;

class SqlFileSplitter{
	constructor(){
        this.variables = [];
        this.temporaries = [];
        this.queries = [];
	}

    static countParentheses(str){
        let beginning = str.match(/\(/g) || {length: 0};
        let ending = str.match(/\)/g) || {length: 0};
        return beginning.length - ending.length;
    }

    static preSelect(str){
        let selRes = str.match(SELECT_PATTERN);
        return str.slice(0, selRes['index']);
    }

    static mergeArrays(arr1, arr2){
        let ret = [];
        let len1 = arr1.length || 0;
        let len2 = arr2.length || 0;
        for (let i = 0; i < len1; ++i)
            ret.push(arr1[i]);
        for (let i = 0; i < len2; ++i)
            ret.push(arr2[i]);
        return ret.sort();
    }

    saveQuery(query){
        if (query === '')
            return;
        let variables = this.findInSavedVariables(query);
        let temporaries = this.findInSavedTemporaries(query);
        let merged = SqlFileSplitter.mergeArrays(variables, temporaries);
        this.queries.push({
            query,
            'count': merged
        });
    }

    static removeDuplicatesFromArray(arr, item){
        let i = 0;
        while (i < arr.length){
            if (arr[i].name === item)
                arr.splice(i, 1);
            else
                ++i;
        }
    }

    saveVariablesIfExist(str, count){
        let foundDeclaration = str.match(DECLARE_VARIABLE_PATTERN);
        if (foundDeclaration === null)
            return false;
        let foundVariables = str.match(VARIABLE_PATTERN);
        for (let i = 0; i < foundVariables.length; ++i){
            SqlFileSplitter.removeDuplicatesFromArray(this.variables, foundVariables[i]);
        }
        if (count === 0)
            ++count;
        for (let i = 0; i < foundVariables.length; ++i)
            this.variables.push({
                "name": foundVariables[i],
                "count": count
            });
        return true;
    }

    saveTemporariesIfExist(str, count){
        let foundTemporarySave = str.match(TEMPORARY_SAVE_PATTERN);
        if (foundTemporarySave === null)
            return false;
        let temps = str.match(TEMPORARY_PATTERN);
        if (count === 0)
            ++count;
        for (let i = 0; i < temps.length; ++i)
            SqlFileSplitter.removeDuplicatesFromArray(this.temporaries, temps[i]);
        for (let i = 0; i < temps.length; ++i)
            this.temporaries.push({
                "name": temps[i],
                "count": count
            });
        return true;
    }

    findInSavedTemporaries(str){
        let ret = [];
        let foundTemporary = str.match(TEMPORARY_PATTERN);
        if (foundTemporary === null)
            return false;
        let temps = foundTemporary;
        for (let i = this.temporaries.length-1; i >= 0; --i){
            for (let j = 0; j < temps.length; ++j)
                if (this.temporaries[i].name === temps[j])
                    ret.push(this.temporaries[i].count);
        }
        return Array.from(new Set(ret));
    }

    findInSavedVariables(str){
        let ret = [];
        let foundVariable = str.match(VARIABLE_PATTERN);
        if (foundVariable === null)
            return false;
        let variables = foundVariable;
        for (let i = this.variables.length-1; i >= 0; --i){
            for (let j = 0; j < variables.length; ++j)
                if (this.variables[i].name === variables[j])
                    ret.push(this.variables[i].count);
        }
        return Array.from(new Set(ret));
    }

    static removePreviousFiles(){
		fs.readdirSync("./").forEach(file =>{
			if (file.match(OUTPUT_FILE_PATTERN))
				fs.unlinkSync(file);
		})
	}

    split(fileName){
        SqlFileSplitter.removePreviousFiles();
        let line;
        let query = "";
        let count = 0;
        let parentheses = 0;
        let set_operation = 0;
        let view = 0;

        let data = fs.readFileSync(fileName).toString().split('\r\n');
        for (let i = 0; i < data.length; ++i) {
            line = data[i] + '\n';
            parentheses += SqlFileSplitter.countParentheses(line);
            if (DECLARE_VARIABLE_PATTERN.test(line)){
                this.saveQuery(query);
                ++count;
                query = line;
            }
            else if (VIEW_PATTERN.test(line)) {
                this.saveQuery(query);
                ++count;
                query = line;
                ++view;
                continue;
            }
            else if (SELECT_PATTERN.test(line))
                if (
                    parentheses === 0 &&
                    set_operation === 0 &&
                    SqlFileSplitter.countParentheses(SqlFileSplitter.preSelect(line)) === 0 &&
                    view === 0 &&
                    count > 0)
                {
                    this.saveQuery(query);
                    ++count;
                    query = line;
                }
                else{
                    if (count === 0)
                        ++count;
                    view = 0;
                    set_operation = Math.max(set_operation-1, 0);
                    query += line;
                }
            else{
                query += line;
                if (SET_PATTERN.test(line))
                    ++set_operation;
            }
            this.saveVariablesIfExist(line, count);
            this.saveTemporariesIfExist(line, count);
        }
        this.saveQuery(query);
        let mergedQueriesList = this.mergeQueries();
        this.saveMergedQueriesToFile(mergedQueriesList);
    }

    findAll(what, where, visited){
        visited[where] = true;
        let ret = [where];
        for (let j = 0; j < this.queries.length; ++j)
            if (this.queries[j].count.indexOf(what) > -1)
                for (let k = 0; k < this.queries[j].count.length; ++k)
                    if (!visited[j]){
                        ret.push(...this.findAll(this.queries[j].count[k], j, visited));
                    }
        if (this.queries[where].count.length > 1)
            visited[where] = false;
        return Array.from(new Set(ret));
    }

    mergeQueries(){
        let visited = new Array(this.queries.length).fill(false);
        let ret = [];
        for (let i = 0; i < this.queries.length; ++i){
            if (this.queries[i].count.length === 0)
                ret.push([i]);
            else if (this.queries[i].count.length === 1 && !visited[i]) {
                ret.push(this.findAll(this.queries[i].count[0], i, visited));
            }

        }
        for (let i = 0; i < ret.length; ++i)
            ret[i].sort((a,b)=>a>b);
        return ret;
    }

    saveMergedQueriesToFile(queryList){
        for (let i = 0; i < queryList.length; ++i) {
            let outputFileName = `output${i}.sql`;
            for (let j = 0; j < queryList[i].length; ++j) {
                fs.appendFileSync(outputFileName, this.queries[queryList[i][j]].query);
            }
        }
    }
}

module.exports = SqlFileSplitter;

if (test){
	let splitter = new SqlFileSplitter();
	splitter.split("test.sql");
}