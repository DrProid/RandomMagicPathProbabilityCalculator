/* this section takes care of adding and removing the chance path forms*/

function addChanceForm() {
    // Find the last form with class "chance-paths"
    const chancePathForms = document.querySelectorAll('.chance-paths');
    const formToDuplicate = chancePathForms[chancePathForms.length - 1];
    if (formToDuplicate) {
        // Clone the form
        const duplicatedForm = formToDuplicate.cloneNode(true);

        // Add a unique identifier (or manipulate form elements as needed)
        // For example, you can change the "id" attribute to make it unique.
        duplicatedForm.className = 'chance-paths duplicate';

        // Insert the duplicated form after the original form
        formToDuplicate.parentNode.insertBefore(duplicatedForm, formToDuplicate.nextSibling);

        //make sure the delete button is displayed
        document.getElementById('remove-chance').style.display = 'inline-block';
    } else {
        alert("Form with class 'chance-paths' not found.");
    }
}
document.getElementById('add-chance').addEventListener('click', addChanceForm);


function removeChanceForm() {
    //find all of the duplicated forms
    const duplicatedForms = document.querySelectorAll('.duplicate');

    // if there are any duplicates get the last form and remove it
    if (duplicatedForms.length > 0) {
        const lastDuplicatedForm = duplicatedForms[duplicatedForms.length - 1];
        lastDuplicatedForm.parentNode.removeChild(lastDuplicatedForm);

        //if this was the last duplicated form, make the delete button disappear
        if (duplicatedForms.length == 1) {
            document.getElementById('remove-chance').style.display = 'none';
        }

    } else {
        alert("No duplicated forms to remove.");
    }
}
document.getElementById('remove-chance').addEventListener('click', removeChanceForm);



/* Here is the code for all of the calculation of the chance table */

function calculateChanceTable() {
    clearTable();

    let calcData = gatherValues();

    //make a list of the number of options in each roll
    let rollOptions = []
    let numRolls = Object.keys(calcData.chance).length;
    for (let i = 0; i < numRolls; i++) {
        // rollOptions.push(Object.keys(calcData.chance['chance'+i]).filter(key => calcData.chance['chance'+i][key] === true));
        rollOptions.push(
            Object.entries(calcData.chance['chance' + i])
                .filter(([key, value]) => value === true)
                .map(([key]) => [key, key === 'none' ? calcData.chance['chance' + i].nonePercent : calcData.chance['chance' + i].percent, Number(calcData.chance['chance' + i].level)])
        );
    }

    let combos = generateCombinations(rollOptions);
    let newPaths = [];
    // console.log(combos);
    for (const paths of combos) {
        let newPath = { paths: { ...calcData.base }, pathChance: 1 };//object clone
        for (const path of paths) {
            if (path[0] != 'none') {
                newPath.paths[path[0]] += path[2];//for the path, increment by the level
            }
            newPath.pathChance *= path[1];//multiply the probability for every option to get the final probability
        }
        newPaths.push(newPath);
    }
    // console.log(newPaths);
    newPaths = removeDuplicates(newPaths);
    // console.log(newPaths);

    for(const roll of newPaths){
        // console.log(roll);
        addRowToTable(roll);
    }

}
document.getElementById('calc-chance').addEventListener('click', calculateChanceTable);

function removeDuplicates(combinationsArray) {
    //chatGPT wrote this I get it but also I don't know what I'm doing with Map()
    const uniquePaths = new Map();
    let totalPathChance = 0;

    combinationsArray.forEach(item => {
        const { paths, pathChance } = item;
        const pathStr = JSON.stringify(paths);

        if (uniquePaths.has(pathStr)) {
            uniquePaths.set(pathStr, uniquePaths.get(pathStr) + pathChance);
        } else {
            uniquePaths.set(pathStr, pathChance);
        }

        totalPathChance += pathChance;
    });

    const uniqueData = Array.from(uniquePaths, ([pathStr, pathChance]) => ({
        paths: JSON.parse(pathStr),
        pathChance: pathChance
    }));

    // Calculate the sum of values in the 'paths' object
    uniqueData.forEach(item => {
        const sum = Object.values(item.paths).reduce((acc, value) => acc + Number(value), 0);
        item.sumOfPaths = sum;
    });

    // Sort the array by the sum of values in 'paths' in ascending order
    uniqueData.sort((a, b) => a.sumOfPaths - b.sumOfPaths);

    // Remove the 'sumOfPaths' property (if you don't need it anymore)
    uniqueData.forEach(item => delete item.sumOfPaths);

    uniqueData.sort((a, b) => b.pathChance - a.pathChance);
    // console.log(uniqueData);
    // console.log('Total pathChance:', totalPathChance);
    console.assert(totalPathChance > 0.999999 && totalPathChance < 1.000001, "Something went wrong with calculation in RemoveDuplicates() function.");
    return uniqueData;
}

function generateCombinations(arrays) {
    //I got chatGPT to write this recursive function as well
    if (arrays.length === 0) {
        return [[]];
    }

    const firstArray = arrays[0];
    const remainingArrays = arrays.slice(1);
    const combinationsWithoutFirst = generateCombinations(remainingArrays);

    const result = [];

    for (const item of firstArray) {
        for (const combination of combinationsWithoutFirst) {
            result.push([item, ...combination]);
        }
    }

    return result;
}

function gatherValues() {
    let pathData = {};

    //fill the base path data
    pathData.base = {};
    const basePathForm = document.getElementById('base-paths');
    const basePathValues = basePathForm.querySelectorAll('input');
    //if the input is blank use 0
    basePathValues.forEach(input => pathData.base[input.name.substring(5)] = input.value == "" ? 0 : Number(input.value));
    // let numOutcomes = 1;

    //fill the chance data
    pathData.chance = {};
    const chanceForms = document.getElementsByClassName('chance-paths');

    //for every chance-paths form
    for (let i = 0; i < chanceForms.length; i++) {
        //make a nested object with an enumerated name
        pathData.chance['chance' + i] = {};

        const chanceValues = chanceForms[i].querySelectorAll('input');
        let optionsCount = 0;
        //for all the inputs in that form
        for (let val of chanceValues) {
            let name = val.name.substring(7);//get the name
            if (val.type == "checkbox") {
                //checkboxes set true/false
                pathData.chance['chance' + i][name] = val.checked;
                if (val.checked) {
                    optionsCount++;
                }
            } else {
                //values are treated as values otherwise they get the placeholder
                pathData.chance['chance' + i][name] = val.value == "" ? val.placeholder : val.value;
            }
        }
        //if the chance isn't 100% then 'none' is an option as well
        if (pathData.chance['chance' + i].percent < 100) {
            pathData.chance['chance' + i].none = true;
            pathData.chance['chance' + i].nonePercent = (100 - pathData.chance['chance' + i].percent) / 100;
            pathData.chance['chance' + i].percent /= optionsCount;
            optionsCount++;
        } else {
            pathData.chance['chance' + i].none = false;
            pathData.chance['chance' + i].nonePercent = 0;
            pathData.chance['chance' + i].percent /= optionsCount;
        }
        pathData.chance['chance' + i].percent /= 100;
        pathData.chance['chance' + i].options = optionsCount;//add a count of the potential path options
        // numOutcomes *= optionsCount;
    }
    // console.log(pathData);
    // pathData.base.numOutcomes = numOutcomes;
    return pathData;
}

function clearTable() {
    const outputTable = document.querySelector('#output-table');
    const rows = outputTable.rows;
    for (let i = rows.length - 1; i > 0; i--) {
        outputTable.deleteRow(i);
    }
}

function addRowToTable(pathsObj) {
    const outputTable = document.querySelector('#output-table');

    const newRow = outputTable.insertRow();
    const numCols = outputTable.querySelectorAll('th');
    console.log(pathsObj);
    // console.assert(pathsObj.paths.length==numCols.length, "Adding too many values to table in addRowToTable() function");
    for (let col of numCols) {
        const newCell = newRow.insertCell();
        if(col.textContent != 'Link'){
            newCell.textContent = pathsObj.paths[col.textContent.toLowerCase()] ?? pathsObj.pathChance * 100;
        }
        // newCell.innerHTML = Math.round(Math.random() * 10);
    }
}

document.getElementById('test').addEventListener('click', gatherValues);